import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { 
  getExposedFaces, 
  getCornerRadii,
} from '../../utils/cellUtils';
import { varyColorBrightness } from '../../colorPalettes';
import { ShapedBox } from '../ShapedBox';
import { STANDARD_PROTECTED_AREAS, checkInProtectedZones } from '../../config/protectedAreasConfig';
import { renderStonePatches as renderStonePatchesShared } from '../../utils/stonePatches';
import { renderQuoins, isQuoinProtected } from '../../utils/cornerDecorations';

interface StandardCellProps {
  cell: GridCell;
  position: [number, number, number];
  lookup: CellLookup;
  isIsolated: boolean;
}

export function StandardCell({ cell, position, lookup, isIsolated }: StandardCellProps) {
  const isFoundation = cell.type === 'FOUNDATION';
  const baseColor = cell.color ?? (isFoundation ? '#8d8a80' : '#c0b0a0');
  const patchColor = varyColorBrightness(baseColor, -0.15);
  const trimColor = varyColorBrightness(baseColor, -0.08);

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

  const renderQuoinsElement = () => renderQuoins({ cell, lookup, isIsolated, baseColor, radii });

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

      let rotation: [number, number, number] = [0, 0, 0];
      let position: [number, number, number] = [0, -0.46, 0];

      switch (face) {
        case 'front':
          position = [0, -0.46, 0.505];
          rotation = [0, 0, 0];
          break;
        case 'back':
          position = [0, -0.46, -0.505];
          rotation = [0, Math.PI, 0];
          break;
        case 'left':
          position = [-0.505, -0.46, 0];
          rotation = [0, Math.PI / 2, 0];
          break;
        case 'right':
          position = [0.505, -0.46, 0];
          rotation = [0, -Math.PI / 2, 0];
          break;
      }

      return (
        <mesh key={`trim-${index}`} name="baseTrim" position={position} rotation={rotation} castShadow receiveShadow>
          <RoundedBox args={[1.02, 0.08, 0.02]} radius={0.01} smoothness={2}>
            <meshStandardMaterial color={trimColor} roughness={0.9} />
          </RoundedBox>
        </mesh>
      );
    });
  };

  // ── Rendu unifié (mur, tour, fondation) ────────────────────────────────────
  // La forme est entièrement pilotée par `radii` : coins exposés → arrondi,
  // coins joints → angle droit. Plus besoin de séparer isIsolated.
  return (
    <group name="standardCell" position={position}>
      {/* Corps principal : forme pilotée par radii */}
      <ShapedBox
        args={[1.0, 1.0, 1.0]}
        radii={radii}
        isIsolated={isIsolated}
        color={cell.color ?? baseColor}
        roughness={0.94}
        castShadow
        receiveShadow
      />
      
      {/* Détails de murs et fondations : pierres d'angle, maçonnerie apparente et plinthes */}
      {renderQuoinsElement()}
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
    </group>
  );
}

