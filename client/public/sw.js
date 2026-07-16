/* Velea service worker — enables desktop/mobile install and light offline.
   Deliberately conservative: never touches API/tRPC traffic, always prefers
   fresh HTML, and only cache-firsts Vite's content-hashed static assets. */
const CACHE = "velea-cache-v499";
const ASSET_RE = /\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?|ttf|ico|webmanifest)$/;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never intercept mutations
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // skip fonts CDN, geocoder, etc.
  if (url.pathname.startsWith("/trpc") || url.pathname.startsWith("/api")) return; // never cache data

  // Marketing assets are NOT content-hashed and change under the same URL — never
  // SW-cache them (cache-first would pin the first version forever; see moons.jpg).
  if (url.pathname.startsWith("/marketing/")) return;

  // Content-hashed static assets → cache-first (safe; filenames change per build).
  if (ASSET_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {                       // never cache failures (a 404 during a deploy
              const copy = res.clone();         // would otherwise be served forever)
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Navigations / HTML → network-first so the app shell is always fresh,
  // falling back to the cached shell when offline. Never store the ROOT
  // response as the shell: on velealor.com "/" can be the marketing landing
  // (logged-out), and caching it would replace the offline app shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const MARKETING = ["/", "/velea", "/why", "/system", "/receive", "/access", "/confirmed"];
          if (!MARKETING.includes(url.pathname) && !url.pathname.startsWith("/marketing/") && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("/", copy));
          }
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || caches.match(req)))
    );
  }
});
