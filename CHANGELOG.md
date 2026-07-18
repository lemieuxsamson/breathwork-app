# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

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
