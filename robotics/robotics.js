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
