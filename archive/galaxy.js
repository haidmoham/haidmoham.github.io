/* Decorative C-1N machine study for the homepage hero.
   The drawing is conceptual, not simulator output: its support geometry,
   body frame, COM projection, and linkage layout come from the portfolio's
   six-legged robotics work without presenting invented measurements. */
(function () {
  'use strict';

  var canvas = document.getElementById('machine-glyph-canvas');
  if (!canvas) return;

  var context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dprCap = 2;
  var width = 0;
  var height = 0;
  var dpr = 1;
  var raf = 0;
  var start = performance.now();

  function cssColor(name, fallback) {
    var value = getComputedStyle(canvas).getPropertyValue(name).trim();
    return value || fallback;
  }

  function rgba(hex, alpha) {
    var value = hex.trim();
    var match = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) return value;
    var digits = match[1];
    if (digits.length === 3) digits = digits.split('').map(function (part) { return part + part; }).join('');
    return 'rgba(' + parseInt(digits.slice(0, 2), 16) + ',' + parseInt(digits.slice(2, 4), 16) + ',' + parseInt(digits.slice(4, 6), 16) + ',' + alpha + ')';
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var nextDpr = Math.min(window.devicePixelRatio || 1, dprCap);
    var nextWidth = Math.max(1, Math.round(rect.width * nextDpr));
    var nextHeight = Math.max(1, Math.round(rect.height * nextDpr));
    if (canvas.width === nextWidth && canvas.height === nextHeight) return false;
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    width = rect.width;
    height = rect.height;
    dpr = nextDpr;
    return true;
  }

  function line(x1, y1, x2, y2) {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }

  function dot(x, y, radius, fill, stroke) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) { context.fillStyle = fill; context.fill(); }
    if (stroke) { context.strokeStyle = stroke; context.stroke(); }
  }

  function arrow(x1, y1, x2, y2, size) {
    var angle = Math.atan2(y2 - y1, x2 - x1);
    line(x1, y1, x2, y2);
    context.beginPath();
    context.moveTo(x2, y2);
    context.lineTo(x2 - Math.cos(angle - 0.52) * size, y2 - Math.sin(angle - 0.52) * size);
    context.moveTo(x2, y2);
    context.lineTo(x2 - Math.cos(angle + 0.52) * size, y2 - Math.sin(angle + 0.52) * size);
    context.stroke();
  }

  function roundedBody(x, y, w, h, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + w - radius, y);
    context.quadraticCurveTo(x + w, y, x + w, y + radius);
    context.lineTo(x + w, y + h - radius);
    context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    context.lineTo(x + radius, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function draw(time) {
    resize();
    if (!width || !height) return;

    var ink = cssColor('--ink', '#172a3d');
    var accent = cssColor('--accent', '#28649f');
    var muted = cssColor('--text-muted', '#5b6d7f');
    var surface = cssColor('--surface-raised', '#ffffff');
    var phase = reduceMotion ? 0.3 : time * 0.00008;
    var breathe = Math.sin(phase * Math.PI * 2);
    var stride = Math.sin(phase * Math.PI * 2) * 2.2;
    var scale = Math.min(width / 520, height / 430);
    var cx = width * 0.5 + stride * scale;
    var cy = height * 0.5;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(cx, cy);
    context.scale(scale, scale);
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Quiet construction grid: enough to establish a measured drawing, not data.
    context.strokeStyle = rgba(ink, 0.07);
    context.lineWidth = 1;
    for (var gx = -210; gx <= 210; gx += 35) line(gx, -175, gx, 175);
    for (var gy = -175; gy <= 175; gy += 35) line(-210, gy, 210, gy);
    context.strokeStyle = rgba(ink, 0.16);
    context.setLineDash([3, 7]);
    line(-224, 0, 224, 0);
    line(0, -183, 0, 183);
    context.setLineDash([]);

    var mounts = [
      { x: -82, y: -48, kneeX: -134, kneeY: -83, footX: -184, footY: -126, tripod: 0 },
      { x: 0, y: -51, kneeX: -4, kneeY: -102, footX: 18, footY: -159, tripod: 1 },
      { x: 82, y: -48, kneeX: 134, kneeY: -83, footX: 184, footY: -126, tripod: 0 },
      { x: -82, y: 48, kneeX: -134, kneeY: 83, footX: -184, footY: 126, tripod: 1 },
      { x: 0, y: 51, kneeX: 4, kneeY: 102, footX: -18, footY: 159, tripod: 0 },
      { x: 82, y: 48, kneeX: 134, kneeY: 83, footX: 184, footY: 126, tripod: 1 }
    ];

    // Two interleaved triangles show the alternating support sets.
    var support = mounts.filter(function (leg) { return leg.tripod === 0; });
    var alternate = mounts.filter(function (leg) { return leg.tripod === 1; });
    context.beginPath();
    context.moveTo(alternate[0].footX, alternate[0].footY);
    context.lineTo(alternate[1].footX, alternate[1].footY);
    context.lineTo(alternate[2].footX, alternate[2].footY);
    context.closePath();
    context.strokeStyle = rgba(ink, 0.16);
    context.lineWidth = 1;
    context.setLineDash([2, 8]);
    context.stroke();

    context.beginPath();
    context.moveTo(support[0].footX, support[0].footY);
    context.lineTo(support[1].footX, support[1].footY);
    context.lineTo(support[2].footX, support[2].footY);
    context.closePath();
    context.fillStyle = rgba(accent, 0.045 + (breathe + 1) * 0.012);
    context.fill();
    context.strokeStyle = rgba(accent, 0.3);
    context.lineWidth = 1;
    context.setLineDash([5, 7]);
    context.stroke();
    context.setLineDash([]);

    // Six two-link legs, with filled/outlined feet distinguishing the tripods.
    mounts.forEach(function (leg) {
      var active = leg.tripod === 0;
      context.strokeStyle = active ? rgba(accent, 0.88) : rgba(ink, 0.58);
      context.lineWidth = active ? 3 : 2.2;
      line(leg.x, leg.y, leg.kneeX, leg.kneeY);
      line(leg.kneeX, leg.kneeY, leg.footX, leg.footY);
      dot(leg.x, leg.y, 4, surface, context.strokeStyle);
      dot(leg.kneeX, leg.kneeY, 4.5, surface, context.strokeStyle);
      dot(leg.footX, leg.footY, active ? 6 : 5, active ? accent : surface, context.strokeStyle);

      if (active) {
        context.strokeStyle = rgba(accent, 0.42);
        context.lineWidth = 1.25;
        var inwardX = leg.footX + (leg.x - leg.footX) * 0.19;
        var inwardY = leg.footY + (leg.y - leg.footY) * 0.19;
        arrow(leg.footX, leg.footY, inwardX, inwardY, 5);
      }
    });

    // Top-down chassis and its longitudinal centerline.
    roundedBody(-94, -54, 188, 108, 23);
    context.fillStyle = rgba(surface, 0.96);
    context.fill();
    context.strokeStyle = ink;
    context.lineWidth = 2.4;
    context.stroke();
    roundedBody(-73, -37, 146, 74, 15);
    context.strokeStyle = rgba(ink, 0.28);
    context.lineWidth = 1;
    context.stroke();
    context.setLineDash([4, 6]);
    line(-72, 0, 72, 0);
    context.setLineDash([]);

    context.fillStyle = ink;
    context.font = '600 11px "JetBrains Mono", monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('C-1N', 0, -18);
    context.fillStyle = muted;
    context.font = '500 8px "JetBrains Mono", monospace';
    context.letterSpacing = '0.12em';
    context.fillText('BODY FRAME', 0, 18);

    // COM projection stays visibly inside the current support triangle.
    context.strokeStyle = accent;
    context.lineWidth = 1.5;
    dot(0, 0, 9, surface, accent);
    line(-13, 0, 13, 0);
    line(0, -13, 0, 13);
    context.fillStyle = accent;
    context.font = '600 8px "JetBrains Mono", monospace';
    context.textAlign = 'left';
    context.fillText('COM', 15, -10);

    // Body-frame axes and a sparse forward trajectory cue.
    context.strokeStyle = ink;
    context.lineWidth = 1.35;
    arrow(-178, 164, -132, 164, 6);
    arrow(-178, 164, -178, 120, 6);
    context.fillStyle = ink;
    context.font = '600 9px "JetBrains Mono", monospace';
    context.textAlign = 'left';
    context.fillText('x', -126, 164);
    context.fillText('y', -181, 112);

    context.strokeStyle = rgba(accent, 0.52);
    context.lineWidth = 1.35;
    context.setLineDash([7, 8]);
    context.lineDashOffset = reduceMotion ? 0 : -phase * 18;
    context.beginPath();
    context.moveTo(110, 18);
    context.bezierCurveTo(145, 12, 169, -4, 203, -24);
    context.stroke();
    context.setLineDash([]);
    arrow(191, -17, 204, -25, 6);

    context.restore();
  }

  function frame(time) {
    draw(time - start);
    raf = requestAnimationFrame(frame);
  }

  function startAnimation() {
    if (raf || document.hidden) return;
    if (reduceMotion) { draw(0); return; }
    raf = requestAnimationFrame(frame);
  }

  function stopAnimation() {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { if (reduceMotion) draw(0); }).observe(canvas);
  } else {
    window.addEventListener('resize', function () { if (reduceMotion) draw(0); });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopAnimation();
    else startAnimation();
  });

  startAnimation();
})();
