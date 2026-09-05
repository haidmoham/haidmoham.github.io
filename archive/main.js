(function () {
  if (!('IntersectionObserver' in window)) return;
  if (!document.documentElement.classList.contains('reveal-on')) return;

  var sel = '.section-header, .professional-record-card, .project-card, .project-card-full, .resume-block, .timeline-item, .see-all';
  var els = Array.prototype.slice.call(document.querySelectorAll(sel));

  els.forEach(function (el) {
    var p = el.parentElement;
    var n = p.__rv || 0;
    el.style.transitionDelay = (n * 60) + 'ms';
    p.__rv = n + 1;
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

  els.forEach(function (el) { io.observe(el); });
})();
