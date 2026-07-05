import { RoundedBox } from '@react-three/drei';
import { projectOnFace } from './cellUtils';
import { JSX } from 'react/jsx-runtime';

export type CellFace = 'front' | 'back' | 'left' | 'right';

export interface CornerRadii {
  backLeft: number;
  backRight: number;
  frontLeft: number;
  frontRight: number;
}

export interface StoneSeedSalt {
  x: number;
  y: number;
  z: number;
  face: number;
  stone: number;
}

export interface StoneSize {
  width: number;
  height: number;
}

export interface StoneDistanceRange {
  xBase: number;
  /** Modulo (entier) appliqué au hash pour la distance latérale, pas x 0.01 */
  xModRange: number;
  yBase: number;
  /** Modulo (entier) appliqué au hash pour la distance verticale, pas x 0.01 */
  yModRange: number;
}

export interface StoneVisual {
  thickness: number;
  cornerRadius: number;
  smoothness?: number;
  color: string;
  roughness?: number;
  /** Metalness utilisé sur un mur plat */
  metalness?: number;
  /** Metalness spécifique à la tour isolée (sinon retombe sur `metalness`) */
  metalnessIsolated?: number;
}

export interface StonePatchesConfig {
  /** Seules x/y/z sont utilisées pour le hash déterministe */
  cell: { x: number; y: number; z: number };
  exposedFaces: CellFace[];
  /** Tour cylindrique isolée vs mur plat */
  isIsolated: boolean;
  radii: CornerRadii;
  /**
   * 'numeric' (par défaut) transmet le radius réel à projectOnFace.
   * 'boolean' le convertit en simple flag "coin arrondi ?" — utile si
   * seul l'angle (et non son amplitude) doit influencer la projection.
   */
  cornerMode?: 'numeric' | 'boolean';
  /** Rayon du cylindre utilisé pour la projection en mode tour isolée */
  towerRadius: number;
  /** Décalage fixe ajouté à la profondeur de surface sur un mur plat */
  wallSurfaceOffset: number;

  /**
   * 🔢 Nombre de pierres par face exposée.
   * C'est LE paramètre à modifier pour ajuster facilement la densité de
   * pierres. Par défaut : 3 + (|x*3 + z*7| % 3), soit 3 à 5 pierres.
   */
  stonesPerFace?: number | ((cell: { x: number; y: number; z: number }, faceIdx: number) => number);

  /** Sels de hash déterministe (laisser les valeurs par défaut sauf besoin spécifique) */
  seedSalt?: StoneSeedSalt;

  /** Taille de base des pierres avant variation */
  baseSize: StoneSize;
  /** Calcule la variation de taille pierre par pierre à partir du hash */
  computeSize?: (h1: number, h2: number, h3: number, base: StoneSize) => StoneSize;

  /** Plage de distance par rapport au centre de la face (évite le centre) */
  distance?: StoneDistanceRange;

  visual: StoneVisual;

  /**
   * 🔒 Sécurité : zone(s) protégée(s) — fenêtres, portes, quoins, bandes
   * déco, etc. Chaque appelant fournit SA propre logique métier ; une
   * pierre n'est jamais placée si cette fonction renvoie true. Ne JAMAIS
   * mutualiser cette fonction entre composants : leurs zones protégées
   * ne sont pas équivalentes.
   */
  isInProtectedZone: (face: CellFace, x: number, y: number, stoneWidth: number, stoneHeight: number) => boolean;
}

const DEFAULT_SEED_SALT: StoneSeedSalt = { x: 17, y: 31, z: 47, face: 23, stone: 59 };
const DEFAULT_DISTANCE: StoneDistanceRange = { xBase: 0.2, xModRange: 20, yBase: 0.18, yModRange: 18 };

function defaultComputeSize(_h1: number, h2: number, h3: number, base: StoneSize): StoneSize {
  return {
    width: base.width + (h2 % 5) * 0.018,
    height: base.height + (h3 % 4) * 0.012,
  };
}

function defaultStonesPerFace(cell: { x: number; z: number }): number {
  return 3 + (Math.abs(cell.x * 3 + cell.z * 7) % 3);
}

function getFaceCorners(
  face: CellFace,
  radii: CornerRadii,
  cornerMode: 'numeric' | 'boolean'
): [number | boolean, number | boolean] {
  const toVal = (r: number) => (cornerMode === 'boolean' ? r > 0.01 : r);
  switch (face) {
    case 'front':
      return [toVal(radii.frontLeft), toVal(radii.frontRight)];
    case 'back':
      return [toVal(radii.backLeft), toVal(radii.backRight)];
    case 'left':
      return [toVal(radii.backLeft), toVal(radii.frontLeft)];
    case 'right':
      return [toVal(radii.backRight), toVal(radii.frontRight)];
  }
}

const FACE_ANGLES: Record<CellFace, number> = {
  front: 0,
  back: Math.PI,
  right: Math.PI / 2,
  left: -Math.PI / 2,
};

/**
 * Génère les pierres apparentes (decoration STONE) communes à StandardCell
 * et WallWithWindowCell, pour une tour cylindrique isolée ou un mur plat.
 *
 * Centralise UNIQUEMENT la géométrie/le placement. La logique de zone
 * protégée reste fournie par l'appelant via `isInProtectedZone`, afin de ne
 * jamais affaiblir la sécurité de l'un en la fusionnant avec l'autre.
 */
export function renderStonePatches(config: StonePatchesConfig) {
  const {
    cell,
    exposedFaces,
    isIsolated,
    radii,
    cornerMode = 'numeric',
    towerRadius,
    wallSurfaceOffset,
    stonesPerFace,
    seedSalt = DEFAULT_SEED_SALT,
    baseSize,
    computeSize,
    distance = DEFAULT_DISTANCE,
    visual,
    isInProtectedZone,
  } = config;

  if (exposedFaces.length === 0) return null;

  const stones: JSX.Element[] = [];

  exposedFaces.forEach((face, faceIdx) => {
    const count =
      typeof stonesPerFace === 'function'
        ? stonesPerFace(cell, faceIdx)
        : stonesPerFace ?? defaultStonesPerFace(cell);

    const placedStones: { x: number; y: number; w: number; h: number }[] = [];

    for (let i = 0; i < count; i++) {
      const seed = Math.abs(
        cell.x * seedSalt.x +
          cell.y * seedSalt.y +
          cell.z * seedSalt.z +
          faceIdx * seedSalt.face +
          i * seedSalt.stone
      );
      const h1 = seed % 100;
      const h2 = (seed * 7 + 13) % 100;
      const h3 = (seed * 3 + 41) % 100;

      const { width: w, height: h } = computeSize
        ? computeSize(h1, h2, h3, baseSize)
        : defaultComputeSize(h1, h2, h3, baseSize);

      // Position dans les quadrants pour les 4 premiers, puis aléatoire (basé sur le hash)
      const quadrant = i % 4;
      const signX = i < 4 ? (quadrant === 0 || quadrant === 2 ? -1 : 1) : (h1 % 2 === 0 ? -1 : 1);
      const signY = i < 4 ? (quadrant === 0 || quadrant === 1 ? -1 : 1) : (h2 % 2 === 0 ? -1 : 1);
      const distX = distance.xBase + (h1 % distance.xModRange) * 0.01;
      const distY = distance.yBase + (h2 % distance.yModRange) * 0.01;
      const rawOffsetX = signX * distX;
      const rawOffsetY = signY * distY;

      // Alignement sur une grille (appareillage en quinconce)
      const rowHeight = baseSize.height * 1.25;
      const colWidth = baseSize.width * 1.15;
      
      const rowIndex = Math.round(rawOffsetY / rowHeight);
      const offsetY = rowIndex * rowHeight;
      
      const isEvenRow = Math.abs(rowIndex) % 2 === 0;
      const rowOffsetX = isEvenRow ? 0 : colWidth / 2;
      
      const colIndex = Math.round((rawOffsetX - rowOffsetX) / colWidth);
      const offsetX = colIndex * colWidth + rowOffsetX;

      // Anti-superposition avec les autres pierres de la même face
      const isOverlapping = placedStones.some(
        (stone) =>
          Math.abs(offsetX - stone.x) < (w + stone.w) / 2 + 0.01 &&
          Math.abs(offsetY - stone.y) < (h + stone.h) / 2 + 0.01
      );
      if (isOverlapping) {
        continue;
      }

      // 🔒 Sécurité : ne jamais placer une pierre dans une zone protégée
      if (isInProtectedZone(face, offsetX, offsetY, w, h)) {
        continue;
      }

      placedStones.push({ x: offsetX, y: offsetY, w, h });

      const key = `stone-${face}-${faceIdx}-${i}`;

      // ── Projection sur la surface réelle (mur plat ou arrondi) ────────
      // Utilise projectOnFace avec les radii réels pour épouser la courbure
      const [crNeg, crPos] = getFaceCorners(face, radii, cornerMode);
      let pos: [number, number, number] = [0, 0, 0];
      let rot: [number, number, number] = [0, 0, 0];

      switch (face) {
        case 'front': {
          const { surfaceZ, rotY } = projectOnFace(offsetX, crNeg as never, crPos as never);
          pos = [offsetX, offsetY, surfaceZ + wallSurfaceOffset];
          rot = [0, rotY, 0];
          break;
        }
        case 'back': {
          const { surfaceZ, rotY } = projectOnFace(offsetX, crNeg as never, crPos as never);
          pos = [offsetX, offsetY, -(surfaceZ + wallSurfaceOffset)];
          rot = [0, Math.PI - rotY, 0];
          break;
        }
        case 'left': {
          const { surfaceZ, rotY } = projectOnFace(offsetX, crNeg as never, crPos as never);
          pos = [-(surfaceZ + wallSurfaceOffset), offsetY, offsetX];
          rot = [0, Math.PI / 2 + rotY, 0];
          break;
        }
        case 'right': {
          const { surfaceZ, rotY } = projectOnFace(offsetX, crNeg as never, crPos as never);
          pos = [surfaceZ + wallSurfaceOffset, offsetY, offsetX];
          rot = [0, -(Math.PI / 2 + rotY), 0];
          break;
        }
      }

      stones.push(
        <mesh key={key} name={`stonePatch-${face}-${i}`} position={pos} rotation={rot} castShadow receiveShadow>
          <RoundedBox args={[w, h, visual.thickness]} radius={visual.cornerRadius} smoothness={visual.smoothness ?? 2}>
            <meshStandardMaterial
              color={visual.color}
              roughness={visual.roughness ?? 0.9}
              metalness={visual.metalness ?? 0}
            />
          </RoundedBox>
        </mesh>
      );
    }
  });

  return <>{stones}</>;
}
