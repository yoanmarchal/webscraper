# Requirements Document

## Introduction

Ce document définit le système d'héritage de propriétés pour les blocs voxel de l'éditeur de village 3D.

L'idée centrale est qu'un bloc placé à côté d'un ou plusieurs blocs existants ne doit pas apparaître comme un objet indépendant : il doit s'intégrer à son voisinage. Les blocs les plus anciens (les premiers posés) jouent le rôle de *parents* — ils transmettent leur couleur, leur style décoratif et leur identité visuelle aux blocs *enfants* placés ultérieurement. Plus deux blocs adjacents partagent la même identité, plus leur jonction est effacée : plus de corniche entre deux murs d'un même mur, plus de quoins visibles au point de contact, continuité de surface.

En parallèle, la logique décorative actuellement copiée-collée entre `StandardCell` et `WallWithWindowCell` (quoins, pierres apparentes, plinthes) est centralisée dans un module partagé.

---

## Glossary

- **PropertyInheritanceSystem** : le module qui calcule les propriétés héritées d'un bloc à partir de ses voisins.
- **GridCell** : structure de données représentant une cellule de la grille voxel — coordonnées (x, y, z), état occupé, type de bloc, couleur optionnelle, ordre de placement.
- **placementOrder** : entier croissant (≥ 0) ajouté à `GridCell`. Il est incrémenté à chaque appel à `addBlock`. Les valeurs basses représentent les blocs les plus anciens. Une cellule non occupée porte la valeur sentinelle `-1`.
- **PropertyBundle** : ensemble de propriétés visuelles calculées d'un bloc : `{ color: string, decorationStyle: DecorationStyle, mergeFlags: MergeFlags }`.
- **DecorationStyle** : enum à trois valeurs — `PLAIN` (aucune décoration), `STONE` (quoins + pierres apparentes + plinthe), `TOWER` (bandes cylindriques). Le style `TOWER` s'applique à toute cellule appartenant à une colonne de tour (`isTowerColumn` = true), c'est-à-dire une colonne dont au moins un étage est isolé horizontalement.
- **MergeFlags** : ensemble de booléens indiquant quels éléments de jonction doivent être supprimés pour un bloc donné : `{ suppressCornice: boolean, suppressQuoin: Record<Corner, boolean>, suppressBaseTrim: Record<Face, boolean> }`.
- **Corner** : identificateur d'un coin — `backLeft | backRight | frontLeft | frontRight`.
- **Face** : identificateur d'une face horizontale — `front | back | left | right`.
- **AdjacentNeighbor** : bloc occupé partageant une face horizontale (±X ou ±Z) au même niveau Y.
- **CellLookup** : dictionnaire `{ [clé: string]: GridCell }` permettant l'accès O(1) aux cellules par coordonnées.
- **InheritanceWeight** : score numérique calculé pour chaque voisin parent candidat. Plus le poids est élevé, plus le voisin influence le bloc enfant.
- **buildingId** : identifiant de bâtiment calculé par `getBuildingId(x, z, gridWidth)` — deux cellules partageant le même `buildingId` sont considérées comme appartenant au même bâtiment aux fins de la fusion visuelle.
- **deterministicColorSeed** : valeur entière calculée uniquement à partir des coordonnées (x, y, z) d'une cellule, utilisée en lieu et place de `Math.random()` pour produire la variation de couleur de manière reproductible entre les rendus.

---

## Requirements

### Requirement 1: Modèle de données — champ `placementOrder`

**User Story:** En tant qu'éditeur, je veux que chaque bloc mémorise son ordre d'insertion, afin que le système puisse distinguer les blocs anciens (parents) des blocs récents (enfants).

#### Acceptance Criteria

1. THE `GridCell` SHALL exposer un champ `placementOrder` de type `number`, initialisé à `-1` à la création de la cellule.
2. THE `VillageGrid` SHALL maintenir un compteur interne `nextPlacementOrder` initialisé à `0` lors de la construction de l'instance.
3. WHEN `addBlock` ou `addBlockInColumn` est appelé sur une cellule non occupée, THE `VillageGrid` SHALL assigner au champ `placementOrder` de la cellule la valeur courante du compteur, puis incrémenter le compteur de `1`.
4. WHEN `removeBlock` est appelé, THE `VillageGrid` SHALL remettre `placementOrder` à `-1` sur la cellule retirée, sans modifier le compteur global.
5. WHEN `clear` est appelé, THE `VillageGrid` SHALL réinitialiser le compteur `nextPlacementOrder` à `0` et remettre `placementOrder` à `-1` sur toutes les cellules.
6. IF une cellule est déjà occupée au moment d'un appel à `addBlock`, THEN THE `VillageGrid` SHALL laisser le `placementOrder` existant inchangé.
7. THE `GridCell` SHALL exposer un champ `propertyBundle` de type `PropertyBundle | undefined`, utilisé pour stocker le résultat du calcul d'héritage. Ce champ est `undefined` jusqu'au premier appel à `recomputeProceduralLogic`.

---

### Requirement 2: Calcul du poids d'héritage

**User Story:** En tant que système, je veux calculer pour chaque voisin adjacent son influence sur un nouveau bloc, afin de déterminer qui transmet ses propriétés et dans quelle proportion.

#### Acceptance Criteria

1. THE `PropertyInheritanceSystem` SHALL calculer un `InheritanceWeight` pour chaque `AdjacentNeighbor` d'une cellule cible.
2. THE `PropertyInheritanceSystem` SHALL calculer l'`InheritanceWeight` d'un voisin selon la formule : `weight = ageBonus + adjacencyBonus`, où `ageBonus` est inversement proportionnel à `placementOrder` (bloc le plus ancien = bonus le plus élevé) et `adjacencyBonus` est proportionnel au nombre de faces partagées entre le voisin et la cible.
3. WHEN deux voisins ont un `placementOrder` identique, THE `PropertyInheritanceSystem` SHALL les traiter avec le même `ageBonus`.
4. THE `PropertyInheritanceSystem` SHALL normaliser les poids de tous les voisins candidats de sorte que leur somme soit égale à `1.0`. IF aucun voisin valide (avec `placementOrder` ≥ 0) n'existe, THEN THE `PropertyInheritanceSystem` SHALL traiter le cas de division par zéro en retournant directement un `PropertyBundle` par défaut basé sur la palette du bâtiment.
5. IF aucun voisin occupé n'existe, THEN THE `PropertyInheritanceSystem` SHALL retourner un `PropertyBundle` par défaut basé sur la palette du bâtiment (`getBuildingId`).
6. THE `PropertyInheritanceSystem` SHALL calculer les poids uniquement à partir de voisins dont le `placementOrder` est ≥ 0 (cellules effectivement occupées) ; les cellules avec `placementOrder = -1` ne sont jamais candidates.

---

### Requirement 3: Règles d'héritage de couleur

**User Story:** En tant qu'éditeur, je veux que la couleur d'un nouveau bloc soit dérivée de ses voisins, afin d'éviter les cassures de teinte entre blocs adjacents.

#### Acceptance Criteria

1. WHEN un bloc enfant est placé adjacent à un ou plusieurs blocs parents, THE `PropertyInheritanceSystem` SHALL calculer la couleur héritée comme une interpolation pondérée (par `InheritanceWeight`) des couleurs des parents.
2. WHEN un seul parent existe, THE `PropertyInheritanceSystem` SHALL appliquer la couleur du parent sans interpolation, puis y appliquer la variation déterministe définie par le `deterministicColorSeed` de la cellule enfant.
3. WHEN plusieurs parents existent avec des couleurs différentes, THE `PropertyInheritanceSystem` SHALL calculer la couleur interpolée dans l'espace RGB, puis y appliquer la variation déterministe définie par le `deterministicColorSeed` de la cellule enfant.
4. THE `PropertyInheritanceSystem` SHALL calculer le `deterministicColorSeed` exclusivement à partir des coordonnées (x, y, z) de la cellule enfant, sans faire appel à `Math.random()`, afin de garantir la reproductibilité de la couleur à chaque recalcul.
5. IF tous les voisins partagent le même `buildingId`, THEN THE `PropertyInheritanceSystem` SHALL utiliser directement la couleur de palette associée à ce `buildingId` sans interpolation coûteuse, en appliquant toutefois la variation déterministe basée sur les coordonnées de la cellule enfant.

---

### Requirement 4: Règles d'héritage du style décoratif

**User Story:** En tant qu'éditeur, je veux que le style de décoration (pierre, tour, plain) d'un bloc soit cohérent avec ses voisins dominants, afin que les bâtiments aient un aspect uniforme.

#### Acceptance Criteria

1. THE `PropertyInheritanceSystem` SHALL attribuer un `DecorationStyle` à chaque bloc en sélectionnant le style du voisin ayant l'`InheritanceWeight` le plus élevé (règle du « parent dominant »).
2. WHEN un bloc appartient à une colonne de tour (`isTowerColumn` = true), THE `PropertyInheritanceSystem` SHALL lui attribuer le style `TOWER`, indépendamment du style de tout voisin ou groupe — la règle de colonne de tour a priorité absolue sur les règles d'héritage de style.
3. WHEN un bloc n'appartient pas à une colonne de tour et n'a aucun voisin, THE `PropertyInheritanceSystem` SHALL lui attribuer le style `STONE` par défaut.
4. WHEN un bloc rejoint un groupe de voisins dont le style dominant est `STONE`, THE `PropertyInheritanceSystem` SHALL lui attribuer le style `STONE`.
5. WHEN un bloc rejoint un groupe de voisins dont le style dominant est `PLAIN`, THE `PropertyInheritanceSystem` SHALL lui attribuer le style `PLAIN`.
6. IF plusieurs parents ont le même `InheritanceWeight` maximal mais des styles différents, THEN THE `PropertyInheritanceSystem` SHALL sélectionner le style du parent ayant le `placementOrder` le plus bas (le plus ancien).

---

### Requirement 5: Fusion visuelle — suppression de la corniche entre blocs adjacents

**User Story:** En tant qu'éditeur, je veux que la corniche (cornicheTop / cornicheMiddle) disparaisse entre deux murs adjacents partageant la même identité visuelle, afin d'éviter une cassure visuelle entre eux.

#### Acceptance Criteria

1. THE `PropertyInheritanceSystem` SHALL calculer un booléen `MergeFlags.suppressCornice` global pour chaque bloc (la corniche est un élément horizontal couvrant toute la face supérieure de la cellule).
2. WHEN un bloc possède au moins un voisin adjacent (même Y) partageant le même `buildingId` et le même `DecorationStyle`, THE `PropertyInheritanceSystem` SHALL positionner `suppressCornice` à `true` pour ce bloc — même si d'autres voisins ne partagent pas ces propriétés.
3. WHEN aucun voisin adjacent ne partage le même `buildingId` et le même `DecorationStyle`, THE `PropertyInheritanceSystem` SHALL positionner `suppressCornice` à `false`.
4. WHEN `suppressCornice` est `true`, THE `StandardCell` SHALL supprimer complètement les deux éléments `cornicheTop` et `cornicheMiddle`, indépendamment de leur état individuel.
5. WHEN `suppressCornice` est `false`, THE `StandardCell` SHALL rendre les corniches normalement.

---

### Requirement 6: Fusion visuelle — suppression des quoins aux jonctions

**User Story:** En tant qu'éditeur, je veux que les pierres d'angle (quoins) disparaissent au point de contact entre deux blocs de même famille, afin de créer une continuité de surface sans joint visible.

#### Acceptance Criteria

1. THE `PropertyInheritanceSystem` SHALL calculer `MergeFlags.suppressQuoin` pour chacun des quatre coins (`Corner`) d'un bloc indépendamment.
2. WHEN les deux voisins adjacents à un coin partagent le même `buildingId` que le bloc courant, THE `PropertyInheritanceSystem` SHALL positionner `suppressQuoin[corner]` à `true` uniquement pour ce coin.
3. WHEN au moins un des voisins adjacents à un coin ne partage pas le même `buildingId`, THE `PropertyInheritanceSystem` SHALL positionner `suppressQuoin[corner]` à `false` uniquement pour ce coin, sans affecter les autres coins.
4. WHEN `suppressQuoin[corner]` est `true`, THE `StandardCell` et THE `WallWithWindowCell` SHALL ne pas rendre le quoin correspondant à ce coin.
5. WHEN `suppressQuoin[corner]` est `false`, THE `StandardCell` et THE `WallWithWindowCell` SHALL rendre le quoin normalement selon la règle d'exposition existante (le coin doit aussi être exposé pour que le quoin soit rendu).

---

### Requirement 7: Fusion visuelle — suppression de la plinthe aux jonctions

**User Story:** En tant qu'éditeur, je veux que la plinthe de base (baseTrim) soit supprimée sur les faces en contact avec un voisin de même famille, pour éviter un trait de séparation à la base des murs.

#### Acceptance Criteria

1. THE `PropertyInheritanceSystem` SHALL calculer `MergeFlags.suppressBaseTrim` pour chacune des quatre faces (`Face`) d'un bloc indépendamment.
2. WHEN un bloc possède un voisin adjacent (même Y) partageant le même `buildingId` sur une face donnée, THE `PropertyInheritanceSystem` SHALL positionner `suppressBaseTrim[face]` à `true` pour cette face uniquement.
3. WHEN aucun voisin adjacent ne partage le même `buildingId` sur une face donnée, THE `PropertyInheritanceSystem` SHALL positionner `suppressBaseTrim[face]` à `false` pour cette face uniquement, sans affecter les autres faces.
4. WHEN `suppressBaseTrim[face]` est `true` pour une face, THE `StandardCell` et THE `WallWithWindowCell` SHALL ne pas rendre l'élément `baseTrim` sur cette face. Cette règle de suppression s'applique universellement dès que le flag est `true`, indépendamment de tout autre état.
5. WHEN `suppressBaseTrim[face]` est `false`, THE `StandardCell` et THE `WallWithWindowCell` SHALL rendre la plinthe normalement sur cette face.

---

### Requirement 8: Priorité en cas de conflit entre parents

**User Story:** En tant que système, je veux une règle de priorité déterministe quand plusieurs parents ont le même poids, afin d'éviter tout comportement non déterministe à la reconstruction de la scène.

#### Acceptance Criteria

1. THE `PropertyInheritanceSystem` SHALL appliquer la règle de priorité suivante en cas d'égalité de poids : le parent ayant le `placementOrder` le plus bas (le plus ancien) l'emporte.
2. IF deux parents ont le même `placementOrder` (cas défensif), THEN THE `PropertyInheritanceSystem` SHALL les départager par ordre lexicographique croissant de leur clé de cellule (`cellKey`) — le parent ayant la clé lexicographiquement la plus petite l'emporte, sans qu'aucun autre facteur puisse remplacer cette règle.
3. THE `PropertyInheritanceSystem` SHALL produire un résultat identique pour les mêmes entrées (`CellLookup` + coordonnées cibles), indépendamment de l'ordre de parcours interne du dictionnaire.

---

### Requirement 9: Centralisation de la logique décorative partagée

**User Story:** En tant que développeur, je veux que la logique de rendu des quoins, pierres apparentes et plinthes soit définie dans un seul endroit, afin d'éliminer la duplication entre `StandardCell` et `WallWithWindowCell`.

#### Acceptance Criteria

1. THE `PropertyInheritanceSystem` SHALL exposer une fonction utilitaire `renderSharedDecorations(cell, lookup, mergeFlags, colors)` retournant les éléments JSX des quoins, pierres apparentes et plinthe.
2. THE `StandardCell` SHALL utiliser `renderSharedDecorations` à la place de son implémentation locale de `renderQuoins`, `renderStonePatches` et `renderBaseTrim`.
3. THE `WallWithWindowCell` SHALL utiliser `renderSharedDecorations` à la place de son implémentation locale de `renderQuoins`, `renderStonePatches` et `renderBaseTrim`.
4. WHEN `renderSharedDecorations` est appelé avec un `MergeFlags` donné, THE `PropertyInheritanceSystem` SHALL appliquer les suppressions définies par ce flag avant de retourner les éléments.
5. THE `PropertyInheritanceSystem` SHALL produire un résultat visuellement identique à l'implémentation actuelle lorsque tous les champs de `MergeFlags` sont `false` (aucune suppression active).
6. THE `ArchCell` SHALL ne pas utiliser `renderSharedDecorations` : son rendu est entièrement spécifique et ne partage pas la logique de quoins ni de plinthe avec les cellules de mur.

---

### Requirement 10: Recalcul à chaque modification de la grille

**User Story:** En tant qu'éditeur, je veux que les propriétés héritées soient recalculées automatiquement lors de tout ajout ou retrait de bloc, afin que la scène reste cohérente en temps réel.

#### Acceptance Criteria

1. WHEN `addBlock`, `addBlockInColumn` ou `removeBlock` est appelé, THE `VillageGrid` SHALL déclencher un recalcul complet des `PropertyBundle` pour tous les blocs occupés via `recomputeProceduralLogic`. IF le recalcul échoue, THE `VillageGrid` SHALL néanmoins conserver la modification de grille (ajout ou retrait du bloc) et laisser les `propertyBundle` existants dans leur dernier état valide.
2. THE `PropertyInheritanceSystem` SHALL être appelé pendant `recomputeProceduralLogic` après le calcul du type de bloc (`BlockType`) et de la couleur de base.
3. THE `PropertyInheritanceSystem` SHALL stocker le `PropertyBundle` calculé dans le champ `propertyBundle` de la `GridCell` correspondante.
4. WHEN la scène est rendue, THE `CellMesh` SHALL lire le `PropertyBundle` depuis la `GridCell` et le transmettre au composant de cellule approprié.
5. IF `propertyBundle` est `undefined` sur une cellule occupée (cellule non encore calculée), THEN THE `CellMesh` SHALL utiliser le comportement de rendu par défaut actuel, sans appliquer d'héritage.
6. WHEN `removeBlock` est appelé, THE `VillageGrid` SHALL remettre `propertyBundle` à `undefined` sur la cellule retirée.

---

### Requirement 11: Propriétés de correction à tester

**User Story:** En tant que développeur, je veux un ensemble de propriétés vérifiables pour garantir la correction du système d'héritage, afin de prévenir les régressions lors des évolutions futures.

#### Acceptance Criteria

1. FOR ALL blocs avec zéro voisin occupé et `isTowerColumn` = false, THE `PropertyInheritanceSystem` SHALL retourner un `PropertyBundle` dont la couleur correspond à la couleur de palette brute du bâtiment (`getPaletteByIndex(getBuildingId(...))`) après application de la variation déterministe uniquement (propriété d'invariance des blocs isolés non-tour).
2. FOR ALL paires de blocs adjacents partageant le même `buildingId`, THE `PropertyInheritanceSystem` SHALL retourner un `MergeFlags` tel que `suppressCornice` est `true`, `suppressQuoin[corner]` est `true` pour les coins à leur jonction, et `suppressBaseTrim[face]` est `true` sur la face de jonction (propriété de fusion complète entre jumeaux de palette).
3. FOR ALL appels successifs à `PropertyInheritanceSystem` avec le même `CellLookup` et les mêmes coordonnées cibles, THE `PropertyInheritanceSystem` SHALL produire le même `PropertyBundle` (propriété d'idempotence).
4. WHEN `placementOrder` du bloc A est strictement inférieur à celui du bloc B et que A et B sont les seuls voisins l'un de l'autre, THE `PropertyInheritanceSystem` SHALL attribuer à B un `InheritanceWeight` pour A supérieur à l'`InheritanceWeight` que A aurait pour B dans la situation symétrique (propriété directionnelle de l'influence de l'ancienneté).
5. THE `placementOrder` counter SHALL être strictement croissant : pour tout ajout de deux blocs distincts A puis B dans cet ordre, `B.placementOrder > A.placementOrder` (propriété de monotonie du compteur).
6. WHEN un bloc est retiré puis ré-ajouté, THE `VillageGrid` SHALL attribuer au bloc ré-ajouté un `placementOrder` strictement supérieur à celui que ce bloc portait avant son retrait (propriété de non-réutilisation des ordres).
7. FOR ALL cellules dont `isTowerColumn` est `true`, THE `PropertyInheritanceSystem` SHALL retourner un `PropertyBundle` avec `decorationStyle = TOWER`, indépendamment des voisins (propriété de priorité du style tour).
8. FOR ALL cellules avec `decorationStyle = TOWER`, THE `MergeFlags.suppressCornice` SHALL être `true` et `MergeFlags.suppressBaseTrim` SHALL être `true` sur toutes les faces (propriété de suppression décorative totale pour les tours — les tours n'ont ni corniche ni plinthe).



