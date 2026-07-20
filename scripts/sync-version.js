#!/usr/bin/env node
'use strict';

/**
 * Propage la version de package.json (source unique de vérité) vers les
 * fichiers qui en contiennent une copie littérale (index.html, sw.js,
 * README.md) — puisque ce sont des fichiers statiques servis tels quels,
 * sans étape de build, la version doit y être écrite en dur.
 *
 * Usage normal : ne pas appeler ce script directement. Il est branché sur
 * le hook "version" de npm (voir package.json) et s'exécute automatiquement
 * quand on lance :
 *
 *   npm version patch   # 1.4.1 -> 1.4.2
 *   npm version minor   # 1.4.1 -> 1.5.0
 *   npm version major    # 1.4.1 -> 2.0.0
 *
 * npm bump le numéro dans package.json, PUIS lance ce script (qui met à
 * jour les autres fichiers et les ajoute au prochain commit), PUIS crée
 * automatiquement le commit et le tag git correspondants. Un seul push
 * derrière (git push && git push --tags) suffit ensuite.
 *
 * check-versions.js reste en place comme filet de sécurité en CI, au cas
 * où quelqu'un modifierait un fichier à la main sans passer par ce flux.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));
const VERSION = pkg.version;

if (!/^\d+\.\d+\.\d+$/.test(VERSION)) {
  console.error(`✗ Version invalide dans package.json : "${VERSION}"`);
  process.exit(1);
}

function replaceInFile(fileName, regex, replacement, label) {
  const filePath = path.join(ROOT, fileName);
  const content = fs.readFileSync(filePath, 'utf8');
  if (!regex.test(content)) {
    console.error(`✗ Motif introuvable pour ${label} dans ${fileName}`);
    process.exit(1);
  }
  const updated = content.replace(regex, replacement);
  if (updated === content) {
    console.log(`= ${fileName} : ${label} déjà à jour (${VERSION})`);
  } else {
    fs.writeFileSync(filePath, updated);
    console.log(`✓ ${fileName} : ${label} → ${VERSION}`);
  }
}

replaceInFile(
  'index.html',
  /const APP_VERSION = '[^']+'/,
  `const APP_VERSION = '${VERSION}'`,
  'APP_VERSION'
);

replaceInFile(
  'sw.js',
  /const CACHE_VERSION = '[^']+'/,
  `const CACHE_VERSION = '${VERSION}'`,
  'CACHE_VERSION'
);

replaceInFile(
  'README.md',
  /badge\/version-[0-9.]+-/,
  `badge/version-${VERSION}-`,
  'badge de version'
);

// Tente de mettre en scène les fichiers modifiés pour qu'ils rejoignent le
// même commit que le bump de package.json créé par `npm version`. Note :
// on ne peut pas se fier à npm_lifecycle_event === 'version' ici, car cet
// appel passe par `npm run sync-version` (script imbriqué), ce qui écrase
// la variable avec 'sync-version'. On tente donc toujours le git add, et
// on échoue silencieusement si on n'est pas dans un dépôt git (ex. appel
// manuel hors contexte de version).
try {
  execSync('git add index.html sw.js README.md', { cwd: ROOT, stdio: 'pipe' });
  console.log('\n✓ Fichiers synchronisés et ajoutés à l\'index git.');
} catch (e) {
  console.log(`\nSynchronisation terminée (v${VERSION}). (git add ignoré : ${e.message.split('\n')[0]})`);
}
