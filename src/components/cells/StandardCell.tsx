import { RoundedBox } from '@react-three/drei';
import type { GridCell, ProtectedAreasConfig } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { 
  hasOccupiedCell, 
  getExposedFaces, 
  getCornerRadii,
  FLAT_LIMIT 
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

  const quoinColor = varyColorBrightness(baseColor, -0.12);
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
      // Les murs standards ne raisonnent qu'en "coin arrondi oui/non",
      // pas en amplitude exacte du radius → mode booléen.
      cornerMode: 'boolean',
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

  // Tour isolée - aspect de tour même pour les murs simples
  if (isIsolated) {
        return (
          <group name="standardCellIsolated" position={position}>
            {/* Corps principal : cylindre moins rond pour plus de réalisme */}
            <ShapedBox
              args={[1.0, 1.0, 1.0]}
              radii={radii}
              isIsolated={true}
              color={baseColor}
              roughness={0.94}
              castShadow
              receiveShadow
            />

        {/* Éléments décoratifs : bande horizontale avec meilleur arrondi et visibilité */}
        {!isFoundation && (
          <mesh name="decorativeBandTop" position={[0, 0.455, 0]}>
            <RoundedBox args={[1.05, 0.08, 1.05]} radius={0.25} smoothness={8} castShadow>
              <meshStandardMaterial 
                color={varyColorBrightness(baseColor, -0.25)} 
                roughness={0.65} 
                metalness={0.15}
              />
            </RoundedBox>
          </mesh>
        )}
        
        {/* Fondation renforcée pour tour */}
        {isFoundation && (
          <>
            {/* Base élargie */}
            <mesh name="foundationBase" position={[0, -0.46, 0]}>
              <RoundedBox args={[1.12, 0.06, 1.12]} radius={0.02} smoothness={4} castShadow receiveShadow>
                <meshStandardMaterial color="#7d7a70" roughness={0.96} />
              </RoundedBox>
            </mesh>
          </>
        )}
      </group>
    );
  }

  // Mur ou fondation standard (non-tour)
  return (
    <group name="standardCell" position={position}>
      {/* Corps principal : coins arrondis sur les faces exposées, plats sur les joints */}
      <ShapedBox
        args={[1.0, 1.0, 1.0]}
        radii={radii}
        isIsolated={false}
        color={cell.color ?? '#b8b8b8'}
        roughness={0.94}
        castShadow
        receiveShadow
      />
      
      {/* Détails de murs et fondations : pierres d'angle, maçonnerie apparente et plinthes */}
      {renderQuoinsElement()}
      {renderStonePatches()}
      {!isFoundation && renderBaseTrim()}

      {/* Corniche horizontale sur les murs (pas sur les fondations) */}
      {!isFoundation && !cell.propertyBundle?.mergeFlags.suppressCornice && (
        <>
          <mesh name='cornicheTop' position={[0, 0.46, 0]}>
            <RoundedBox args={[1.04, 0.06, 1.04]} radius={0.02} smoothness={4} castShadow receiveShadow>
              <meshStandardMaterial color="#d8c8ae" roughness={0.86} />
            </RoundedBox>
          </mesh>
          <mesh name='corniceMiddle' position={[0, 0.38, 0]}>
            <RoundedBox args={[1.02, 0.04, 1.02]} radius={0.01} smoothness={4} castShadow>
              <meshStandardMaterial color="#c8b89e" roughness={0.88} />
            </RoundedBox>
          </mesh>
        </>
      )}
      
      {/* Détails de fondation en pierre */}
      {isFoundation && (
        <>
          {/* Base élargie de fondation */}
          <mesh name='foundationBase' position={[0, -0.48, 0]}>
            <RoundedBox args={[1.08, 0.02, 1.08]} radius={0.01} smoothness={4} castShadow receiveShadow>
              <meshStandardMaterial color="#7d7a70" roughness={0.96} />
            </RoundedBox>
          </mesh>
        </>
      )}
    </group>
  );
}

