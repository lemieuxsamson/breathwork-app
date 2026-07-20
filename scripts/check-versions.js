#!/usr/bin/env node
'use strict';

/**
 * Vérifie que les références de version sont cohérentes entre les fichiers
 * du projet, avant de committer/déployer. Échoue (code de sortie 1) si une
 * incohérence est détectée.
 *
 * Ce script existe parce qu'on a déjà raté une désynchronisation manuelle
 * entre APP_VERSION (index.html) et CACHE_VERSION (sw.js) — voir CHANGELOG
 * v1.3.0. Plutôt que d'automatiser la correction (ce qui demanderait une
 * étape de build), on automatise la DÉTECTION : un simple garde-fou avant
 * de pousser.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readFile(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

function extract(content, regex, label, file) {
  const match = content.match(regex);
  if (!match) {
    console.error(`✗ Impossible de trouver ${label} dans ${file}`);
    process.exitCode = 1;
    return null;
  }
  return match[1];
}

const indexHtml = readFile('index.html');
const swJs = readFile('sw.js');
const readme = readFile('README.md');

const appVersion = extract(indexHtml, /const APP_VERSION = '([^']+)'/, 'APP_VERSION', 'index.html');
const cacheVersion = extract(swJs, /const CACHE_VERSION = '([^']+)'/, 'CACHE_VERSION', 'sw.js');
const readmeBadge = extract(readme, /badge\/version-([0-9.]+)-/, 'le badge de version', 'README.md');

let ok = true;

function check(label, a, aLabel, b, bLabel) {
  if (a === null || b === null) { ok = false; return; }
  if (a !== b) {
    console.error(`✗ ${label} : ${aLabel} (${a}) ≠ ${bLabel} (${b})`);
    ok = false;
  } else {
    console.log(`✓ ${label} : ${a}`);
  }
}

check('APP_VERSION == CACHE_VERSION', appVersion, 'index.html', cacheVersion, 'sw.js');
check('APP_VERSION == badge README', appVersion, 'index.html', readmeBadge, 'README.md');

// Vérifications de forme sur patterns.json / strings.json : juste s'assurer
// que dataVersion est un entier valide présent (pas de contrainte d'égalité
// avec APP_VERSION — ce sont des schémas de versionnage indépendants).
for (const file of ['patterns.json', 'strings.json']) {
  try {
    const data = JSON.parse(readFile(file));
    if (!Number.isInteger(data.dataVersion) || data.dataVersion < 1) {
      console.error(`✗ ${file} : dataVersion absent ou invalide`);
      ok = false;
    } else {
      console.log(`✓ ${file} dataVersion : ${data.dataVersion}`);
    }
  } catch (e) {
    console.error(`✗ ${file} : JSON invalide (${e.message})`);
    ok = false;
  }
}

if (!ok) {
  console.error('\nÉchec : incohérence(s) de version détectée(s). Corrige avant de committer.');
  process.exit(1);
}
console.log('\nToutes les versions sont cohérentes.');
