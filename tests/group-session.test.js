'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { withApp } = require('./helpers');

// Réimplémentation du codec, identique à celle embarquée dans index.html
// (voir la section "Codec du code de séance de groupe" du fichier), pour
// pouvoir fabriquer des codes de test sans dépendre des fonctions internes
// de l'app (scopées dans son IIFE, donc non accessibles depuis l'extérieur).
const SESSION_EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0);
const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function bitMask(bits) { return (1n << BigInt(bits)) - 1n; }
function checksum(payload) {
  const a = payload & bitMask(6);
  const b = (payload >> 6n) & bitMask(6);
  const c = (payload >> 17n) & bitMask(6);
  const d = (payload >> 33n) & bitMask(6);
  return Number((a ^ b ^ c ^ d) & bitMask(6));
}
function toBase32(num, length) {
  let out = '';
  let n = num;
  for (let i = 0; i < length; i++) {
    out = CROCKFORD_ALPHABET[Number(n & 31n)] + out;
    n >>= 5n;
  }
  return out.match(/.{1,4}/g).join('-');
}
function encodeSessionCode({ techIndex, cycles, delaySeconds, nowMs }) {
  const startMs = nowMs + delaySeconds * 1000;
  const startOffset = Math.round((startMs - SESSION_EPOCH_MS) / 1000);
  let payload = 0n;
  payload |= 0n << 49n; // version
  payload |= BigInt(techIndex) << 44n;
  payload |= BigInt(cycles) << 37n;
  payload |= BigInt(delaySeconds) << 30n;
  payload |= BigInt(startOffset);
  const full = (payload << 6n) | BigInt(checksum(payload));
  return toBase32(full, 12);
}

test('le menu propose "Séance de groupe" et ouvre la modale correspondante', async () => {
  await withApp((window, err) => {
    assert.equal(err, null);
    window.eval("document.getElementById('menuBtn').click();");
    window.eval("document.getElementById('menuGroupBtn').click();");
    assert.ok(window.document.getElementById('groupModal').classList.contains('open'));
    assert.equal(window.document.getElementById('groupPanelCreate').hidden, false, 'onglet Créer actif par défaut');
  });
});

test('générer un code produit le format XXXX-XXXX-XXXX et affiche un décompte', async () => {
  await withApp((window, err) => {
    window.eval("document.getElementById('menuBtn').click();document.getElementById('menuGroupBtn').click();");
    window.eval("document.getElementById('groupGenerateBtn').click();");
    const code = window.document.getElementById('groupCode').textContent;
    assert.match(code, /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    assert.equal(window.document.getElementById('groupCreateResult').hidden, false);
    assert.ok(window.document.getElementById('groupCountdown').textContent.length > 0);
  });
});

test('rejoindre une séance sur une AUTRE technique que celle affichée met bien à jour l\'en-tête', async () => {
  await withApp((window, err) => {
    // Sélectionner "Box" dans le menu principal, pour simuler l'état signalé dans le bug
    window.eval("document.getElementById('menuBtn').click();");
    const items = window.document.querySelectorAll('.menu-tech-item');
    const boxItem = Array.from(items).find(i => i.querySelector('.name').textContent === 'Box');
    assert.ok(boxItem, 'la technique Box est trouvée dans le menu');
    boxItem.click();
    assert.equal(window.document.getElementById('currentTechName').textContent, 'Box', 'en-tête affiche bien Box avant de rejoindre');

    // Rejoindre une séance de groupe sur "Coherence" (index 0) — l'en-tête doit basculer
    const nowMs = Date.now();
    const code = encodeSessionCode({ techIndex: 0, cycles: 8, delaySeconds: 0, nowMs: nowMs - 3000 });
    window.eval("document.getElementById('menuBtn').click();document.getElementById('menuGroupBtn').click();");
    window.eval("document.getElementById('groupTabJoin').click();");
    window.document.getElementById('groupCodeInput').value = code;
    window.eval("document.getElementById('groupJoinBtn').click();");

    assert.equal(err, null);
    assert.equal(window.document.getElementById('currentTechName').textContent, 'Coherence', 'en-tête doit basculer sur Coherence après la jonction');
  });
});

test('rejoindre une séance met aussi à jour l\'état du menu (item actif + catégorie ouverte)', async () => {
  await withApp((window, err) => {
    // Sélectionner Box au départ (catégorie "Focus")
    window.eval("document.getElementById('menuBtn').click();");
    const items1 = window.document.querySelectorAll('.menu-tech-item');
    const boxItem = Array.from(items1).find(i => i.querySelector('.name').textContent === 'Box');
    boxItem.click();

    // Rejoindre une séance sur "sriyantra" (index 7, catégorie "Advanced meditation" — différente de Box)
    const nowMs = Date.now();
    const code = encodeSessionCode({ techIndex: 7, cycles: 4, delaySeconds: 0, nowMs: nowMs - 2000 });
    window.eval("document.getElementById('menuBtn').click();document.getElementById('menuGroupBtn').click();");
    window.eval("document.getElementById('groupTabJoin').click();");
    window.document.getElementById('groupCodeInput').value = code;
    window.eval("document.getElementById('groupJoinBtn').click();");

    assert.equal(err, null);

    window.eval("document.getElementById('menuBtn').click();");
    const items2 = window.document.querySelectorAll('.menu-tech-item');
    const activeItem = Array.from(items2).find(i => i.classList.contains('active'));
    assert.ok(activeItem, 'un item actif existe dans le menu');
    assert.equal(activeItem.querySelector('.name').textContent, 'Sri Yantra', 'Sri Yantra est marqué actif');
    assert.equal(activeItem.getAttribute('aria-current'), 'true');

    const categories = window.document.querySelectorAll('.menu-category');
    const openCat = Array.from(categories).find(c => c.classList.contains('open'));
    assert.ok(openCat, 'une catégorie est ouverte');
    assert.equal(openCat.querySelector('.menu-cat-header span').textContent, 'Advanced meditation', 'la catégorie contenant Sri Yantra s\'ouvre automatiquement');
  });
});

test('rejoindre une séance en cours place le moteur exactement à la bonne phase/cycle', async () => {
  await withApp((window, err) => {
    // Cohérence (5.5s in / 5.5s out par cycle), démarrée il y a 8s -> 2.5s dans l'expiration
    const nowMs = Date.now();
    const code = encodeSessionCode({ techIndex: 0, cycles: 10, delaySeconds: 0, nowMs: nowMs - 8000 });

    window.eval("document.getElementById('menuBtn').click();document.getElementById('menuGroupBtn').click();");
    window.eval("document.getElementById('groupTabJoin').click();");
    window.document.getElementById('groupCodeInput').value = code;
    window.eval("document.getElementById('groupJoinBtn').click();");

    assert.equal(err, null);
    assert.ok(window.document.getElementById('startBtn').classList.contains('running'), 'séance en cours');
    const label = window.document.getElementById('phase-label').textContent;
    assert.ok(label === 'Exhale' || label === 'Expirer', `libellé attendu "out", obtenu "${label}"`);
    assert.equal(window.document.getElementById('cycleCount').textContent, '10', '0 cycle complété sur 10');
    // Correctif : l'en-tête (nom/sous-titre de la technique) doit refléter la
    // technique de la séance rejointe, pas rester sur celle affichée avant.
    const headerName = window.document.getElementById('currentTechName').textContent;
    assert.equal(headerName, 'Coherence', `l'en-tête doit afficher "Coherence" (technique de la séance rejointe), obtenu "${headerName}"`);
    assert.ok(!window.document.getElementById('groupModal').classList.contains('open'), 'modale refermée automatiquement');
  });
});

test('rejoindre avant le départ affiche un décompte d\'attente, ne démarre pas encore', async () => {
  await withApp((window, err) => {
    const nowMs = Date.now();
    const code = encodeSessionCode({ techIndex: 0, cycles: 5, delaySeconds: 20, nowMs });
    window.eval("document.getElementById('menuBtn').click();document.getElementById('menuGroupBtn').click();");
    window.eval("document.getElementById('groupTabJoin').click();");
    window.document.getElementById('groupCodeInput').value = code;
    window.eval("document.getElementById('groupJoinBtn').click();");
    const status = window.document.getElementById('groupJoinStatus').textContent;
    assert.match(status, /\d/, 'un décompte numérique est affiché');
    assert.ok(!window.document.getElementById('startBtn').classList.contains('running'));
  });
});

test('code corrompu (checksum invalide) : message d\'erreur clair, aucun plantage', async () => {
  await withApp((window, err) => {
    const nowMs = Date.now();
    const code = encodeSessionCode({ techIndex: 0, cycles: 5, delaySeconds: 10, nowMs });
    const lastChar = code[code.length - 1];
    const corrupted = code.slice(0, -1) + (lastChar === '0' ? '1' : '0');

    window.eval("document.getElementById('menuBtn').click();document.getElementById('menuGroupBtn').click();");
    window.eval("document.getElementById('groupTabJoin').click();");
    window.document.getElementById('groupCodeInput').value = corrupted;
    window.eval("document.getElementById('groupJoinBtn').click();");

    assert.equal(err, null, 'aucune erreur JS malgré le code corrompu');
    const status = window.document.getElementById('groupJoinStatus');
    assert.equal(status.className, 'error');
    assert.ok(status.textContent.length > 0);
  });
});

test('séance déjà terminée : message clair, aucun démarrage', async () => {
  await withApp((window, err) => {
    const nowMs = Date.now();
    const code = encodeSessionCode({ techIndex: 0, cycles: 1, delaySeconds: 0, nowMs: nowMs - 1000000 });
    window.eval("document.getElementById('menuBtn').click();document.getElementById('menuGroupBtn').click();");
    window.eval("document.getElementById('groupTabJoin').click();");
    window.document.getElementById('groupCodeInput').value = code;
    window.eval("document.getElementById('groupJoinBtn').click();");
    const status = window.document.getElementById('groupJoinStatus');
    assert.equal(status.className, 'error');
    assert.ok(!window.document.getElementById('startBtn').classList.contains('running'));
  });
});

test('code de longueur incorrecte est rejeté proprement', async () => {
  await withApp((window, err) => {
    window.eval("document.getElementById('menuBtn').click();document.getElementById('menuGroupBtn').click();");
    window.eval("document.getElementById('groupTabJoin').click();");
    window.document.getElementById('groupCodeInput').value = 'ABCD-EFGH';
    window.eval("document.getElementById('groupJoinBtn').click();");
    const status = window.document.getElementById('groupJoinStatus');
    assert.equal(status.className, 'error');
  });
});

test('champ vide affiche une invite plutôt qu\'une erreur cryptique', async () => {
  await withApp((window, err) => {
    window.eval("document.getElementById('menuBtn').click();document.getElementById('menuGroupBtn').click();");
    window.eval("document.getElementById('groupTabJoin').click();");
    window.document.getElementById('groupCodeInput').value = '';
    window.eval("document.getElementById('groupJoinBtn').click();");
    const status = window.document.getElementById('groupJoinStatus');
    assert.ok(status.textContent.length > 0);
  });
});
