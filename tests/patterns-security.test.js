'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { withApp } = require('./helpers');

test('rendu initial : le repli intégré fournit 10 techniques et 6 catégories', async () => {
  await withApp((window, err) => {
    assert.equal(err, null, 'aucune erreur JS au chargement');
    window.eval("document.getElementById('menuBtn').click();");
    const catCount = window.document.querySelectorAll('.menu-category').length;
    const techCount = window.document.querySelectorAll('.menu-tech-item').length;
    assert.equal(catCount, 6, 'nombre de catégories');
    assert.equal(techCount, 10, 'nombre de techniques');
  });
});

test('Wim Hof : la dernière phase du cycle est une expiration (pas de saut direct)', async () => {
  const html = require('./helpers').HTML;
  const match = html.match(/id:'wimhof'[\s\S]*?\}\)\(\) \}/);
  assert.ok(match, 'le pattern wimhof est présent dans le repli intégré');
  assert.match(
    match[0],
    /hold',dur:15\}\); a\.push\(\{type:'out',dur:2\}\);/,
    'la rétention de 15s est bien suivie d\'une expiration avant de boucler'
  );
});

test('dir est absent des données de phase (dérivé de type au moment de l\'exécution)', async () => {
  const html = require('./helpers').HTML;
  const embeddedBlock = html.slice(
    html.indexOf("const EMBEDDED_FALLBACK_PATTERNS = {"),
    html.indexOf("categories: [", html.indexOf("const EMBEDDED_FALLBACK_PATTERNS = {"))
  );
  assert.doesNotMatch(embeddedBlock, /\bdir\s*:/, 'aucune clé "dir" ne doit apparaître dans les définitions de phase');
});

test('localStorage corrompu (JSON invalide) : repli propre, entrée purgée', async () => {
  await withApp(
    (window, err) => {
      assert.equal(err, null);
      const techName = window.document.getElementById('currentTechName').textContent;
      assert.ok(techName && techName.length > 0, 'une technique reste affichée malgré la corruption');
      assert.equal(
        window.localStorage.getItem('breathapp-patterns-v1'),
        null,
        'l\'entrée corrompue a été purgée'
      );
    },
    (window) => {
      window.localStorage.setItem('breathapp-patterns-v1', '{not valid json!!');
    }
  );
});

test('localStorage : tentative de pollution de prototype rejetée', async () => {
  await withApp(
    (window, err) => {
      assert.equal(err, null);
      const polluted = window.eval('({}).polluted');
      assert.equal(polluted, undefined, 'Object.prototype ne doit pas être pollué');
      window.eval("document.getElementById('menuBtn').click();");
      const catCount = window.document.querySelectorAll('.menu-category').length;
      assert.equal(catCount, 6, 'le repli (6 catégories) est utilisé, pas la donnée malveillante');
    },
    (window) => {
      // Important : on construit le texte JSON brut directement, PAS via JSON.stringify()
      // sur un littéral d'objet JS contenant une clé "__proto__" — dans un littéral,
      // { __proto__: X } définit le PROTOTYPE de l'objet plutôt que de créer une propriété
      // propre, donc JSON.stringify() ne la sérialiserait même pas. JSON.parse(), lui,
      // crée bien une propriété propre littéralement nommée "__proto__" à partir d'un texte
      // JSON — c'est ce vecteur-là qu'on doit tester.
      const malicious = '{"dataVersion":1,"__proto__":{"polluted":true},'
        + '"techniques":[{"id":"x","defaultCycles":5,"phases":[{"type":"in","dur":4},{"type":"out","dur":4}]}],'
        + '"categories":[{"id":"calm","techIds":["x"]}],'
        + '"i18n":{"en-US":{"categories":{"calm":"Calm"},"techniques":{"x":{"name":"x","sub":"y","desc":"z"}}}}}';
      window.localStorage.setItem('breathapp-patterns-v1', malicious);
    }
  );
});

test('localStorage : identifiant malveillant (caractères dangereux) rejeté', async () => {
  await withApp(
    (window, err) => {
      assert.equal(err, null);
      window.eval("document.getElementById('menuBtn').click();");
      const catCount = window.document.querySelectorAll('.menu-category').length;
      assert.equal(catCount, 6, 'le repli est utilisé plutôt que la donnée avec id invalide');
    },
    (window) => {
      const malicious = JSON.stringify({
        dataVersion: 1,
        techniques: [{ id: '<img src=x onerror=alert(1)>', defaultCycles: 5, phases: [{ type: 'in', dur: 4 }, { type: 'out', dur: 4 }] }],
        categories: [{ id: 'calm', techIds: ['<img src=x onerror=alert(1)>'] }],
        i18n: { 'en-US': { categories: { calm: 'Calm' }, techniques: { '<img src=x onerror=alert(1)>': { name: 'x', sub: 'y', desc: 'z' } } } }
      });
      window.localStorage.setItem('breathapp-patterns-v1', malicious);
    }
  );
});

test('HTML dans un champ texte valide (nom de technique) est rendu en texte, jamais exécuté', async () => {
  await withApp(
    (window, err) => {
      assert.equal(err, null);
      window.eval("document.getElementById('menuBtn').click();");
      const rawHTML = window.document.querySelector('.menu-tech-item .name').innerHTML;
      const xssFired = window.eval('window.__xss');
      assert.equal(xssFired, undefined, 'aucun script injecté ne doit s\'exécuter');
      assert.ok(!rawHTML.includes('<img'), 'le contenu doit être échappé (textContent), pas interprété comme HTML');
    },
    (window) => {
      const payload = {
        dataVersion: 1,
        techniques: [{ id: 'x', defaultCycles: 5, phases: [{ type: 'in', dur: 4 }, { type: 'out', dur: 4 }] }],
        categories: [{ id: 'calm', techIds: ['x'] }],
        i18n: {
          'en-US': {
            categories: { calm: 'Calm' },
            techniques: { x: { name: '<img src=x onerror=window.__xss=1>', sub: 'y', desc: 'z' } }
          }
        }
      };
      window.localStorage.setItem('breathapp-patterns-v1', JSON.stringify(payload));
    }
  );
});

test('strings.json corrompu : repli propre sur les textes intégrés', async () => {
  await withApp(
    (window, err) => {
      assert.equal(err, null);
      const appTitle = window.document.getElementById('appTitle').textContent;
      assert.ok(appTitle && appTitle.length > 0);
      assert.equal(window.localStorage.getItem('breathapp-strings-v1'), null, 'entrée purgée');
    },
    (window) => {
      window.localStorage.setItem('breathapp-strings-v1', '{not valid json');
    }
  );
});

test('changement de langue via l\'UI fonctionne (FR/EN)', async () => {
  await withApp((window, err) => {
    assert.equal(err, null);
    window.eval("document.getElementById('menuBtn').click();");
    const pills = window.document.querySelectorAll('.lang-pill');
    const frPill = Array.from(pills).find((p) => p.textContent === 'Français');
    assert.ok(frPill, 'la pastille Français existe');
    frPill.click();
    const title = window.document.getElementById('appTitle').textContent;
    assert.equal(title, 'Respiration');
  });
});
