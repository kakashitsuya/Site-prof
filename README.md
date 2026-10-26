# Mon espace de classe

Site statique (HTML/CSS/JS, sans dépendance) pour le professeur de maths :

- **Ma semaine** : progression annuelle 6e / 5e / 4e (32 semaines de 4 h, congés, régulations, devoirs de niveau), taux d'exécution et suivi avance/retard.
- **Photo parlante** (`photo-parlante.html`) : anime un portrait au rythme d’une voix (fichier audio ou micro) — la bouche s’ouvre selon le volume, les yeux clignent, la tête bouge légèrement — et exporte une vidéo (mp4 ou webm). Le visage est repéré par MediaPipe Face Landmarker, chargé depuis un CDN ; sinon on place la bouche à la main. Rien n’est envoyé sur Internet.
- **Notes et classement** : classes, élèves, évaluations par trimestre (coef, barème), moyennes, rangs, appréciations, export/restauration.

Les données restent dans le navigateur (`localStorage`). Ouvrir `index.html` suffit ; pour le mettre en ligne, activer GitHub Pages sur la racine de la branche.
