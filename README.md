# Respiration 🌬️

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Version](https://img.shields.io/badge/version-1.5.0-7dd3fc.svg)

Application web de respiration guidée (breathwork & cohérence cardiaque), conçue comme une PWA (Progressive Web App) installable sur l'écran d'accueil iOS/Android — sans backend, sans dépendance externe, 100 % hors ligne après le premier chargement.

**Démo :** https://breath.lemieuxsamson.com

## Fonctionnalités

- 10 techniques de respiration guidées (Cohérence, Box, 4-7-8, Anti-stress, Tesla, Énergie, Vortex, Sri Yantra, Soupir physiologique, Wim Hof), classées en 6 catégories
- Cercle animé synchronisé avec chaque phase (inspiration / rétention / expiration), anneau de progression continu
- Son généré en direct (bruit filtré, sans fichier audio) qui suit la durée exacte de chaque phase, avec contrôle de volume
- Nombre de cycles suggéré par technique (basé sur les recommandations connues — ex. 4 cycles pour le 4-7-8 selon le Dr Andrew Weil, 3 rounds pour le Wim Hof), ajustable avant de débuter
- Décompte du temps restant basé sur le nombre de cycles choisi
- Interface bilingue (français canadien / anglais américain), détection automatique de la langue du navigateur, extensible à d'autres langues
- Menu latéral avec sélection de langue, volume et choix de technique par catégorie
- Section « À propos » avec numéro de version visible
- Lien direct vers GitHub Issues pour suggérer une technique ou une fonctionnalité
- Accessible au clavier et aux lecteurs d'écran : navigation par boutons sémantiques, dialogues avec piège de focus et fermeture au `Escape`, annonces `aria-live` des changements de phase
- **Séance de groupe synchronisée, sans serveur** : un coach génère un code court (ou un QR) encodant technique/cycles/heure de départ ; les participants qui rejoignent — même en retard — démarrent exactement à la bonne phase, sans connexion entre appareils

## Structure du dépôt

```
.
├── index.html       # Coquille de l'application (HTML + CSS + moteur JS + replis intégrés)
├── sw.js            # Service worker : cache l'app shell pour un vrai fonctionnement hors ligne
├── patterns.json    # Techniques, catégories et leurs traductions (chargé au démarrage)
├── strings.json     # Textes d'interface (titres, boutons, libellés) et liste des langues
├── manifest.json    # Manifeste PWA (nom, icônes, couleurs, mode standalone)
├── icon-*.png       # Icônes de l'application (180/192/512 px)
├── favicon-32.png   # Favicon
├── vendor/
│   ├── qrcode.min.js  # Génération de QR code (MIT) — chargée à l'usage seulement
│   └── jsQR.min.js    # Lecture de QR par caméra (Apache-2.0) — prévue pour une prochaine itération
├── CNAME            # Domaine personnalisé pour GitHub Pages
├── LICENSE           # Licence MIT
├── CHANGELOG.md      # Historique des versions
├── README.md
├── package.json      # Dépendances de développement + scripts (rien n'est requis en production)
├── tests/            # Suite de tests (node:test) — sécurité, service worker, accessibilité, séance de groupe
├── scripts/
│   ├── check-versions.js  # Détecte les désynchronisations de version entre fichiers
│   └── sync-version.js    # Propage package.json → index.html/sw.js/README.md (via `npm version`)
└── .github/workflows/ci.yml  # Lance les tests + la vérification des versions à chaque push
```

## Développement & tests

Le site en production ne dépend d'aucun de ces outils — `index.html` reste un fichier 100 % autonome. `package.json`, `tests/` et `scripts/` servent uniquement à valider et faciliter les changements avant de les déployer.

```bash
npm install               # installe jsdom (seule dépendance, dev uniquement)
npm test                  # lance la suite de tests (node --test)
npm run check-versions    # vérifie la cohérence APP_VERSION / CACHE_VERSION / badge README
npm run verify             # les deux à la fois — à lancer avant chaque commit
npm version patch|minor|major   # bump + synchronise + commit + tag (voir section Versions)
```

Une GitHub Action (`.github/workflows/ci.yml`) lance automatiquement `check-versions` et `test` à chaque push ou pull request vers `main`.

## Séance de groupe synchronisée (sans serveur)

Pensé pour un cours donné par un coach avec des participants à distance (ex. Zoom) : tout le monde respire en synchro, sans qu'aucune connexion n'existe entre les appareils.

**Principe** : le code de séance (12 caractères, ex. `XM7Q-K3F9-VB2R`) encode la technique, le nombre de cycles, et l'heure exacte de départ — pas une référence à consulter quelque part, la donnée est directement dans le code. Chaque appareil qui rejoint calcule localement, à partir de l'heure encodée et de sa propre horloge, exactement où il devrait être dans la séquence — et démarre directement à cette phase, même en retard de plusieurs secondes ou minutes.

- **Coach** : Menu → Séance de groupe → Créer → choisit un délai de départ (le temps de partager le code, 5-60s) → génère → affiche le code et un QR
- **Participant** : Menu → Séance de groupe → Rejoindre → saisit le code → démarre automatiquement en phase avec tout le monde
- Aucun serveur, aucune connexion entre appareils — seule l'horloge système de chaque appareil est utilisée (négligeable en pratique, synchronisation NTP automatique)
- Le code inclut une somme de contrôle qui détecte les fautes de frappe, et toute donnée décodée est validée strictement avant utilisation

## Fonctionnement hors ligne

Deux couches distinctes travaillent ensemble :

1. **Le service worker (`sw.js`)** met en cache l'app shell (`index.html`, `manifest.json`, icônes) — ça garantit que l'application elle-même se charge, même sans réseau et même si le cache HTTP du navigateur a été évincé.
2. **Le cache `localStorage`** (voir section suivante) garde une copie validée de `patterns.json`/`strings.json`, avec vérification de mise à jour à chaque ouverture si le réseau est disponible.

Ensemble, ces deux couches permettent un lancement 100 % fonctionnel hors ligne, dès le premier lancement (grâce aux replis intégrés dans `index.html`) et à tout lancement ultérieur.

⚠️ **Note pour les mises à jour** : `CACHE_VERSION` dans `sw.js` doit être bumpé à chaque changement de fichier listé dans `SHELL_ASSETS` (sinon les appareils déjà installés continueront de servir l'ancienne version de l'app shell depuis le cache). Ce n'est pas encore automatisé — à faire manuellement en même temps que `APP_VERSION` dans `index.html`.

## Architecture des données (patterns.json + strings.json)

Depuis la v1.1.0 (patterns) et la v1.2.0 (textes d'interface), le contenu ne vit plus dans `index.html` — il est externalisé dans deux fichiers JSON, chargés et mis en cache selon la même logique :

1. **Au démarrage**, l'app affiche immédiatement les données du cache `localStorage` si présentes et valides ; sinon elle utilise un repli intégré directement dans `index.html` (identique aux fichiers JSON au moment du build) — l'app est donc **utilisable hors ligne dès le premier lancement**, sans dépendre du réseau.
2. **En arrière-plan**, l'app tente de récupérer `patterns.json` et `strings.json` (chacun avec un délai d'expiration de 6 secondes, indépendamment l'un de l'autre). Si la version récupérée diffère de celle en cache, l'affichage et le cache se mettent à jour silencieusement, sans interrompre une séance en cours.
3. **Toute lecture du `localStorage` est validée strictement** avant utilisation (`validatePatternsData` / `validateStringsData`) : types, bornes numériques, formats d'identifiants (liste blanche), intégrité référentielle, et détection de tentative de pollution de prototype. Une entrée invalide ou corrompue est purgée automatiquement et remplacée par le repli sécuritaire — l'app ne fait jamais confiance aveuglément à une donnée stockée localement.
4. Le rendu du menu n'utilise plus `innerHTML` pour insérer du contenu dynamique (noms/descriptions) — uniquement `textContent` / construction DOM, ce qui neutralise toute tentative d'injection même si elle passait la validation.

Pour ajouter ou modifier une technique : éditer `patterns.json`, incrémenter `dataVersion`, et pousser. Pour ajouter une langue d'interface : éditer `strings.json` (ajouter le code dans `languages` et les textes correspondants dans `strings`), incrémenter `dataVersion`. Dans les deux cas, les appareils déjà installés se mettront à jour au prochain lancement avec accès réseau.

## Déploiement (GitHub Pages)

1. Repo public → **Settings → Pages**
2. Source : *Deploy from a branch* → `main` → `/ (root)`
3. Custom domain : `breath.lemieuxsamson.com` (déjà configuré via le fichier `CNAME`)
4. Chez le fournisseur DNS du domaine, ajouter un enregistrement :
   ```
   CNAME   breath   <utilisateur-github>.github.io
   ```
5. Une fois le DNS propagé, GitHub provisionne automatiquement un certificat HTTPS (Let's Encrypt)

## Installer sur iPhone

1. Ouvrir `https://breath.lemieuxsamson.com` dans **Safari** (obligatoire — pas dans une app tierce)
2. Bouton de partage → **Sur l'écran d'accueil**
3. L'icône installée se lance en plein écran, sans barre d'adresse, comme une app native

## Notes techniques

- Aucune dépendance externe (pas de CDN, pas de framework)
- Le son utilise la Web Audio API (bruit filtré généré en mémoire, pas de fichier `.mp3`/`.wav`)
- Persistance via `localStorage` : langue choisie, cache des patterns (voir section Architecture ci-dessus) — toujours avec repli silencieux si indisponible ou invalide

## Contribuer / Suggestions

Une idée de technique ou de fonctionnalité ? [Ouvrir une suggestion sur GitHub Issues](https://github.com/lemieuxsamson/breathwork-app/issues/new) — aussi accessible directement depuis le menu de l'app.

## Versions

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique complet des versions. Ce projet suit le [versionnage sémantique](https://semver.org/lang/fr/).

**Pour publier une nouvelle version**, `package.json` est la source unique de vérité — ne jamais modifier `APP_VERSION`, `CACHE_VERSION` ou le badge du README à la main :

```bash
npm version patch   # 1.4.1 -> 1.4.2 (correctif)
npm version minor   # 1.4.1 -> 1.5.0 (nouvelle fonctionnalité)
npm version major   # 1.4.1 -> 2.0.0 (changement important)
```

Cette commande bump `package.json`, synchronise automatiquement `index.html`, `sw.js` et `README.md` (via `scripts/sync-version.js`), crée un commit et un tag git — il ne reste plus qu'à pousser :

```bash
git push && git push --tags
```

N'oublie pas d'ajouter une entrée à `CHANGELOG.md` avant de committer (ça, ce n'est pas automatisé — et ne devrait probablement pas l'être).

## Avertissement

Les techniques présentées (notamment Wim Hof) impliquent de l'hyperventilation contrôlée et des rétentions respiratoires. Ne jamais pratiquer dans l'eau, en conduisant, ou debout sans supervision. Déconseillé en cas de grossesse, d'épilepsie ou de troubles cardiovasculaires. Cette application est un outil de guidage, pas un avis médical.

## Licence

Projet distribué sous licence [MIT](LICENSE) — libre de copier, modifier et redistribuer, y compris à des fins commerciales, à condition de conserver la mention de copyright.

