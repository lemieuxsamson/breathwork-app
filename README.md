# Respiration 🌬️

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

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

## Structure du dépôt

```
.
├── index.html       # Application complète (HTML + CSS + JS, fichier unique)
├── manifest.json    # Manifeste PWA (nom, icônes, couleurs, mode standalone)
├── icon-*.png       # Icônes de l'application (180/192/512 px)
├── favicon-32.png   # Favicon
└── CNAME            # Domaine personnalisé pour GitHub Pages
```

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

- Aucune dépendance externe (pas de CDN, pas de framework) — un seul fichier `index.html` autonome
- Le son utilise la Web Audio API (bruit filtré généré en mémoire, pas de fichier `.mp3`/`.wav`)
- Persistance légère via `localStorage` (langue choisie) avec repli silencieux si indisponible

## Avertissement

Les techniques présentées (notamment Wim Hof) impliquent de l'hyperventilation contrôlée et des rétentions respiratoires. Ne jamais pratiquer dans l'eau, en conduisant, ou debout sans supervision. Déconseillé en cas de grossesse, d'épilepsie ou de troubles cardiovasculaires. Cette application est un outil de guidage, pas un avis médical.

## Licence

Projet distribué sous licence [MIT](LICENSE) — libre de copier, modifier et redistribuer, y compris à des fins commerciales, à condition de conserver la mention de copyright.

