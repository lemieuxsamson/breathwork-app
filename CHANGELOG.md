# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

## [1.4.1] — 2026-07-20

Aucun changement fonctionnel — outillage de développement uniquement (n'affecte pas le site déployé).

### Ajouté — Tests & CI
- Suite de tests committée dans `/tests`, utilisant le test-runner intégré de Node.js (`node --test`, aucune dépendance de framework) : sécurité/validation des données (9 tests), service worker (7 tests, via mocks de l'API Cache), accessibilité (7 tests, via jsdom) — **24 tests au total**
- `package.json` avec `npm test` / `npm run check-versions` / `npm run verify`
- **`scripts/check-versions.js`** : détecte automatiquement toute désynchronisation entre `APP_VERSION` (index.html), `CACHE_VERSION` (sw.js) et le badge de version du README — exactement le type de dérive manuelle qu'on a ratée entre la v1.3.0 et la v1.4.0
- **`.github/workflows/ci.yml`** : lance la vérification des versions et la suite de tests automatiquement à chaque push/PR sur `main`

Jusqu'ici, les tests n'existaient que dans l'environnement de travail ponctuel utilisé pour construire chaque version — ils ne protégeaient pas le dépôt contre une régression future. Ils font maintenant partie du projet lui-même.

## [1.4.0] — 2026-07-20

### Ajouté — Accessibilité
- Tous les éléments interactifs du menu (en-têtes de catégorie, items de technique, pastilles de langue, bouton À propos) sont maintenant de vrais `<button>` plutôt que des `<div onclick>` — utilisables au clavier, correctement annoncés par les lecteurs d'écran
- Le tiroir menu et la modale À propos ont `role="dialog"` + `aria-modal="true"`, un piège de focus (Tab reste dans le dialogue ouvert), une fermeture au `Escape`, et un retour automatique du focus vers l'élément qui a ouvert le dialogue
- `aria-live="polite"` sur le libellé de phase — les changements (Inspirer/Retenir/Expirer) sont maintenant annoncés aux lecteurs d'écran sans dépendre uniquement du son
- `aria-expanded`/`aria-controls` sur les en-têtes de catégorie (accordéon), `aria-pressed` sur les pastilles de langue, `aria-current` sur la technique active
- Labels ARIA traduits pour le contrôle de volume et le tiroir menu (nouvelles clés `volumeAria`, `menuDialogAria` dans `strings.json`)
- Indicateur de focus clavier visible (`:focus-visible`) sur tous les éléments interactifs

### Corrigé
- Le tiroir menu et la modale À propos utilisaient `transform`/`opacity` pour se cacher (pas `display:none`), ce qui permettait à un utilisateur clavier de tabuler dans leur contenu même fermé et invisible à l'écran. Corrigé avec l'attribut `inert`, qui exclut proprement le contenu fermé du parcours clavier et des lecteurs d'écran.

### Tests
- Suite de tests jsdom dédiée à l'accessibilité : sémantique des boutons, `aria-expanded` de l'accordéon, `Escape` + retour de focus (tiroir et modale), déplacement du focus à l'ouverture, piège de focus (Tab en boucle), présence des labels traduits — 7 tests, tous validés

## [1.3.0] — 2026-07-15

### Ajouté
- **Service worker** (`sw.js`) : l'app shell (`index.html`, `manifest.json`, icônes) est maintenant mis en cache réellement hors ligne, ce qui comblait une lacune de l'architecture précédente — le cache `localStorage` protégeait déjà le *contenu* (`patterns.json`/`strings.json`) contre une perte de réseau, mais pas l'application elle-même. Un rechargement de la page sans réseau (et sans cache navigateur intact) pouvait auparavant échouer.
  - Stratégie **cache d'abord** pour l'app shell, avec mise à jour silencieuse en arrière-plan
  - Stratégie **réseau d'abord, repli sur le cache** pour `patterns.json`/`strings.json`, cohérente avec leur propre logique de fraîcheur déjà en place
  - Purge automatique des anciennes versions de cache à l'activation d'une nouvelle version du service worker
  - Clé de cache normalisée (sans le paramètre `?t=` de contournement du cache HTTP) pour éviter une croissance illimitée du cache de données

### Tests
- Suite de tests dédiée (mocks de l'API Cache Storage/Service Worker via `vm` Node, puisque jsdom ne supporte pas cette API) couvrant : mise en cache initiale complète, purge des anciennes versions, absence de fuite de cache malgré le cache-busting, repli sur le cache hors ligne, non-interception des requêtes tierces et non-GET

## [1.2.1] — 2026-07-15

### Modifié
- Le champ `dir` (direction du mouvement respiratoire, utilisé par le moteur d'animation/son) était stocké en double avec `type` alors qu'il en était toujours entièrement dérivable (`in`→1, `hold`→0, `out`→-1). Il est maintenant calculé à partir de `type` au moment de l'exécution plutôt que lu depuis les données.

### Sécurité
- Cette redondance masquait une faille de validation : `validatePhase` vérifiait `type` et `dir` indépendamment, sans jamais confirmer leur cohérence mutuelle. Un `patterns.json` malformé aurait pu combiner `type:'in'` avec `dir:-1`, causant un bug visuel/sonore trompeur (libellé « Inspirer » pendant que le cercle rétrécit). En supprimant `dir` du schéma, cette classe de bug est désormais **structurellement impossible**, plutôt que simplement empêchée par une validation.
- `patterns.json` passe à `dataVersion: 3` (schéma simplifié, rétrocompatible — un `dir` résiduel dans d'anciennes données est simplement ignoré)

## [1.2.0] — 2026-07-15

### Corrigé
- **Wim Hof** : la rétention de récupération (poumons pleins, 15s) était directement suivie du prochain round de 30 respirations rapides, sans expiration entre les deux. Une phase d'expiration (2s) a été ajoutée pour refléter la pratique réelle. (`patterns.json` passe à `dataVersion: 2`)

### Ajouté
- Séparation des textes d'interface (titres, boutons, libellés de phase, contenu de la modale À propos, etc.) dans un nouveau fichier **`strings.json`**, selon exactement la même architecture que `patterns.json` : cache `localStorage` validé, mise à jour silencieuse à l'ouverture si réseau disponible, repli intégré dans `index.html`
- La liste des langues disponibles (pastilles du sélecteur) est désormais pilotée par `strings.json` plutôt que codée en dur — ajouter une langue ne nécessite plus de modifier `index.html`
- Les deux mises à jour réseau (`patterns.json` et `strings.json`) sont indépendantes l'une de l'autre et s'appliquent chacune dès réception, sans bloquer le rendu initial

### Sécurité
- `strings.json` bénéficie de la même validation stricte que `patterns.json` avant toute utilisation (types, longueurs, formats de code de langue, détection de pollution de prototype) ; toute entrée invalide est purgée automatiquement
- Suite de tests automatisés étendue pour couvrir `strings.json` corrompu ou malveillant, avec les mêmes garanties que pour `patterns.json`

## [1.1.0] — 2026-07-15

### Ajouté
- Séparation des techniques/catégories dans un fichier externe `patterns.json`, chargé au démarrage
- Mise en cache locale (`localStorage`) des patterns pour un fonctionnement **hors ligne complet** après le premier chargement
- Vérification de mise à jour silencieuse à chaque ouverture de l'app (si réseau disponible) : si `patterns.json` a changé de version, le cache et l'affichage se mettent à jour automatiquement sans interrompre une séance en cours
- Repli intégré (`EMBEDDED_FALLBACK_PATTERNS`) directement dans `index.html`, garantissant que l'app reste fonctionnelle même au tout premier lancement hors ligne (avant toute mise en cache)

### Sécurité
- **Validation stricte de toutes les lectures du `localStorage`** avant utilisation (`validatePatternsData`) : types, bornes numériques, longueurs de chaînes, formats d'identifiants (liste blanche `^[a-z][a-z0-9_-]{0,39}$`), intégrité référentielle (catégories → techniques existantes), détection de tentative de pollution de prototype (`__proto__`, `constructor`, `prototype`)
- Toute entrée `localStorage` invalide ou corrompue est automatiquement purgée et remplacée par le repli sécuritaire, sans jamais faire planter l'app
- Élimination complète des usages d'`innerHTML` avec du contenu dynamique (catégories/techniques) — remplacés par de la construction DOM sécurisée (`createElement`/`textContent`), qui neutralise tout contenu HTML/script injecté même s'il passait la validation
- Suite de tests automatisés (jsdom) couvrant : JSON corrompu, tentative de pollution de prototype, identifiants malveillants, contenu texte contenant du HTML — tous confirmés neutralisés sans exécution ni plantage

## [1.0.0] — 2026-07-14

Première version « officielle » du projet, après plusieurs itérations de développement conversationnel.

### Ajouté
- 10 techniques de respiration guidées : Cohérence, Box, 4-7-8, Anti-stress, Tesla, Énergie, Vortex, Sri Yantra, Soupir physiologique, Wim Hof
- Classement des techniques en 6 catégories, accessibles via un menu latéral (accordéon exclusif, tri alphabétique)
- Cercle animé synchronisé avec chaque phase de respiration, anneau de progression continu (remplissage à l'inspiration, vidage à l'expiration)
- Son généré en direct (bruit filtré via Web Audio API, aucun fichier audio) synchronisé à la durée exacte de chaque phase
- Contrôle de volume avec mute/unmute
- Nombre de cycles suggéré par défaut selon les recommandations connues pour chaque technique (ex. 4 cycles pour le 4-7-8 selon le Dr Andrew Weil, 3 rounds pour le protocole Wim Hof), ajustable avant de débuter
- Décompte du temps restant basé sur le nombre de cycles choisi
- Interface bilingue français canadien / anglais américain, détection automatique de la langue du navigateur, architecture extensible à d'autres langues
- Support PWA : manifeste, icônes, installation sur écran d'accueil (iOS/Android)
- Section « À propos » (version, licence, liens)
- Lien direct vers GitHub Issues pour proposer une nouvelle technique ou fonctionnalité
- Licence MIT

### Sécurité
- Revue OWASP effectuée : aucune donnée utilisateur n'est injectée via `innerHTML`, tous les liens externes utilisent `rel="noopener noreferrer"`, aucune dépendance externe (zéro surface d'attaque supply-chain)

---

## [Non publié]

### À venir
- Historique des séances complétées
- Page de suggestion enrichie (au-delà du lien GitHub Issues)
