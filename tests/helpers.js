'use strict';

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const HTML = fs.readFileSync(HTML_PATH, 'utf8');
const SCRIPT_MATCH = HTML.match(/<script>([\s\S]*)<\/script>/);
const APP_SCRIPT = SCRIPT_MATCH[1];

/**
 * Charge l'application dans un environnement jsdom isolé et exécute le
 * callback une fois le rendu initial terminé (repli intégré ou cache).
 *
 * @param {(window: any, jsError: string|null) => void} checkFn
 * @param {(window: any) => void} [seedFn] - exécuté AVANT le chargement du
 *   script (ex. pour injecter des données dans localStorage)
 * @returns {Promise<void>}
 */
function withApp(checkFn, seedFn) {
  return new Promise((resolve, reject) => {
    const dom = new JSDOM(HTML, {
      url: 'http://localhost/',
      runScripts: 'outside-only',
      resources: 'usable',
      pretendToBeVisual: true
    });
    const { window } = dom;
    let jsError = null;
    window.addEventListener('error', (e) => {
      jsError = e.error ? e.error.message : String(e.message);
    });

    if (seedFn) seedFn(window);

    try {
      window.eval(APP_SCRIPT);
    } catch (e) {
      jsError = e.message;
    }

    // Le rendu initial (depuis le cache ou le repli intégré) est synchrone ;
    // un court délai laisse les micro-tâches (ex. tentative fetch réseau,
    // qui échoue silencieusement en environnement de test) se résoudre.
    setTimeout(() => {
      try {
        checkFn(window, jsError);
        window.close();
        resolve();
      } catch (e) {
        window.close();
        reject(e);
      }
    }, 250);
  });
}

module.exports = { withApp, HTML, APP_SCRIPT };
