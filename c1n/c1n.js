// The checkpoint WebAssembly simulation loads only when the reader opens it.
const history = document.querySelector('.c1n-history');
let started = false;
history.addEventListener('toggle', () => {
  if (history.open && !started) {
    started = true;
    import('/spider/spider.js?v=13').catch(() => {
      document.querySelector('[data-status]').textContent = 'Simulation could not load. The recorded walk and source evidence remain available.';
    });
  }
  if (!history.open) {
    const play = document.querySelector('[data-play]');
    if (play?.getAttribute('aria-pressed') === 'true') play.click();
    history.querySelectorAll('video').forEach(video => video.pause());
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) document.querySelectorAll('video').forEach(video => video.pause());
});
