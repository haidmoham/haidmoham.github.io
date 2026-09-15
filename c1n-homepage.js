const checkpointUrl = '/assets/c1n/checkpoint.json';

function text(selector, value) {
  const selectors = selector.split(',');
  const element = selectors.map(candidate => document.querySelector(candidate)).find(Boolean);
  if (element && typeof value === 'string' && value.trim() && element.textContent !== value) {
    element.textContent = value;
  }
}

function localMediaPath(value, extensions) {
  if (typeof value !== 'string') return '';
  try {
    const name = new URL(value, location.origin).pathname.split('/').pop();
    if (!name || !/^[A-Za-z0-9._-]+$/.test(name) || !extensions.some(extension => name.endsWith(extension))) return '';
    return `/assets/c1n/${name}`;
  } catch {
    return '';
  }
}

function applyCheckpoint(feed) {
  if (feed?.schema_version !== 1 || !feed.checkpoint || !feed.copy || !feed.media) return;

  text('[data-c1n-title], #robotics .plate-copy h2 a', feed.copy.title);
  text('[data-c1n-checkpoint], #robotics .robot-specimen figcaption span:last-child', feed.checkpoint.policy);
  text('[data-c1n-description], #robotics .plate-description', feed.copy.description);
  text('[data-c1n-summary], #robotics .plate-copy > p:not([class])', feed.copy.summary);

  const limits = document.querySelector('[data-c1n-limits]') || document.querySelector('#robotics .plate-boundary');
  if (limits && Array.isArray(feed.limits) && feed.limits.length) {
    const value = feed.limits.join(' · ');
    if (limits.matches('[data-c1n-limits]')) {
      if (limits.textContent !== value) limits.textContent = value;
    } else {
      const label = limits.querySelector('span');
      const current = label ? limits.textContent.slice(label.textContent.length) : limits.textContent;
      if (current !== value) {
        limits.replaceChildren();
        if (label) limits.append(label);
        limits.append(value);
      }
    }
  }

  const video = document.querySelector('[data-c1n-video]') || document.querySelector('#robotics video');
  const source = document.querySelector('[data-c1n-source]') || video?.querySelector('source');
  const mediaBase = localMediaPath(feed.media.url, ['.mp4', '.webm']);
  const mediaUrl = mediaBase ? `${mediaBase}?v=${feed.media.sha256.slice(0,12)}` : '';
  const posterBase = localMediaPath(feed.media.poster_url, ['.jpg', '.jpeg', '.png', '.webp']);
  const posterUrl = posterBase ? `${posterBase}?v=${feed.media.poster_sha256.slice(0,12)}` : '';
  let reloadVideo = false;
  if (video && posterUrl && video.getAttribute('poster') !== posterUrl) video.poster = posterUrl;
  if (source && mediaUrl && source.getAttribute('src') !== mediaUrl) {
    source.src = mediaUrl;
    reloadVideo = true;
  }
  if (video && reloadVideo) video.load();
}

window.addEventListener('load', () => {
  fetch(checkpointUrl, { cache: 'no-store' })
    .then(response => response.ok ? response.json() : Promise.reject())
    .then(feed => {
      applyCheckpoint(feed);
      let scheduled = false;
      new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          applyCheckpoint(feed);
        });
      }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
      if (!window.__NEXT_HYDRATED) {
        window.__NEXT_HYDRATED_CB = () => applyCheckpoint(feed);
      }
    })
    .catch(() => {});
}, { once: true });
