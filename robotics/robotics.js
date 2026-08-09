(function () {
  var root = document.querySelector('[data-trajectory-explorer]');
  if (!root) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var condition = 'passive', frame = 0, playing = false, timer;
  var copy = {
    passive: ['Passive elbow / gravity on', 'Physical coupling evidence: joint 2 moves while its command remains zero.', 'joint 2 · zero command', 'The passive elbow moved with zero elbow command.', 'In the passive, elbow-down run with normal gravity, joint 2 visibly moved while only joint 1 was commanded. Scrub the passive condition: ctrl[1] stays at 0.0 even as joint 2’s position, velocity, and acceleration change.'],
    hold: ['Held elbow / gravity on', 'Holding joint 2 changes the motion and makes it more organized.', 'joint 2 · held', 'Holding joint 2 changed the motion.', 'The held condition is a discriminating comparison: adding elbow control makes the trajectory more organized, while the passive run remains the evidence for physical coupling.'],
    gravity: ['Gravity off / staged coordination', 'Removing gravitational load makes the staged coordination cleaner.', 'joint 2 · staged control', 'Gravity changes the resulting behavior.', 'This gravity-off condition uses the staged coordination controller. It is a comparison for gravitational load, not evidence for passive physical coupling.']
  };
  function point(q1, q2) { var base = [150,230], l1 = 110, l2 = 90, elbow = [base[0] + l1 * Math.sin(q1), base[1] - l1 * Math.cos(q1)], tip = [elbow[0] + l2 * Math.sin(q1 + q2), elbow[1] - l2 * Math.cos(q1 + q2)]; return {base:base, elbow:elbow, tip:tip}; }
  function f(values) { return '[' + values.map(function (v) { return Number(v).toFixed(2); }).join(', ') + ']'; }
  function update() { var item = data.conditions[condition], sample = item.frames[frame], p = point(sample.qpos[0], sample.qpos[1]);
    root.querySelector('[data-link-one]').setAttribute('x1',p.base[0]); root.querySelector('[data-link-one]').setAttribute('y1',p.base[1]); root.querySelector('[data-link-one]').setAttribute('x2',p.elbow[0]); root.querySelector('[data-link-one]').setAttribute('y2',p.elbow[1]);
    root.querySelector('[data-link-two]').setAttribute('x1',p.elbow[0]); root.querySelector('[data-link-two]').setAttribute('y1',p.elbow[1]); root.querySelector('[data-link-two]').setAttribute('x2',p.tip[0]); root.querySelector('[data-link-two]').setAttribute('y2',p.tip[1]);
    ['elbow','tip'].forEach(function (name) { root.querySelector('[data-'+name+']').setAttribute('cx',p[name][0]); root.querySelector('[data-'+name+']').setAttribute('cy',p[name][1]); });
    root.querySelector('[data-time]').textContent = sample.t.toFixed(2) + ' s'; root.querySelector('[data-scrubber]').value = frame;
    root.querySelector('[data-qpos]').textContent = f(sample.qpos); root.querySelector('[data-qvel]').textContent = f(sample.qvel); root.querySelector('[data-ctrl]').textContent = f(sample.ctrl); root.querySelector('[data-qacc]').textContent = f(sample.qacc);
  }
  function setCondition(next) { condition = next; frame = 0; stop(); var c = copy[condition], item = data.conditions[condition], points = item.frames.map(function(s){var p=point(s.qpos[0],s.qpos[1]); return p.tip[0].toFixed(1)+','+p.tip[1].toFixed(1);}); root.querySelector('[data-trace]').setAttribute('d','M'+points.join(' L'));
    root.querySelector('[data-condition-title]').textContent=c[0]; root.querySelector('[data-condition-summary]').textContent=c[1]; root.querySelector('[data-elbow-label]').textContent=c[2]; document.querySelector('[data-evidence-heading]').textContent=c[3]; document.querySelector('[data-evidence-copy]').textContent=c[4]; root.querySelectorAll('[data-condition]').forEach(function(button){var active=button.dataset.condition===condition;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',active);}); update(); }
  function stop(){ playing=false; clearInterval(timer); root.querySelector('[data-play]').textContent='Play'; root.querySelector('[data-play]').setAttribute('aria-pressed','false'); }
  function play(){ if(playing){stop();return;} playing=true; root.querySelector('[data-play]').textContent='Pause'; root.querySelector('[data-play]').setAttribute('aria-pressed','true'); timer=setInterval(function(){frame=(frame+1)%data.conditions[condition].frames.length;update();},1000/30); }
  root.querySelectorAll('[data-condition]').forEach(function(button){button.addEventListener('click',function(){setCondition(button.dataset.condition);});}); root.querySelector('[data-scrubber]').addEventListener('input',function(){frame=Number(this.value);update();}); root.querySelector('[data-play]').addEventListener('click',play);
  var data; fetch('../assets/robotics/two-link-trajectories.json').then(function(response){return response.json();}).then(function(payload){data=payload; root.querySelector('[data-scrubber]').max=data.conditions.passive.frames.length-1; setCondition('passive'); if(!reduced) play();}).catch(function(){root.querySelector('.explorer-stage').innerHTML='<p class="explorer-error">The recorded trajectory data could not load. See the canonical experiment source below.</p>';});
}());

(function () {
  var root = document.querySelector('[data-model-control-animation]');
  if (!root) return;
  var source = document.getElementById('model-control-keyframes');
  if (!source) return;
  var data = JSON.parse(source.textContent), names = ['pd', 'gravity-comp', 'computed-torque', 'computed-torque-wrong-mass'];
  var position = 4, playing = false, raf, previous;
  var slider = root.querySelector('[data-model-scrubber]'), output = root.querySelector('[data-model-time]'), playButton = root.querySelector('[data-model-play]');
  slider.max = data.times.length - 1;
  function point(q1, q2) { var base = [120, 105], l1 = 66, l2 = 52, elbow = [base[0] + l1 * Math.sin(q1), base[1] + l1 * Math.cos(q1)], tip = [elbow[0] + l2 * Math.sin(q1 + q2), elbow[1] + l2 * Math.cos(q1 + q2)]; return {base: base, elbow: elbow, tip: tip}; }
  function path(p) { return 'M' + p.base[0].toFixed(1) + ' ' + p.base[1].toFixed(1) + ' L' + p.elbow[0].toFixed(1) + ' ' + p.elbow[1].toFixed(1) + ' L' + p.tip[0].toFixed(1) + ' ' + p.tip[1].toFixed(1); }
  function sample(name, cursor) { var values = data[name], low = Math.floor(cursor), high = Math.min(low + 1, values.length - 1), mix = cursor - low, a = values[low], b = values[high]; return {time: data.times[low] + (data.times[high] - data.times[low]) * mix, q1: a[0] + (b[0] - a[0]) * mix, q2: a[1] + (b[1] - a[1]) * mix, fb: a[2] + (b[2] - a[2]) * mix, ff: a[3] + (b[3] - a[3]) * mix}; }
  function setPoint(group, state, target) { var arm = group.querySelector('[data-model-arm]'), elbow = group.querySelector('[data-model-elbow]'), targetPath = group.querySelector('[data-model-target]'), targetPoint = point(.35 + .35 * Math.sin(.8 * target), -.70 + .45 * Math.sin(.8 * target)), p = point(state.q1, state.q2), clamp = function (v) { return Math.min(172, Math.max(0, 172 * Math.abs(v) / 18)); };
    arm.setAttribute('d', path(p)); elbow.setAttribute('cx', p.elbow[0].toFixed(1)); elbow.setAttribute('cy', p.elbow[1].toFixed(1)); targetPath.setAttribute('d', path(targetPoint));
    group.querySelector('[data-model-state]').textContent = 'q₁ ' + state.q1.toFixed(3) + ' · q₂ ' + state.q2.toFixed(3); group.querySelector('[data-model-fbbar]').setAttribute('width', clamp(state.fb).toFixed(1)); group.querySelector('[data-model-ffbar]').setAttribute('width', clamp(state.ff).toFixed(1)); group.querySelector('[data-model-fblabel]').textContent = 'τfb₁ ' + state.fb.toFixed(2) + ' N·m'; group.querySelector('[data-model-fflabel]').textContent = 'τff₁ ' + state.ff.toFixed(2) + ' N·m'; }
  function render() { var target = sample('pd', position).time; names.forEach(function (name) { setPoint(root.querySelector('[data-model-controller="' + name + '"]'), sample(name, position), target); }); slider.value = Math.round(position); output.textContent = target.toFixed(2) + ' s'; }
  function stop() { playing = false; previous = null; if (raf) cancelAnimationFrame(raf); playButton.textContent = 'Play'; playButton.setAttribute('aria-pressed', 'false'); }
  function tick(now) { if (!playing) return; if (!previous) previous = now; position += (now - previous) / 1000 * 1.35; previous = now; if (position >= data.times.length - 1) { position = data.times.length - 1; render(); stop(); return; } render(); raf = requestAnimationFrame(tick); }
  playButton.addEventListener('click', function () { if (playing) { stop(); return; } if (position >= data.times.length - 1) position = 0; playing = true; playButton.textContent = 'Pause'; playButton.setAttribute('aria-pressed', 'true'); raf = requestAnimationFrame(tick); });
  slider.addEventListener('input', function () { stop(); position = Number(this.value); render(); });
  render();
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) playButton.click();
}());
