import type { GridCell } from '../types';

export type CellLookup = Record<string, GridCell>;

export function cellKey(x: number, y: number, z: number): string {
  return `${x}:${y}:${z}`;
}

export function makeCellLookup(cells: GridCell[]): CellLookup {
  return cells.reduce<CellLookup>((lookup, cell) => {
    lookup[cellKey(cell.x, cell.y, cell.z)] = cell;
    return lookup;
  }, {});
}

export function getCell(lookup: CellLookup, x: number, y: number, z: number): GridCell | null {
  return lookup[cellKey(x, y, z)] ?? null;
}

export function hasOccupiedCell(lookup: CellLookup, x: number, y: number, z: number): boolean {
  return getCell(lookup, x, y, z)?.isOccupied ?? false;
}

// Détecte la configuration du toit et son orientation
export function getRoofConfig(lookup: CellLookup, cell: GridCell): {
  axis: 'x' | 'z';
  hasLeft: boolean;
  hasRight: boolean;
  hasFront: boolean;
  hasBack: boolean;
  isCorner: boolean;
  isEnd: boolean;
} {
  const hasLeft = hasOccupiedCell(lookup, cell.x - 1, cell.y, cell.z);
  const hasRight = hasOccupiedCell(lookup, cell.x + 1, cell.y, cell.z);
  const hasFront = hasOccupiedCell(lookup, cell.x, cell.y, cell.z + 1);
  const hasBack = hasOccupiedCell(lookup, cell.x, cell.y, cell.z - 1);
  
  const eastWest = Number(hasLeft) + Number(hasRight);
  const northSouth = Number(hasFront) + Number(hasBack);
  
  // Détecte si c'est un coin (voisins perpendiculaires)
  const isCorner = (eastWest === 1 && northSouth === 1);
  
  // Détecte si c'est une extrémité (voisin sur un seul côté)
  const isEnd = (eastWest + northSouth === 1);
  
  const axis = eastWest > northSouth ? 'x' : 'z';
  
  return { axis, hasLeft, hasRight, hasFront, hasBack, isCorner, isEnd };
}

export function getArchAxis(lookup: CellLookup, cell: GridCell): 'x' | 'z' {
  const eastWest = Number(hasOccupiedCell(lookup, cell.x - 1, cell.y, cell.z)) + Number(hasOccupiedCell(lookup, cell.x + 1, cell.y, cell.z));
  const northSouth = Number(hasOccupiedCell(lookup, cell.x, cell.y, cell.z - 1)) + Number(hasOccupiedCell(lookup, cell.x, cell.y, cell.z + 1));

  if (eastWest >= northSouth) {
    return 'x';
  }

  return 'z';
}

// Détecte les faces exposées d'un bloc (sans voisin adjacent)
export function getExposedFaces(lookup: CellLookup, cell: GridCell): Array<'front' | 'back' | 'left' | 'right'> {
  const faces: Array<'front' | 'back' | 'left' | 'right'> = [];
  
  if (!hasOccupiedCell(lookup, cell.x, cell.y, cell.z + 1)) faces.push('front');  // Z+
  if (!hasOccupiedCell(lookup, cell.x, cell.y, cell.z - 1)) faces.push('back');   // Z-
  if (!hasOccupiedCell(lookup, cell.x - 1, cell.y, cell.z)) faces.push('left');   // X-
  if (!hasOccupiedCell(lookup, cell.x + 1, cell.y, cell.z)) faces.push('right');  // X+
  
  return faces;
}

// Détecte si un bloc est isolé (aucun voisin horizontal)
export function isIsolatedBlock(lookup: CellLookup, cell: GridCell): boolean {
  return !hasOccupiedCell(lookup, cell.x - 1, cell.y, cell.z) &&
         !hasOccupiedCell(lookup, cell.x + 1, cell.y, cell.z) &&
         !hasOccupiedCell(lookup, cell.x, cell.y, cell.z - 1) &&
         !hasOccupiedCell(lookup, cell.x, cell.y, cell.z + 1);
}
