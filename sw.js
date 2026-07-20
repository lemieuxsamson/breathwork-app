// Service Worker — Respiration
// Stratégie :
//   - App shell (index.html, manifest, icônes) : cache d'abord, mise à jour
//     silencieuse en arrière-plan, secours réseau si rien en cache.
//   - Données (patterns.json, strings.json) : réseau d'abord (la fraîcheur
//     réelle est déjà gérée côté app via localStorage + dataVersion), avec
//     repli sur le cache si hors ligne ou requête échouée. La clé de cache
//     ignore volontairement les paramètres de requête (?t=...) utilisés par
//     l'app pour contourner le cache HTTP — sans ça, chaque appel créerait
//     une nouvelle entrée et le cache grossirait indéfiniment.
//
// IMPORTANT : CACHE_VERSION doit être bumpé à chaque changement de fichier
// listé dans SHELL_ASSETS, et idéalement aligné sur APP_VERSION (index.html)
// à chaque release — voir CHANGELOG.md / checklist de version.

const CACHE_VERSION = '1.5.0';
const SHELL_CACHE = 'breathapp-shell-' + CACHE_VERSION;
const DATA_CACHE = 'breathapp-data-' + CACHE_VERSION;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png'
];

function isDataRequest(url){
  return url.pathname.endsWith('/patterns.json') || url.pathname.endsWith('/strings.json');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return; // ne jamais intercepter POST/PUT/etc.

  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return; // jamais sur des requêtes tierces (GitHub, etc.)

  if(isDataRequest(url)){
    const cacheKey = url.pathname; // ignore le ?t=... de cache-busting
    event.respondWith(
      fetch(req)
        .then((res) => {
          if(res && res.ok){
            const clone = res.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(cacheKey, clone));
          }
          return res;
        })
        .catch(() => caches.open(DATA_CACHE).then((cache) => cache.match(cacheKey)))
    );
    return;
  }

  // App shell : cache d'abord, réseau en secours + mise à jour silencieuse
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if(res && res.ok){
            const clone = res.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
