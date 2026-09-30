// Load the real simulator immediately, while retaining the recorded fallback.
const explorer = document.querySelector('.c1n-history');
let started = false;
function pauseSimulation() {
  const play = document.querySelector('[data-play]');
  if (play?.getAttribute('aria-pressed') === 'true') play.click();
}
function loadSimulation() {
  if (started || !explorer.open) return;
  started = true;
  import('/spider/spider.js?v=live-first-2').catch(() => {
    document.querySelector('[data-status]').textContent = 'Simulation could not load. The recorded walk and source evidence remain available below.';
  });
}
explorer.addEventListener('toggle', () => {
  if (explorer.open) loadSimulation();
  else pauseSimulation();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseSimulation();
    document.querySelectorAll('video').forEach(video => video.pause());
  }
});
loadSimulation();
