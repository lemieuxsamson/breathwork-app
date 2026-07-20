'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const SW_PATH = path.join(__dirname, '..', 'sw.js');
const SW_CODE = fs.readFileSync(SW_PATH, 'utf8');

function makeFakeCacheStorage() {
  const store = new Map();
  function fakeCache(name) {
    if (!store.has(name)) store.set(name, new Map());
    const map = store.get(name);
    return {
      addAll: async (urls) => { urls.forEach((u) => map.set(u, { url: u })); },
      put: async (key, response) => { map.set(typeof key === 'string' ? key : key.url, response); },
      match: async (key) => map.get(typeof key === 'string' ? key : key.url)
    };
  }
  return {
    open: async (name) => fakeCache(name),
    keys: async () => Array.from(store.keys()),
    delete: async (name) => store.delete(name),
    _store: store
  };
}

function runScenario() {
  const listeners = {};
  const fakeCaches = makeFakeCacheStorage();
  let fetchShouldFail = false;
  const sandbox = {
    self: {
      addEventListener: (evt, fn) => { listeners[evt] = fn; },
      location: { origin: 'https://breath.lemieuxsamson.com' },
      skipWaiting: () => {},
      clients: { claim: () => {} }
    },
    caches: fakeCaches,
    fetch: async (req) => {
      if (fetchShouldFail) throw new Error('network down');
      const url = typeof req === 'string' ? req : req.url;
      return { ok: true, url, clone: () => ({ ok: true, url }) };
    },
    URL,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(SW_CODE, sandbox);
  return { listeners, fakeCaches, sandbox, setFetchFail: (v) => { fetchShouldFail = v; } };
}

test('sw.js : syntaxe valide (parseable)', () => {
  assert.doesNotThrow(() => new vm.Script(SW_CODE));
});

test('install() met en cache tous les assets de l\'app shell', async () => {
  const { listeners, fakeCaches } = runScenario();
  let capturedPromise = null;
  listeners.install({ waitUntil: (p) => { capturedPromise = p; } });
  await capturedPromise;
  const shellCacheName = Array.from(fakeCaches._store.keys()).find((k) => k.startsWith('breathapp-shell-'));
  assert.ok(shellCacheName, 'un cache shell versionné a été créé');
  const cached = fakeCaches._store.get(shellCacheName);
  assert.equal(cached.size, 7, 'les 7 fichiers de l\'app shell sont en cache (/, index.html, manifest, 3 icônes, favicon)');
});

test('activate() purge les anciennes versions de cache', async () => {
  const { listeners, fakeCaches } = runScenario();
  fakeCaches._store.set('breathapp-shell-0.9.0', new Map());
  fakeCaches._store.set('breathapp-data-0.9.0', new Map());
  await listeners.activate({ waitUntil: (p) => p });
  const remaining = Array.from(fakeCaches._store.keys());
  assert.ok(!remaining.includes('breathapp-shell-0.9.0'), 'ancien cache shell purgé');
  assert.ok(!remaining.includes('breathapp-data-0.9.0'), 'ancien cache data purgé');
});

test('patterns.json : requêtes avec ?t= différents ne créent qu\'UNE seule entrée de cache', async () => {
  const { listeners, fakeCaches } = runScenario();
  const req1 = { method: 'GET', url: 'https://breath.lemieuxsamson.com/patterns.json?t=1111' };
  const req2 = { method: 'GET', url: 'https://breath.lemieuxsamson.com/patterns.json?t=2222' };
  await new Promise((resolve) => {
    listeners.fetch({ request: req1, respondWith: (p) => p.then(resolve) });
  });
  await new Promise((resolve) => {
    listeners.fetch({ request: req2, respondWith: (p) => p.then(resolve) });
  });
  const dataCacheName = Array.from(fakeCaches._store.keys()).find((k) => k.startsWith('breathapp-data-'));
  const dataCache = fakeCaches._store.get(dataCacheName);
  assert.equal(dataCache.size, 1, 'une seule clé de cache malgré des paramètres ?t= différents');
});

test('hors ligne : repli sur le cache pour patterns.json (après un premier succès)', async () => {
  const { listeners, setFetchFail } = runScenario();

  // Premier appel réussi : peuple le cache de données
  const req1 = { method: 'GET', url: 'https://breath.lemieuxsamson.com/patterns.json?t=1' };
  await new Promise((resolve) => {
    listeners.fetch({ request: req1, respondWith: (p) => p.then(resolve) });
  });

  // Le réseau tombe : la requête suivante doit se rabattre sur le cache déjà peuplé
  setFetchFail(true);
  let offlineResult = null;
  const req2 = { method: 'GET', url: 'https://breath.lemieuxsamson.com/patterns.json?t=2' };
  await new Promise((resolve) => {
    listeners.fetch({
      request: req2,
      respondWith: (p) => p.then((r) => { offlineResult = r; resolve(); })
    });
  });

  assert.ok(offlineResult, 'une réponse (issue du cache) est retournée malgré l\'échec réseau');
  assert.equal(offlineResult.url, 'https://breath.lemieuxsamson.com/patterns.json?t=1', 'c\'est bien la réponse mise en cache lors du premier succès');
});

test('requêtes tierces (autre origine) jamais interceptées', async () => {
  const { listeners } = runScenario();
  const req = { method: 'GET', url: 'https://github.com/lemieuxsamson/breathwork-app/issues/new' };
  let respondWithCalled = false;
  listeners.fetch({ request: req, respondWith: () => { respondWithCalled = true; } });
  assert.equal(respondWithCalled, false, 'une requête vers une autre origine ne doit jamais être interceptée');
});

test('requêtes non-GET jamais interceptées', async () => {
  const { listeners } = runScenario();
  const req = { method: 'POST', url: 'https://breath.lemieuxsamson.com/patterns.json' };
  let respondWithCalled = false;
  listeners.fetch({ request: req, respondWith: () => { respondWithCalled = true; } });
  assert.equal(respondWithCalled, false, 'une requête POST ne doit jamais être interceptée');
});
