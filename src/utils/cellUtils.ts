import type { GridCell } from '../types';
import { EDGE_R, FLAT_LIMIT } from '../config/protectedAreasConfig';

export type CellLookup = Record<string, GridCell>;

// ── Shape inheritance system ─────────────────────────────────────────────────
//
// A cell's corners are rounded based on whether it has neighbours.
// Each corner is identified by (dx, dz) = (±1, ±1).
// A corner is "open" (rounded) when BOTH adjacent horizontal neighbours are absent.
// A corner is "closed" (sharp, radius ≈ 0) when either adjacent neighbour exists.
//
// This gives naturally rounded towers for isolated blocks and squared-off
// corners where cells join into a larger mass.

export interface CornerRadii {
  /** corner (-X, -Z) */
  backLeft:   number;
  /** corner (+X, -Z) */
  backRight:  number;
  /** corner (-X, +Z) */
  frontLeft:  number;
  /** corner (+X, +Z) */
  frontRight: number;
  /** convenience: max of all four (use for RoundedBox fallback) */
  max: number;
  /** true when all four corners have the same radius */
  uniform: boolean;
}

const ROUNDED = 0.40;   // radius for an open (exposed) corner — très arrondi
const SHARP   = 0.0;    // radius for a joined (interior) corner — parfaitement carré

/**
 * Returns per-corner radii for a cell based on its horizontal neighbours.
 * Isolated cells get fully rounded corners (tower / pillar look).
 * Cells in a group get sharp corners where they touch neighbours and
 * rounded corners on their exposed extremities.
 */
export function getCornerRadii(lookup: CellLookup, cell: GridCell): CornerRadii {
  const hasL = hasOccupiedCell(lookup, cell.x - 1, cell.y, cell.z);
  const hasR = hasOccupiedCell(lookup, cell.x + 1, cell.y, cell.z);
  const hasF = hasOccupiedCell(lookup, cell.x,     cell.y, cell.z + 1);
  const hasB = hasOccupiedCell(lookup, cell.x,     cell.y, cell.z - 1);

  // FINAL CONSERVATIVE LOGIC - only round corners that are truly exposed
  // This is the safest approach that avoids unwanted rounding on adjacent walls
  const backLeft   = (!hasL && !hasB) ? ROUNDED : SHARP;
  const backRight  = (!hasR && !hasB) ? ROUNDED : SHARP;
  const frontLeft  = (!hasL && !hasF) ? ROUNDED : SHARP;
  const frontRight = (!hasR && !hasF) ? ROUNDED : SHARP;

  const max = Math.max(backLeft, backRight, frontLeft, frontRight);
  const uniform = backLeft === backRight && backRight === frontLeft && frontLeft === frontRight;

  return { backLeft, backRight, frontLeft, frontRight, max, uniform };
}

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

  // Si plus de voisins sur l'axe X, l'arche doit être orientée selon Z (pour enjambée l'axe X)
  // Si plus de voisins sur l'axe Z, l'arche doit être orientée selon X (pour enjambée l'axe Z)
  if (eastWest > northSouth) {
    return 'z';
  }
  if (northSouth > eastWest) {
    return 'x';
  }
  
  // Si égal, choisir en fonction de la position pour une cohérence visuelle
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

/**
 * Retourne true si cette cellule fait partie d'une colonne de tour ronde.
 *
 * Une colonne est "tour ronde" si n'importe quel étage de la colonne
 * (depuis la cellule courante jusqu'au sommet) est isolé horizontalement.
 * Cela propage la forme cylindrique vers le bas : si le sommet est une tour,
 * tous les blocs en dessous dans la même colonne (x, z) le sont aussi.
 */
export function isTowerColumn(lookup: CellLookup, cell: GridCell): boolean {
  // On remonte la colonne depuis y courant vers le haut
  let y = cell.y;
  while (true) {
    const current = getCell(lookup, cell.x, y, cell.z);
    if (!current?.isOccupied) break;          // fin de la colonne
    if (isIsolatedBlock(lookup, current)) return true;  // un étage isolé trouvé
    y += 1;
  }
  return false;
}

// =============================================================================
// Utilitaires de géométrie pour la projection sur les faces arrondies
// =============================================================================

// Ré-exporter pour maintenir la compatibilité avec les imports existants
export { EDGE_R, FLAT_LIMIT };

/**
 * Projette un point latéral t sur la surface réelle d'une face,
 * en tenant compte des coins arrondis.
 * 
 * @param t - Position latérale sur la face (-0.5 à 0.5)
 * @param cornerRoundedNeg - True si le coin côté t < 0 est arrondi
 * @param cornerRoundedPos - True si le coin côté t > 0 est arrondi
 * @returns { surfaceZ, rotY } - Profondeur réelle sur la face et rotation tangente
 * 
 * Dans le repère local de la face :
 * - t : position latérale (-0.5 à 0.5)
 * - surfaceZ : profondeur de sortie (0 = centre, 0.5 = surface plate)
 * - rotY : rotation tangente pour aligner avec la surface
 */
export function projectOnFace(
  t: number,
  cornerRoundedNeg: boolean,
  cornerRoundedPos: boolean,
): { surfaceZ: number; rotY: number } {
  if (t > FLAT_LIMIT && cornerRoundedPos) {
    // Zone de coin arrondi côté positif
    const dx = Math.min(t - FLAT_LIMIT, EDGE_R);
    const theta = Math.asin(dx / EDGE_R);
    return {
      surfaceZ: FLAT_LIMIT + EDGE_R * Math.cos(theta),
      rotY: theta,
    };
  } else if (t < -FLAT_LIMIT && cornerRoundedNeg) {
    // Zone de coin arrondi côté négatif
    const dx = Math.max(t + FLAT_LIMIT, -EDGE_R);
    const theta = Math.asin(dx / EDGE_R);
    return {
      surfaceZ: FLAT_LIMIT + EDGE_R * Math.cos(theta),
      rotY: theta,
    };
  }
  // Zone plate (pas de coin arrondi)
  return { surfaceZ: 0.5, rotY: 0 };
}
