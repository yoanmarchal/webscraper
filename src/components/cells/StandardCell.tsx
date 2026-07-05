import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { 
  getExposedFaces, 
  getCornerRadii,
  FACE_ROTATION_Y,
} from '../../utils/cellUtils';
import { shades } from '../../colorPalettes';
import { ShapedBox } from '../ShapedBox';
import { CellShell } from './CellShell';
import { STANDARD_PROTECTED_AREAS, checkInProtectedZones } from '../../config/protectedAreasConfig';
import { renderStonePatches as renderStonePatchesShared } from '../../utils/stonePatches';
import { isQuoinProtected } from '../../utils/cornerDecorations';

interface StandardCellProps {
  cell: GridCell;
  position: [number, number, number];
  lookup: CellLookup;
  isIsolated: boolean;
}

export function StandardCell({ cell, position, lookup, isIsolated }: StandardCellProps) {
  const isFoundation = cell.type === 'FOUNDATION';
  const baseColor = cell.color ?? (isFoundation ? '#8d8a80' : '#c0b0a0');
  const { patchColor, trimColor } = shades(baseColor, { patchColor: -0.15, trimColor: -0.08 });

  // ── Shape inheritance: corner radii driven by neighbours ──────────────────
  const radii = getCornerRadii(lookup, cell);

  // 🔢 Pour changer facilement le nombre de pierres par face : remplacer
  // `undefined` par un nombre fixe (ex: 5) ou une fonction (cell, faceIdx) => n.
  // `undefined` conserve le comportement d'origine (3 à 5 pierres selon seed).
  const STONES_PER_FACE: number | undefined = 10;

  const renderStonePatches = () => {
    const exposedFaces = getExposedFaces(lookup, cell);
    if (exposedFaces.length === 0) return null;

    // Seul le style STONE affiche les pierres apparentes
    const hasStoneStyle = cell.propertyBundle?.decorationStyle === 'STONE';
    if (!hasStoneStyle) return null;

    return renderStonePatchesShared({
      cell,
      exposedFaces,
      isIsolated,
      radii,
      // Utilise les radii réels pour que les pierres épousent la courbure
      cornerMode: 'numeric',
      towerRadius: 0.502,
      wallSurfaceOffset: 0.003,
      stonesPerFace: STONES_PER_FACE,
      baseSize: { width: 0.14, height: 0.09 },
      visual: {
        thickness: 0.012,
        cornerRadius: 0.004,
        smoothness: 2,
        color: patchColor,
        roughness: 0.95,
      },
      // 🔒 Zone protégée propre à StandardCell (quoins, base trim, etc.)
      isInProtectedZone: (face, x, y, w, h) => {
        if (checkInProtectedZones(STANDARD_PROTECTED_AREAS, x, y, w, h)) return true;
        if (isQuoinProtected(cell, lookup, isIsolated, face, x, w)) return true;
        return false;
      },
    });
  };

  const renderBaseTrim = () => {
    // Vérifier si nous devons supprimer toutes les plinthes
    if (cell.propertyBundle) {
      const { mergeFlags } = cell.propertyBundle;
      if (mergeFlags.suppressBaseTrim.front && mergeFlags.suppressBaseTrim.back &&
          mergeFlags.suppressBaseTrim.left && mergeFlags.suppressBaseTrim.right) {
        return null;
      }
    }

    const exposedFaces = getExposedFaces(lookup, cell);
    return exposedFaces.map((face, index) => {
      // Vérifier si cette face spécifique est supprimée
      if (cell.propertyBundle?.mergeFlags.suppressBaseTrim[face]) {
        return null;
      }

      return (
        <group key={`trim-${index}`} rotation={[0, FACE_ROTATION_Y[face], 0]}>
          <mesh name="baseTrim" position={[0, -0.46, 0.505]} castShadow receiveShadow>
            <RoundedBox args={[1.02, 0.08, 0.02]} radius={0.01} smoothness={2}>
              <meshStandardMaterial color={trimColor} roughness={0.9} />
            </RoundedBox>
          </mesh>
        </group>
      );
    });
  };

  // ── Rendu unifié (mur, tour, fondation) ────────────────────────────────────
  // La forme est entièrement pilotée par `radii` : coins exposés → arrondi,
  // coins joints → angle droit. Plus besoin de séparer isIsolated.
  return (
    <CellShell name="standardCell" cell={cell} position={position} lookup={lookup}
      isIsolated={isIsolated} baseColor={baseColor} radii={radii}>
      {/* Détails de murs et fondations : maçonnerie apparente et plinthes */}
      {renderStonePatches()}
      {!isFoundation && renderBaseTrim()}

      {/* Détails de fondation en pierre */}
      {isFoundation && (
        <ShapedBox
          args={[1.08, 0.02, 1.08]}
          radii={radii}
          isIsolated={isIsolated}
          color={'#7d7a70'}
          roughness={0.96}
          castShadow
          receiveShadow
        />
      )}
    </CellShell>
  );
}

