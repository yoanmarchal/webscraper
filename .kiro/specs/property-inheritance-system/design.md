# Design Document

## Système d'héritage de propriétés des blocs voxel

---

## Overview

Ce document décrit l'architecture technique du `PropertyInheritanceSystem` — le module qui calcule, pour chaque bloc occupé de la grille, un `PropertyBundle` contenant sa couleur héritée, son style décoratif et ses drapeaux de fusion visuelle.

Le design s'articule autour de trois axes :

1. **Enrichissement du modèle de données** : ajout de `placementOrder` et `propertyBundle` sur `GridCell`, et d'un compteur `nextPlacementOrder` sur `VillageGrid`.
2. **Nouveau module `PropertyInheritanceSystem`** : calcul pur des `PropertyBundle` à partir d'un `CellLookup` et des coordonnées cibles.
3. **Centralisation de la logique décorative** : la fonction `renderSharedDecorations` remplace les implémentations dupliquées de `renderQuoins`, `renderStonePatches` et `renderBaseTrim` dans `StandardCell` et `WallWithWindowCell`.

---

## Architecture

### Vue d'ensemble des modules

```
src/
├── types.ts                          ← +placementOrder, +propertyBundle sur GridCell
│                                       +DecorationStyle enum
│                                       +MergeFlags, PropertyBundle types
├── villageGrid.ts                    ← +nextPlacementOrder counter
│                                       addBlock/addBlockInColumn/removeBlock/clear mis à jour
│                                       recomputeProceduralLogic appelle PropertyInheritanceSystem
├── propertyInheritance.ts            ← NOUVEAU module principal
│   ├── computePropertyBundle()       ← entrée publique : (CellLookup, x, y, z, gridWidth) → PropertyBundle
│   ├── computeInheritanceWeights()   ← calcul et normalisation des poids
│   ├── interpolateColor()            ← interpolation RGB pondérée
│   ├── applyDeterministicVariation() ← variation reproductible (remplace Math.random())
│   ├── computeMergeFlags()           ← suppressCornice, suppressQuoin, suppressBaseTrim
│   └── renderSharedDecorations()     ← JSX partagé quoins+patches+baseTrim
└── components/cells/
    ├── StandardCell.tsx              ← utilise renderSharedDecorations, lit PropertyBundle
    └── WallWithWindowCell.tsx        ← utilise renderSharedDecorations, lit PropertyBundle
```

---

## Types et modèle de données

### Ajouts dans `types.ts`

```typescript
// Enum centralisé — remplace le style implicite (isIsolated) actuel
export enum DecorationStyle {
  PLAIN = 'PLAIN',   // Aucune décoration (mur intérieur)
  STONE = 'STONE',   // Quoins + pierres apparentes + plinthe (mur standard)
  TOWER = 'TOWER',   // Bandes cylindriques (colonne de tour)
}

// Identifiants de coins (4 coins horizontaux d'une cellule)
export type Corner = 'backLeft' | 'backRight' | 'frontLeft' | 'frontRight';

// Identifiants de faces horizontales
export type Face = 'front' | 'back' | 'left' | 'right';

// Drapeaux de fusion visuelle
export interface MergeFlags {
  suppressCornice: boolean;                    // Supprime cornicheTop + cornicheMiddle
  suppressQuoin: Record<Corner, boolean>;      // Supprime le quoin par coin
  suppressBaseTrim: Record<Face, boolean>;     // Supprime la plinthe par face
}

// Bundle de propriétés visuelles calculé pour un bloc
export interface PropertyBundle {
  color: string;                  // Couleur héritée et variée (#RRGGBB)
  decorationStyle: DecorationStyle;
  mergeFlags: MergeFlags;
}

// Enrichissement de GridCell
export interface GridCell {
  x: number;
  y: number;
  z: number;
  isOccupied: boolean;
  type: BlockType;
  color?: string;
  placementOrder: number;             // -1 = non occupé, ≥ 0 = ordre d'insertion
  propertyBundle?: PropertyBundle;    // undefined jusqu'au 1er recomputeProceduralLogic
}
```

### MergeFlags par défaut

```typescript
export const DEFAULT_MERGE_FLAGS: MergeFlags = {
  suppressCornice: false,
  suppressQuoin:   { backLeft: false, backRight: false, frontLeft: false, frontRight: false },
  suppressBaseTrim: { front: false, back: false, left: false, right: false },
};
```

---

## Module `propertyInheritance.ts`

### Interface publique

```typescript
/**
 * Calcule le PropertyBundle d'une cellule à partir de ses voisins.
 * Fonction pure : ne modifie aucun état.
 */
export function computePropertyBundle(
  lookup: CellLookup,
  x: number,
  y: number,
  z: number,
  gridWidth: number,
): PropertyBundle

/**
 * Utilitaire de rendu partagé entre StandardCell et WallWithWindowCell.
 * Retourne les éléments JSX pour quoins, pierres apparentes et plinthe,
 * avec suppressions appliquées selon mergeFlags.
 */
export function renderSharedDecorations(
  cell: GridCell,
  lookup: CellLookup,
  mergeFlags: MergeFlags,
  colors: { quoin: string; patch: string; trim: string },
): React.ReactNode
```

### Algorithme de `computePropertyBundle`

```
1. Collecter les 4 voisins adjacents horizontaux (même Y) avec placementOrder ≥ 0.

2. SI aucun voisin valide :
   → retourner PropertyBundle par défaut :
     - color = applyDeterministicVariation(getPaletteByIndex(getBuildingId(x,z,W)).primary, x,y,z)
     - decorationStyle = isTowerColumn ? TOWER : STONE
     - mergeFlags = DEFAULT_MERGE_FLAGS

3. Calculer InheritanceWeight pour chaque voisin :
   ageBonus       = maxOrder - voisin.placementOrder  (où maxOrder = max de tous les placementOrder)
   adjacencyBonus = 1  (un AdjacentNeighbor partage exactement 1 face)
   rawWeight      = ageBonus + adjacencyBonus

4. Normaliser : weight[i] = rawWeight[i] / Σ rawWeight

5. Calculer la couleur héritée :
   SI tous les voisins partagent le même buildingId :
     baseColor = getPaletteByIndex(buildingId).primary
   SINON :
     baseColor = interpolateColor(voisins, weights)  // RGB pondéré
   color = applyDeterministicVariation(baseColor, x, y, z)

6. Calculer le DecorationStyle :
   SI isTowerColumn(lookup, cell) : style = TOWER
   SINON : style = style du voisin avec le poids le plus élevé
           (tie-break : placementOrder le plus bas, puis cellKey lexicographique)

7. Calculer MergeFlags :
   suppressCornice :
     true SI ∃ voisin adjacent avec même buildingId ET même decorationStyle (calculé à l'étape 6)
   suppressQuoin[corner] :
     true SI les 2 voisins dans la direction du coin partagent le même buildingId
     (backLeft  → voisins X- et Z-,  backRight  → X+ et Z-,
      frontLeft → X- et Z+,          frontRight → X+ et Z+)
   suppressBaseTrim[face] :
     true SI le voisin sur cette face partage le même buildingId

8. Retourner { color, decorationStyle, mergeFlags }
```

### Calcul du `deterministicColorSeed`

Pour garantir la reproductibilité sans `Math.random()`, la variation de couleur est calculée avec un hash déterministe basé uniquement sur (x, y, z) :

```typescript
function deterministicSeed(x: number, y: number, z: number): number {
  // Hash de Wang (entiers non signés 32-bit)
  let h = (x * 374761393 + y * 1103515245 + z * 2246822519) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return (h >>> 0) / 0xFFFFFFFF; // [0, 1]
}

function applyDeterministicVariation(color: string, x: number, y: number, z: number): string {
  const seed = deterministicSeed(x, y, z);
  const variation = (seed - 0.5) * 2 * 0.08; // ±8% max (cohérent avec maxVariation actuel)
  return varyColorBrightness(color, variation);
}
```

### Interpolation de couleur RGB

```typescript
function interpolateColor(
  neighbors: GridCell[],
  weights: number[],
): string {
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < neighbors.length; i++) {
    const hex = (neighbors[i].color ?? '#b8b8b8').replace('#', '');
    r += parseInt(hex.slice(0, 2), 16) * weights[i];
    g += parseInt(hex.slice(2, 4), 16) * weights[i];
    b += parseInt(hex.slice(4, 6), 16) * weights[i];
  }
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
```

---

## Modifications de `VillageGrid`

### Nouveau compteur

```typescript
private nextPlacementOrder: number = 0;
```

### `addBlock` / `addBlockInColumn`

Avant d'appeler `recomputeProceduralLogic()`, si la cellule n'est pas encore occupée :
```typescript
cell.placementOrder = this.nextPlacementOrder++;
cell.isOccupied = true;
```

### `removeBlock`

```typescript
cell.isOccupied = false;
cell.type = BlockType.Empty;
cell.color = undefined;
cell.placementOrder = -1;
cell.propertyBundle = undefined;
```

### `clear`

```typescript
this.nextPlacementOrder = 0;
// Pour chaque cellule : isOccupied=false, type=Empty, color=undefined,
//                        placementOrder=-1, propertyBundle=undefined
```

### `recomputeProceduralLogic` — intégration du système d'héritage

```typescript
// Après avoir calculé cell.type et cell.color :
const lookup = makeCellLookup(this.getOccupiedCells());
// ... boucle sur les cellules occupées ...
cell.propertyBundle = computePropertyBundle(lookup, cell.x, cell.y, cell.z, this.sizeX);
```

Le calcul du `PropertyBundle` s'exécute dans un bloc `try/catch` ; si une exception est levée, la modification de grille est conservée et les `propertyBundle` existants restent à leur dernière valeur valide.

### `createEmptyGrid` — initialisation

```typescript
grid[x][y][z] = {
  x, y, z,
  isOccupied: false,
  type: BlockType.Empty,
  placementOrder: -1,
  propertyBundle: undefined,
};
```

---

## `renderSharedDecorations`

Cette fonction extrait et unifie le rendu dupliqué de `StandardCell` et `WallWithWindowCell`.

### Signature

```typescript
export function renderSharedDecorations(
  cell: GridCell,
  lookup: CellLookup,
  mergeFlags: MergeFlags,
  colors: { quoin: string; patch: string; trim: string },
): React.ReactNode
```

### Comportement

1. **Quoins** : rendu identique à l'implémentation actuelle, sauf que chaque coin est également soumis à `mergeFlags.suppressQuoin[corner]`. Si `suppressQuoin[corner]` est `true`, le groupe de meshes du coin est omis.

2. **Pierres apparentes** : logique de hash déterministe identique, pas affectée par `mergeFlags` (les patches ne se cachent pas aux jonctions — seulement les éléments de jonction structurels).

3. **Plinthe (baseTrim)** : itération sur les 4 faces, mais chaque face est soumise à `mergeFlags.suppressBaseTrim[face]`. Si `suppressBaseTrim[face]` est `true`, la plinthe de cette face est omise.

### Mapping `Corner` → `(dx, dz)`

```
backLeft   → dx=-1, dz=-1
backRight  → dx=+1, dz=-1
frontLeft  → dx=-1, dz=+1
frontRight → dx=+1, dz=+1
```

Les voisins adjacents à un coin `(dx, dz)` sont les cellules en `(x+dx, y, z)` et `(x, y, z+dz)`.

---

## Modifications de `StandardCell` et `WallWithWindowCell`

### `StandardCell` — mode non-tour (standard)

**Avant :**
```tsx
{renderQuoins()}
{renderStonePatches()}
{!isFoundation && renderBaseTrim()}
{!isFoundation && <cornicheTop/cornicheMiddle>}
```

**Après :**
```tsx
{decorationStyle === DecorationStyle.STONE && renderSharedDecorations(cell, lookup, mergeFlags, colors)}
{!isFoundation && !mergeFlags.suppressCornice && <cornicheTop/cornicheMiddle>}
```

- `decorationStyle` et `mergeFlags` sont extraits de `cell.propertyBundle` si défini, sinon on utilise les valeurs par défaut actuelles (rétrocompatibilité).
- La condition `!isFoundation` est maintenue : les fondations ne portent pas de corniche.

### `WallWithWindowCell` — mode non-tour (standard)

**Avant :**
```tsx
{renderQuoins()}
{renderStonePatches()}
{renderBaseTrim()}
```

**Après :**
```tsx
{decorationStyle === DecorationStyle.STONE && renderSharedDecorations(cell, lookup, mergeFlags, colors)}
```

### `ArchCell`

Aucune modification. `ArchCell` ne partage pas la logique décorative et n'utilise pas `renderSharedDecorations`.

---

## `CellMesh` — lecture du `PropertyBundle`

```tsx
export function CellMesh({ cell, toWorldPosition, lookup }: CellMeshProps) {
  const position = toWorldPosition(cell.x, cell.y, cell.z);
  const isTower = isTowerColumn(lookup, cell);
  const isIsolatedRoof = isIsolatedBlock(lookup, cell);

  // Lire le PropertyBundle depuis la cellule (peut être undefined)
  const bundle = cell.propertyBundle;

  if (cell.type === 'ROOF') {
    return <RoofCell cell={cell} position={position} lookup={lookup} isIsolated={isIsolatedRoof} />;
  }
  if (cell.type === 'ARCH') {
    return <ArchCell cell={cell} position={position} lookup={lookup} />;
  }
  if (cell.type === 'WALL_WINDOW') {
    return <WallWithWindowCell cell={cell} position={position} lookup={lookup}
      isIsolated={isTower} propertyBundle={bundle} />;
  }
  return <StandardCell cell={cell} position={position} lookup={lookup}
    isIsolated={isTower} propertyBundle={bundle} />;
}
```

Le `propertyBundle` est passé en prop optionnelle. Si `undefined`, les composants de cellule utilisent leur comportement par défaut actuel (rétrocompatibilité totale).

---

## Stratégie de déterminisme

Le système garantit un résultat identique pour les mêmes entrées par ces mécanismes :

1. **Hash déterministe** : `applyDeterministicVariation` utilise un hash de Wang basé sur (x, y, z) — pas de `Math.random()`.

2. **Tri stable pour le tie-breaking** : avant le calcul des poids, les voisins candidats sont triés par `cellKey` croissant. Ainsi, même si `Object.keys()` retourne les clés dans un ordre variable selon le moteur JS, le traitement est toujours dans le même ordre.

3. **Tie-breaking double** : en cas d'égalité de poids normalisés, priorité à `placementOrder` le plus bas, puis à `cellKey` lexicographique.

---

## Flux de données complet

```
Utilisateur clique → addBlock(x, y, z)
  │
  ├─ cell.placementOrder = nextPlacementOrder++
  ├─ cell.isOccupied = true
  └─ recomputeProceduralLogic()
       │
       ├─ Pour chaque cellule : calcul BlockType + color (logique existante)
       ├─ makeCellLookup(occupiedCells)
       └─ Pour chaque cellule occupée :
            cell.propertyBundle = computePropertyBundle(lookup, x, y, z, gridWidth)
              │
              ├─ collectNeighbors() → AdjacentNeighbors avec placementOrder ≥ 0
              ├─ computeInheritanceWeights() → poids normalisés
              ├─ interpolateColor() ou palette directe → baseColor
              ├─ applyDeterministicVariation() → color
              ├─ selectDecorationStyle() → DecorationStyle (TOWER prioritaire)
              └─ computeMergeFlags() → { suppressCornice, suppressQuoin, suppressBaseTrim }

Rendu React → CellMesh → StandardCell / WallWithWindowCell
  │
  ├─ lit cell.propertyBundle (color, decorationStyle, mergeFlags)
  └─ renderSharedDecorations(cell, lookup, mergeFlags, colors)
       ├─ renderQuoins() → filtre par suppressQuoin[corner]
       ├─ renderStonePatches() → hash déterministe
       └─ renderBaseTrim() → filtre par suppressBaseTrim[face]
```

---

## Tests (Requirement 11)

Les 8 propriétés de correction correspondent aux tests suivants, vérifiables en environnement Jest/Vitest sans DOM :

| # | Propriété | Type de test |
|---|-----------|--------------|
| 1 | Invariance blocs isolés non-tour | Test unitaire : grille 1 bloc, vérifie color = palette + variation déterministe |
| 2 | Fusion complète jumeaux de palette | Test unitaire : 2 blocs adjacents même buildingId, vérifie tous les flags à true |
| 3 | Idempotence | Test unitaire : appel 2× avec même lookup, compare résultats |
| 4 | Directionnalité ancienneté | Test unitaire : A (order=0) + B (order=1), vérifie weight(A→B) > weight(B→A) |
| 5 | Monotonie compteur | Test unitaire : addBlock A puis B, vérifie B.placementOrder > A.placementOrder |
| 6 | Non-réutilisation des ordres | Test unitaire : remove A, add A à nouveau, vérifie nouveau order > ancien |
| 7 | Priorité style tour | Test PBT : pour tout cell avec isTowerColumn=true → decorationStyle = TOWER |
| 8 | Suppression totale tours | Test PBT : pour tout cell avec decorationStyle=TOWER → suppressCornice=true, suppressBaseTrim toutes faces |

Les propriétés 7 et 8 se prêtent à du property-based testing (fast-check) : génération aléatoire de grilles, vérification des invariants sur l'ensemble des cellules.

---

## Considérations de performance

- `computePropertyBundle` est O(1) par cellule (4 voisins au plus).
- `recomputeProceduralLogic` reste O(n) avec n = cellules occupées.
- Le `makeCellLookup` est construit une seule fois par appel à `recomputeProceduralLogic`, pas une fois par cellule.
- La couleur de palette est mise en cache dans `buildingPalettes` (déjà présent dans `VillageGrid`).
