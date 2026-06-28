import { RoundedBox } from '@react-three/drei';
import type { GridCell, ProtectedAreasConfig } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { 
  getExposedFaces, 
  getCornerRadii, 
  hasOccupiedCell,
  FLAT_LIMIT,
  EDGE_R 
} from '../../utils/cellUtils';
import { varyColorBrightness } from '../../colorPalettes';
import { ShapedBox } from '../ShapedBox';
import { WINDOW_PROTECTED_AREAS, isInProtectedArea, TOWER_EXTERNAL_RADIUS, DECO_BAND_RADIUS } from '../../config/protectedAreasConfig';
import { renderStonePatches as renderStonePatchesShared } from '../../utils/stonePatches';

interface WallWithWindowCellProps {
  cell: GridCell;
  position: [number, number, number];
  lookup: CellLookup;
  isIsolated: boolean;
}

export function WallWithWindowCell({ cell, position, lookup, isIsolated }: WallWithWindowCellProps) {
  const exposedFaces = getExposedFaces(lookup, cell);

  const baseColor = cell.color ?? '#e0c996';
  const windowFrameColor = varyColorBrightness(baseColor, -0.15);
  const windowGlassColor = '#2a3a4a';
  const doorColor = varyColorBrightness(baseColor, -0.20);
  const doorFrameColor = varyColorBrightness(baseColor, -0.15);

  const radii = getCornerRadii(lookup, cell);

  // Calculer le radius moyen du bloc pour l'utiliser dans tous les éléments
  const avgRadius = (radii.backLeft + radii.backRight + radii.frontLeft + radii.frontRight) / 4;

  // Rayons pour les stone patches sur les tours (doit être déclaré avant renderStonePatches)
  // Utilisation de la constante centralisée TOWER_EXTERNAL_RADIUS
  const towerStoneRadius = TOWER_EXTERNAL_RADIUS;

  // Saillie des coins - valeur ajustable pour contrôler combien les coins dépassent du mur
  // Valeur initiale conservative : 0.005 (dépasse légèrement de la surface à -0.5/0.5)
  // Pour ajuster : augmenter pour plus de saillie, diminuer pour moins de saillie
  const CORNER_PROTRUSION = -0.05;

  // Radius des arrondis pour les décorations de coin
  // Valeur initiale conservative : 0.003 pour des arrondis subtils
  // Pour ajuster : augmenter pour plus d'arrondi, diminuer pour des coins plus anguleux
  const CORNER_ROUNDING_RADIUS = 0.001;

  // Radius des arrondis pour les éléments principaux (fenêtres, portes)
  // Valeur initiale : 0.015 pour un arrondi visible mais pas trop prononcé
  // Pour ajuster : augmenter pour plus d'arrondi, diminuer pour des angles plus nets
  const MAIN_ELEMENT_ROUNDING_RADIUS = 0.015;

  // Radius des arrondis pour le bloc principal (ShapedBox)
  // Valeur initiale : 0.12 pour un arrondi moins prononcé que le défaut (0.18)
  // Pour ajuster : augmenter pour plus d'arrondi, diminuer pour des coins plus nets
  const MAIN_BLOCK_EDGE_RADIUS = 0.12;

  // Déterminer le contexte du bloc pour adapter les décorations murales
  const hasLeftNeighbor = hasOccupiedCell(lookup, cell.x - 1, cell.y, cell.z);
  const hasRightNeighbor = hasOccupiedCell(lookup, cell.x + 1, cell.y, cell.z);
  const hasFrontNeighbor = hasOccupiedCell(lookup, cell.x, cell.y, cell.z + 1);
  const hasBackNeighbor = hasOccupiedCell(lookup, cell.x, cell.y, cell.z - 1);

  // Compter le nombre de faces extérieures (non adjacentes à d'autres blocs)
  const exteriorFaces = [
    !hasLeftNeighbor ? 'left' : null,
    !hasRightNeighbor ? 'right' : null,
    !hasFrontNeighbor ? 'front' : null,
    !hasBackNeighbor ? 'back' : null
  ].filter(face => face !== null);

  const isExteriorWall = exteriorFaces.length > 0;
  const exteriorFaceCount = exteriorFaces.length;
  const isFullyExposed = exteriorFaceCount === 4;
  const isCorner = exteriorFaceCount >= 2 && !isFullyExposed;

  // ── Porte au rez-de-chaussée uniquement ────────────────────────────────
  const isGroundFloor = cell.y === 0;
  const doorFaceHash = Math.abs(cell.x * 31 + cell.z * 17) % Math.max(exposedFaces.length, 1);
  const doorFace = isGroundFloor && exposedFaces.length > 0 ? exposedFaces[doorFaceHash] : null;

  const rotMap: Record<string, number> = {
    front: 0,
    back: Math.PI,
    left: -Math.PI / 2,
    right: Math.PI / 2,
  };

  // ── Pierres apparentes (toujours présentes sauf sur les toits) ─────────────────
  // 🔢 Pour changer facilement le nombre de pierres par face : remplacer
  // `undefined` par un nombre fixe (ex: 5) ou une fonction (cell, faceIdx) => n.
  // `undefined` conserve le comportement d'origine (3 à 5 pierres selon seed).
  const STONES_PER_FACE: number | undefined = 10;

  const renderStonePatches = (hasBands: boolean, renderContext: 'tower' | 'wall' = 'wall') => {
    if (exposedFaces.length === 0) return null;

    const stoneColor = varyColorBrightness(baseColor, -0.25);

    // Taille de base des pierres (dépend de la cellule)
    const baseStoneW = 0.12 + (Math.abs(cell.x) % 4) * 0.02;
    const baseStoneH = baseStoneW * 0.75;

    return renderStonePatchesShared({
      cell,
      exposedFaces,
      isIsolated,
      radii,
      // Les murs avec fenêtre utilisent l'amplitude réelle du radius
      // (projection plus fine que le simple flag booléen).
      cornerMode: 'numeric',
      towerRadius: towerStoneRadius,
      wallSurfaceOffset: 0.015, // place les pierres au-dessus des decorative bands
      stonesPerFace: STONES_PER_FACE,
      seedSalt: { x: 7, y: 11, z: 13, face: 23, stone: 17 },
      baseSize: { width: baseStoneW, height: baseStoneH },
      computeSize: (h1, h2, _h3, base) => ({
        width: base.width * (0.85 + (h1 % 20) / 100),
        height: base.height * (0.8 + (h2 % 15) / 100),
      }),
      distance: { xBase: 0.2, xModRange: 18, yBase: 0.18, yModRange: 16 },
      visual: {
        thickness: 0.025,
        cornerRadius: 0.012,
        smoothness: 4,
        color: stoneColor,
        roughness: 0.85,
        metalness: 0.1,
        metalnessIsolated: 0.05,
      },
      // 🔒 Zone protégée propre à WallWithWindowCell (fenêtre / porte /
      // meurtrière + bandes décoratives). Ne jamais réutiliser celle de
      // StandardCell : les éléments protégés ne sont pas les mêmes.
      isInProtectedZone: (face, x, y, w, h) => {
        let area = WINDOW_PROTECTED_AREAS.window; // par défaut
        if (face === doorFace) {
          area = WINDOW_PROTECTED_AREAS.door;
        } else if (isIsolated) {
          area = WINDOW_PROTECTED_AREAS.arrowSlit;
        }

        if (isInProtectedArea(area, x, y, w, h)) return true;
        if (isInProtectedArea(WINDOW_PROTECTED_AREAS.bandTop, x, y, w, h)) return true;
        if (isInProtectedArea(WINDOW_PROTECTED_AREAS.bandBottom, x, y, w, h)) return true;
        return false;
      },
    });
  };


  // ── Fenêtre simplifiée ─────────────────────────────────────────────────
  const createSimpleWindow = (rotation: number, faceId: number) => {
    // Utiliser le radius moyen du bloc parent pour tous les éléments
    const windowRadius = Math.min(0.025, avgRadius * 0.9);
    const glassRadius = Math.min(0.02, avgRadius * 0.8);

    return (
      <group name="window" rotation={[0, rotation, 0]} key={`window-${faceId}`}>
        {/* Cadre de fenêtre adapté à l'arrondi du bloc parent */}
        <mesh name="windowFrame" position={[0, 0, 0.505]} castShadow receiveShadow>
          <RoundedBox args={[0.6, 0.5, 0.02]} radius={windowRadius} smoothness={4}>
            <meshStandardMaterial color={windowFrameColor} roughness={0.85} />
          </RoundedBox>
        </mesh>
        {/* Vitre transparente */}
        <mesh name="windowGlass" position={[0, 0, 0.495]} castShadow receiveShadow>
          <RoundedBox args={[0.54, 0.44, 0.01]} radius={glassRadius} smoothness={4}>
            <meshStandardMaterial
              color={windowGlassColor}
              roughness={0.1}
              metalness={0.15}
              transparent
              opacity={0.85}
            />
          </RoundedBox>
        </mesh>
        {/* Séparateur horizontal */}
        <mesh position={[0, 0, 0.51]} castShadow>
          <boxGeometry args={[0.56, 0.03, 0.01]} />
          <meshStandardMaterial color={varyColorBrightness(windowFrameColor, -0.05)} roughness={0.88} />
        </mesh>
        {/* Séparateur vertical */}
        <mesh position={[0, 0, 0.51]} castShadow>
          <boxGeometry args={[0.03, 0.46, 0.01]} />
          <meshStandardMaterial color={varyColorBrightness(windowFrameColor, -0.05)} roughness={0.88} />
        </mesh>
      </group>
    );
  };

  // ── Porte simplifiée ────────────────────────────────────────────────────
  const createSimpleDoor = (rotation: number, key: string) => {
    // Utiliser le radius du bloc parent pour la porte
    const doorFrameRadius = Math.min(0.015, avgRadius * 0.8);
    const doorPanelRadius = Math.min(0.012, avgRadius * 0.7);
    const thresholdRadius = Math.min(0.01, avgRadius * 0.6);

    return (
      <group name="door" rotation={[0, rotation, 0]} key={key}>
        {/* Encadrement de porte adapté au bloc parent */}
        <mesh name="doorFrame" position={[0, -0.06, 0.502]} castShadow receiveShadow>
          <RoundedBox args={[0.48, 0.8, 0.03]} radius={doorFrameRadius} smoothness={4}>
            <meshStandardMaterial color={doorFrameColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        {/* Panneau de porte */}
        <mesh name="doorPanel" position={[0, -0.10, 0.5]} castShadow receiveShadow>
          <RoundedBox args={[0.4, 0.7, 0.04]} radius={doorPanelRadius} smoothness={6}>
            <meshStandardMaterial color={doorColor} roughness={0.92} />
          </RoundedBox>
        </mesh>
        {/* Poignée de porte */}
        <mesh name="doorHandle" position={[0.16, -0.14, 0.502]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.04, 8]} />
          <meshStandardMaterial color="#8a6a3a" metalness={0.55} roughness={0.35} />
        </mesh>
        {/* Seuil de porte */}
        <mesh name="doorThreshold" position={[0, -0.49, 0.501]} castShadow receiveShadow>
          <RoundedBox args={[0.5, 0.04, 0.03]} radius={thresholdRadius} smoothness={4}>
            <meshStandardMaterial color={varyColorBrightness(baseColor, -0.18)} roughness={0.94} />
          </RoundedBox>
        </mesh>
      </group>
    );
  };

  // ── Meurtrière simplifiée (sans volets) ───────────────────────────────
  const createSimpleArrowSlit = (rotation: number, faceId: number) => {
    // Utiliser le radius du bloc parent pour les meurtrières
    const arrowSlitRadius = Math.min(0.02, avgRadius * 0.9);
    const arrowSlitInnerRadius = Math.min(0.015, avgRadius * 0.7);

    return (
      <group name="arrowSlit" rotation={[0, rotation, 0]} key={`arrowslit-${faceId}`}>
        {/* Ouverture de meurtrière adaptée au bloc parent */}
        <mesh name="arrowSlitMain" position={[0, 0, 0.505]} castShadow receiveShadow>
          <RoundedBox args={[0.14, 0.4, 0.02]} radius={arrowSlitRadius} smoothness={4}>
            <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
          </RoundedBox>
        </mesh>
        {/* Intérieur de meurtrière */}
        <mesh name="arrowSlitInner" position={[0, 0, 0.49]} castShadow receiveShadow>
          <RoundedBox args={[0.08, 0.32, 0.04]} radius={arrowSlitInnerRadius} smoothness={4}>
            <meshStandardMaterial color="#0a0a0a" roughness={0.98} />
          </RoundedBox>
        </mesh>
      </group>
    );
  };

  // ── Helper : rendu d'une face ──────────────────────────────────────────
  const renderFace = (face: string, index: number, towerMode: boolean) => {
    if (face === doorFace) {
      return createSimpleDoor(rotMap[face], `door-${index}`);
    }
    const rot = rotMap[face];
    if (towerMode) return createSimpleArrowSlit(rot, index);
    return createSimpleWindow(rot, index);
  };

   // ── RENDU TOUR ISOLÉE ──────────────────────────────────────────────────
   if (isIsolated) {
     // Pour les tours, utiliser le même radius que le corps principal (0.5 pour un bloc 1x1x1)
     // Le ShapedBox avec isIsolated=true crée un cylindre de radius w/2 = 0.5
     const towerBodyRadius = 0.5; // Correspond au radius du cylindre principal
     const towerDecoSegments = 32; // Plus de segments pour un meilleur arrondi

     return (
       <group name="wallWithWindowCell" position={position}>
         <ShapedBox args={[1.0, 1.0, 1.0]} radii={radii} isIsolated={true}
           color={cell.color ?? '#d0baa0'} roughness={0.94} castShadow receiveShadow />

         {/* Décorations murales : bandes légèrement au-dessus du corps, sous les pierres */}
         <mesh name="decorativeBandTop" position={[0, 0.35, 0]} castShadow>
           <cylinderGeometry args={[DECO_BAND_RADIUS, DECO_BAND_RADIUS, 0.08, towerDecoSegments]} />
           <meshStandardMaterial 
             color={varyColorBrightness(baseColor, -0.2)} 
             roughness={0.7} 
             metalness={0.1}
           />
         </mesh>
         <mesh name="decorativeBandBottom" position={[0, -0.35, 0]} castShadow>
           <cylinderGeometry args={[DECO_BAND_RADIUS, DECO_BAND_RADIUS, 0.08, towerDecoSegments]} />
           <meshStandardMaterial 
             color={varyColorBrightness(baseColor, -0.2)} 
             roughness={0.7} 
             metalness={0.1}
           />
         </mesh>

        {/* Pierres apparentes - toujours présentes sur les murs */}
        {renderStonePatches(true, 'tower')}

        {exposedFaces.map((face, index) => renderFace(face, index, true))}
      </group>
    );
  }

  // ── RENDU MUR STANDARD ────────────────────────────────────────────────
  // Rendu des décorations murales adaptées au contexte
  const renderWallDecorations = () => {
    if (!isExteriorWall) return null; // Pas de décorations pour les murs intérieurs

    // Adapter les décorations en fonction du contexte
    const decoColor = varyColorBrightness(baseColor, -0.15);
    const decoElements = [];

    // Pour les murs complètement exposés (piliers), utiliser des bandes comme les tours
    if (isFullyExposed) {
      // Pour les piliers complètement exposés, utiliser le même radius que le corps principal
      // Le ShapedBox avec isIsolated=false mais tous les coins arrondis devrait avoir un radius effectif proche de 0.5
      const wallDecoSegments = 32; // Plus de segments pour un meilleur arrondi

      decoElements.push(
        <mesh key="deco-band-top" name="decorativeBandTop" position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[DECO_BAND_RADIUS, DECO_BAND_RADIUS, 0.08, wallDecoSegments]} />
          <meshStandardMaterial color={varyColorBrightness(baseColor, -0.2)} roughness={0.7} metalness={0.1} />
        </mesh>,
        <mesh key="deco-band-bottom" name="decorativeBandBottom" position={[0, -0.35, 0]} castShadow>
          <cylinderGeometry args={[DECO_BAND_RADIUS, DECO_BAND_RADIUS, 0.08, wallDecoSegments]} />
          <meshStandardMaterial color={varyColorBrightness(baseColor, -0.2)} roughness={0.7} metalness={0.1} />
        </mesh>
      );
    }
    // Pour les coins, ajouter des décorations d'angle
    else if (isCorner) {
      // Déterminer quels coins sont exposés
      const hasTopLeftCorner = !hasLeftNeighbor && !hasBackNeighbor;
      const hasTopRightCorner = !hasRightNeighbor && !hasBackNeighbor;
      const hasBottomLeftCorner = !hasLeftNeighbor && !hasFrontNeighbor;
      const hasBottomRightCorner = !hasRightNeighbor && !hasFrontNeighbor;

      const showTopLeft = hasTopLeftCorner && radii.backLeft <= 0.01;
      const showTopRight = hasTopRightCorner && radii.backRight <= 0.01;
      const showBottomLeft = hasBottomLeftCorner && radii.frontLeft <= 0.01;
      const showBottomRight = hasBottomRightCorner && radii.frontRight <= 0.01;

       if (showTopLeft) {
         // Coin haut-gauche-arrière - saillie contrôlée par variable ajustable
         // Utilise CORNER_PROTRUSION pour un contrôle précis de la saillie
         const cornerPos = -0.5 - CORNER_PROTRUSION;
         decoElements.push(
           <mesh key="corner-deco-tl-l0" name="cornerDecoTL-L0" position={[cornerPos, -0.32, cornerPos]} castShadow>
             <RoundedBox args={[0.14, 0.18, 0.14]} radius={CORNER_ROUNDING_RADIUS} smoothness={2}>
               <meshStandardMaterial color={decoColor} roughness={0.9} />
             </RoundedBox>
           </mesh>
         );
         decoElements.push(
           <mesh key="corner-deco-tl-l1" name="cornerDecoTL-L1" position={[cornerPos, 0.0, cornerPos]} castShadow>
             <RoundedBox args={[0.14, 0.18, 0.14]} radius={CORNER_ROUNDING_RADIUS} smoothness={2}>
               <meshStandardMaterial color={decoColor} roughness={0.9} />
             </RoundedBox>
           </mesh>
         );
         decoElements.push(
           <mesh key="corner-deco-tl-l2" name="cornerDecoTL-L2" position={[cornerPos, 0.32, cornerPos]} castShadow>
             <RoundedBox args={[0.14, 0.18, 0.14]} radius={CORNER_ROUNDING_RADIUS} smoothness={2}>
               <meshStandardMaterial color={decoColor} roughness={0.9} />
             </RoundedBox>
           </mesh>
         );
       }

       if (showTopRight) {
         // Coin haut-droit-arrière
         const cornerPos = 0.5 + CORNER_PROTRUSION;
         decoElements.push(
           <mesh key="corner-deco-tr-l0" name="cornerDecoTR-L0" position={[cornerPos, -0.32, -0.5 - CORNER_PROTRUSION]} castShadow>
             <RoundedBox args={[0.14, 0.18, 0.14]} radius={0.01} smoothness={2}>
               <meshStandardMaterial color={decoColor} roughness={0.9} />
             </RoundedBox>
           </mesh>
         );
         decoElements.push(
           <mesh key="corner-deco-tr-l1" name="cornerDecoTR-L1" position={[cornerPos, 0.0, -0.5 - CORNER_PROTRUSION]} castShadow>
             <RoundedBox args={[0.14, 0.18, 0.14]} radius={0.01} smoothness={2}>
               <meshStandardMaterial color={decoColor} roughness={0.9} />
             </RoundedBox>
           </mesh>
         );
         decoElements.push(
           <mesh key="corner-deco-tr-l2" name="cornerDecoTR-L2" position={[cornerPos, 0.32, -0.5 - CORNER_PROTRUSION]} castShadow>
             <RoundedBox args={[0.14, 0.18, 0.14]} radius={0.01} smoothness={2}>
               <meshStandardMaterial color={decoColor} roughness={0.9} />
             </RoundedBox>
           </mesh>
         );
       }

       if (showBottomLeft) {
         // Coin bas-gauche-avant
         const cornerPos = -0.5 - CORNER_PROTRUSION;
         decoElements.push(
           <mesh key="corner-deco-bl-l0" name="cornerDecoBL-L0" position={[cornerPos, -0.32, 0.5 + CORNER_PROTRUSION]} castShadow>
             <RoundedBox args={[0.14, 0.18, 0.14]} radius={0.01} smoothness={2}>
               <meshStandardMaterial color={decoColor} roughness={0.9} />
             </RoundedBox>
           </mesh>
         );
         decoElements.push(
           <mesh key="corner-deco-bl-l1" name="cornerDecoBL-L1" position={[cornerPos, 0.0, 0.5 + CORNER_PROTRUSION]} castShadow>
             <RoundedBox args={[0.14, 0.18, 0.14]} radius={0.01} smoothness={2}>
               <meshStandardMaterial color={decoColor} roughness={0.9} />
             </RoundedBox>
           </mesh>
         );
         decoElements.push(
           <mesh key="corner-deco-bl-l2" name="cornerDecoBL-L2" position={[cornerPos, 0.32, 0.5 + CORNER_PROTRUSION]} castShadow>
             <RoundedBox args={[0.14, 0.18, 0.14]} radius={0.01} smoothness={2}>
               <meshStandardMaterial color={decoColor} roughness={0.9} />
             </RoundedBox>
           </mesh>
         );
       }

       if (showBottomRight) {
         // Coin bas-droit-avant
         const cornerPos = 0.5 + CORNER_PROTRUSION;
         decoElements.push(
           <mesh key="corner-deco-br-l0" name="cornerDecoBR-L0" position={[cornerPos, -0.32, cornerPos]} castShadow>
             <RoundedBox args={[0.14, 0.18, 0.14]} radius={0.01} smoothness={2}>
               <meshStandardMaterial color={decoColor} roughness={0.9} />
             </RoundedBox>
           </mesh>
         );
         decoElements.push(
           <mesh key="corner-deco-br-l1" name="cornerDecoBR-L1" position={[cornerPos, 0.0, cornerPos]} castShadow>
             <RoundedBox args={[0.14, 0.18, 0.14]} radius={0.01} smoothness={2}>
               <meshStandardMaterial color={decoColor} roughness={0.9} />
             </RoundedBox>
           </mesh>
         );
         decoElements.push(
           <mesh key="corner-deco-br-l2" name="cornerDecoBR-L2" position={[cornerPos, 0.32, cornerPos]} castShadow>
             <RoundedBox args={[0.14, 0.18, 0.14]} radius={0.01} smoothness={2}>
               <meshStandardMaterial color={decoColor} roughness={0.9} />
             </RoundedBox>
           </mesh>
         );
       }
    }
    // Pour les murs avec une face exposée, ajouter des décorations latérales
    else if (exteriorFaceCount === 1) {
      // Déterminer quelle face est exposée
      const exposedFace = exteriorFaces[0];

      // Valeurs par défaut
      let decoPosition: [number, number, number] = [0, 0, 0];
      let decoRotation: [number, number, number] = [0, 0, 0];

      switch (exposedFace) {
        case 'left':
          decoPosition = [-0.505, 0, 0];
          decoRotation = [0, Math.PI / 2, 0];
          break;
        case 'right':
          decoPosition = [0.505, 0, 0];
          decoRotation = [0, -Math.PI / 2, 0];
          break;
        case 'front':
          decoPosition = [0, 0, 0.505];
          decoRotation = [0, 0, 0];
          break;
        case 'back':
          decoPosition = [0, 0, -0.505];
          decoRotation = [0, Math.PI, 0];
          break;
      }
    }

    return <>{decoElements}</>;
  };

  return (
    <group name="wallWithWindowCell" position={position}>
      <ShapedBox args={[1.0, 1.0, 1.0]} radii={radii} isIsolated={false}
        color={cell.color ?? '#e0c996'} roughness={0.94} castShadow receiveShadow
        edgeRadius={MAIN_BLOCK_EDGE_RADIUS} />

      {/* Décorations murales adaptées au contexte du bloc */}
      {renderWallDecorations()}

      {/* Pierres apparentes - toujours présentes sur les murs (sauf toits) */}
      {renderStonePatches(isFullyExposed, 'wall')}

      {exposedFaces.map((face, index) => renderFace(face, index, false))}
    </group>
  );
}