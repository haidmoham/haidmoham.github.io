# Pocket mirrors

`/pocket/` lists 23 personal project destinations under matching `mhaider.dev` subdomains.
The footer links to that page. Eighteen domains use `mhaider-pocket-mirrors` on
Cloudflare; `sketch`, `sunnie`, `little-hungers`, and `voidpulse` keep their Vercel deployments. `astralflowers` keeps its existing Worker.

The gateway fetches the corresponding live project on each request. HTML,
JavaScript, CSS, JSON, redirects, and CSP hostnames are rewritten to the matching
portfolio domains. Cluster-root links point to `https://mhaider.dev/pocket/`.
Binary assets pass through. Portfolio cookies and authorization headers are not
forwarded. These are public project mirrors, not shared authenticated sessions.

Deploy with `wrangler deploy --config scripts/pocket/wrangler.json` using the
authorized Cloudflare account. Run `node --test scripts/pocket/worker.test.mjs`
before deploying. Verify roots and representative assets on each destination.
Keep the project allowlist, custom-domain routes, and pocket links aligned.

The source sites and root portfolios remain independent. The existing
`portfolioredo.mhaider.dev` identified variant is intentionally preserved.
There is no scheduled Railway job. Existing mirror content follows its source
without a copying job; add new project domains during their publication.

The home page is a static export with a hydrated runtime. Its pocket footer and
Tiramisu link are present in both HTML and the versioned page chunk. The v2 entry,
page, layout context, and prefetch policy form one consistent module graph.
Never rename only the entry: its dependencies can import the former entry and
initialize a second navigation runtime. Run
`node --test scripts/pocket/runtime-graph.test.mjs` to catch that regression.
Old chunks remain available to open tabs. Verify both reload and navigation back
from the pocket in a browser; HTTP and asset checks do not test hydration.

The Vercel alias universe.shin86.dev has no public DNS record. It is not a live source and is excluded. The active soundspace destination serves that project.
