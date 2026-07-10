# Slash commands Claude Code

Commandes disponibles dans ce projet, invocables depuis Claude Code avec `/nom-de-la-commande`.

Les fichiers source sont dans `.claude/commands/`.

---

## `/create-theme <Nom>`

Génère un nouveau thème de questions complet et l'intègre au jeu.

**Usage**

```
/create-theme Astronomie
/create-theme Culture japonaise
```

**Ce que ça fait**

1. Déduit l'`id` (slug), le `name` et le `file` depuis l'argument.
2. Génère **150 questions** (15 par niveau de 1 à 10) pour un thème standard, ou **100 questions** (10/niveau) pour les formats spéciaux `plusoumoins` / `quisuisje`.
3. Applique la calibration relative au thème (1–2 = trivial, 9–10 = expert du thème).
4. Écrit `questions/<id>.json` au bon format (`{q, a}` texte brut, clés string `"1"`–`"10"`).
5. Valide la structure (comptes par niveau, doublons) via Python.
6. Présente un échantillon **sans les réponses** (le user joue au jeu) pour validation.
7. Met à jour `questions/index.json` avec la nouvelle entrée.
8. Commite une fois le user satisfait.

**Formats spéciaux**

- `plusoumoins` : chaque question doit contenir " ou " (ex. "Qui est le plus grand : A ou B ?")
- `quisuisje` : chaque question doit commencer par "Je suis…" et se terminer par "Qui suis-je ?"

---

## `/verify-theme [id]`

Audite la qualité d'un ou de tous les thèmes existants.

**Usage**

```
/verify-theme musique        ← audite uniquement musique.json
/verify-theme                ← audite tous les thèmes de l'index
```

**Ce que ça fait**

1. **Validation structurelle (Python)** : compte les questions par niveau (cible 15 ou 10), détecte les doublons de questions et de réponses, vérifie le format des thèmes spéciaux.
2. **Audit qualitatif** : lit les questions et signale les problèmes de calibrage (question trop facile pour son niveau ou trop difficile), les erreurs factuelles apparentes, les doublons sémantiques (même fait reformulé à deux niveaux différents), les formulations problématiques.
3. **Rapport structuré** par thème : `[OK]` ou `[ERREURS]` avec détail.
4. Propose des corrections ciblées et demande confirmation avant d'écrire quoi que ce soit.
