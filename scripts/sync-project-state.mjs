import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escape = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const dayMs = 86_400_000;

export function projectRecord(source, repository, commits, days) {
  assert.equal(repository.private, false, `${source.id}: source must be public`);
  assert.equal(repository.full_name.toLowerCase(), source.repository.toLowerCase(), 'repository moved; review allowlist');
  const buckets = new Map(days.map(day => [day, 0]));
  const seen = new Set();
  for (const commit of commits) {
    assert.match(commit.sha, /^[a-f0-9]{40}$/);
    const date = commit.commit.committer.date;
    assert.ok(Number.isFinite(Date.parse(date)), 'invalid commit timestamp');
    const day = new Date(date).toISOString().slice(0, 10);
    if (buckets.has(day) && !seen.has(commit.sha)) buckets.set(day, buckets.get(day) + 1);
    seen.add(commit.sha);
  }
  return {
    id: source.id, label: source.label,
    source: `https://github.com/${source.repository}`, branch: repository.default_branch,
    latestCommit: commits[0] ? { sha: commits[0].sha, date: commits[0].commit.committer.date, url: `https://github.com/${source.repository}/commit/${commits[0].sha}` } : null,
    activity: [...buckets].map(([date, commits]) => ({ date, commits })),
    visual: `/project-state/${source.id}.svg`,
  };
}

export function activitySvg(record) {
  const total = record.activity.reduce((sum, day) => sum + day.commits, 0);
  const maximum = Math.max(1, ...record.activity.map(day => day.commits));
  const bars = record.activity.map((day, index) => {
    const height = 64 * day.commits / maximum;
    return `<rect x="${20 + index * 10}" y="${100 - height}" width="7" height="${height}" rx="2"><title>${day.date}: ${day.commits} commits</title></rect>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 140" role="img" aria-labelledby="title description"><title id="title">${escape(record.label)}: commit activity</title><desc id="description">${total} commits on the default branch, ${record.activity[0].date} through ${record.activity.at(-1).date} UTC. Daily bars share a scale with a maximum of ${maximum} commits. Commit volume is not a measure of quality or completion.</desc><rect width="320" height="140" rx="14" fill="#211c2b"/><g fill="#d5b6ef">${bars}</g><g font-family="system-ui,sans-serif" fill="#eee5f4"><text x="20" y="23" font-size="12">${escape(record.label)}</text><text x="20" y="122" font-size="10">${total} commits · 28 days · default branch</text></g></svg>\n`;
}

async function github(endpoint) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}) },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub ${response.status} for ${endpoint.split('?')[0]}; existing output is unchanged`);
  return { data: await response.json(), next: /rel="next"/.test(response.headers.get('link') || '') };
}

async function main() {
  const config = JSON.parse((await fs.readFile(path.join(root, 'project-sources.json'), 'utf8')).replace(/^\uFEFF/, ''));
  assert.equal(config.windowDays, 28);
  const ids = new Set();
  for (const source of config.projects) {
    assert.match(source.id, /^[a-z][a-z0-9-]*$/);
    assert.match(source.repository, /^haidmoham\/[a-zA-Z0-9_.-]+$/);
    assert.ok(!ids.has(source.id), 'duplicate project id'); ids.add(source.id);
  }
  // Use complete UTC days. The same source snapshot and day produce identical files.
  const end = new Date(new Date().toISOString().slice(0, 10));
  const days = Array.from({ length: config.windowDays }, (_, i) => new Date(+end - (config.windowDays - i) * dayMs).toISOString().slice(0, 10));
  const records = [];
  for (const source of config.projects) {
    const { data: repo } = await github(`/repos/${source.repository}`);
    assert.equal(repo.private, false, `${source.id}: private repository cannot be published`);
    let commits = [];
    for (let page = 1; page <= 20; page++) {
      const result = await github(`/repos/${source.repository}/commits?sha=${encodeURIComponent(repo.default_branch)}&since=${days[0]}T00:00:00Z&until=${new Date(+end - 1).toISOString()}&per_page=100&page=${page}`);
      commits.push(...result.data);
      if (!result.next) break;
      assert.ok(page < 20, `${source.id}: pagination limit reached; keep previous output`);
    }
    const record = projectRecord(source, repo, commits, days);
    // Latest commit may be older than the activity window. Read it separately.
    const { data: latest } = await github(`/repos/${source.repository}/commits?sha=${encodeURIComponent(repo.default_branch)}&per_page=1`);
    record.latestCommit = projectRecord(source, repo, latest, days).latestCommit;
    record.evidence = [];
    for (const evidence of source.evidence || []) {
      assert.match(evidence.reviewedRevision, /^[a-f0-9]{40}$/);
      assert.ok(!evidence.path.startsWith('/') && !evidence.path.split('/').includes('..'));
      assert.ok(evidence.visual.startsWith('/robotics/'));
      const endpoint = `/repos/${source.repository}/contents/${evidence.path.split('/').map(encodeURIComponent).join('/')}`;
      const { data: reviewed } = await github(`${endpoint}?ref=${evidence.reviewedRevision}`);
      const { data: current } = await github(`${endpoint}?ref=${encodeURIComponent(repo.default_branch)}`);
      assert.equal(reviewed.type, 'file'); assert.equal(current.type, 'file');
      assert.match(reviewed.sha, /^[a-f0-9]{40}$/); assert.match(current.sha, /^[a-f0-9]{40}$/);
      record.evidence.push({
        id: evidence.id, visual: evidence.visual,
        reviewedSource: `https://github.com/${source.repository}/blob/${evidence.reviewedRevision}/${evidence.path}`,
        reviewedBlob: reviewed.sha, currentBlob: current.sha,
        sourceChanged: reviewed.sha !== current.sha,
        status: reviewed.sha !== current.sha ? 'source changed; published visual retains the reviewed version' : 'published visual matches the reviewed source version',
      });
    }
    records.push(record);
  }
  const common = { schemaVersion: 1, through: days.at(-1), windowDays: 28, meaning: 'Default-branch commit activity. Counts do not establish quality, project completion, or experimental results.' };
  const files = new Map([
    ['index.json', JSON.stringify({ ...common, projects: records }, null, 2) + '\n'],
    ['anonymous.json', JSON.stringify({ ...common, projects: records.map(({ id, label, activity, visual, evidence }) => ({ id, label, activity, visual, evidence: evidence.map(({ id, visual, sourceChanged, status }) => ({ id, visual, sourceChanged, status })) })) }, null, 2) + '\n'],
    ...records.map(record => [`${record.id}.svg`, activitySvg(record)]),
  ]);
  if (!process.argv.includes('--check')) {
    const output = path.join(root, 'project-state');
    await fs.mkdir(output, { recursive: true });
    // No writes occur until every source succeeds and all records validate.
    for (const [name, contents] of files) await fs.writeFile(path.join(output, name), contents);
  }
  console.log(`${process.argv.includes('--check') ? 'Checked' : 'Generated'} ${records.length} public projects through ${common.through}; ${files.size} files. No notebooks or project code executed.`);
}

if (process.argv.includes('--self-test')) {
  const source = { id: 'example', label: '<example>', repository: 'haidmoham/example' };
  const repository = { private: false, full_name: source.repository, default_branch: 'main' };
  const commit = { sha: 'a'.repeat(40), commit: { committer: { date: '2026-09-01T01:00:00Z' } } };
  const record = projectRecord(source, repository, [commit, commit], ['2026-09-01', '2026-09-02']);
  assert.deepEqual(record.activity.map(day => day.commits), [1, 0]);
  assert.equal(activitySvg(record), activitySvg(record));
  assert.ok(activitySvg(record).includes('&lt;example&gt;'));
  assert.throws(() => projectRecord(source, { ...repository, private: true }, [commit], ['2026-09-01']));
  console.log('Projection checks passed: deduplication, dates, deterministic SVG, escaping, private-source rejection.');
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
