import { RoundedBox } from '@react-three/drei';
import type { GridCell, ProtectedAreasConfig } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { 
  getExposedFaces, 
  getCornerRadii, 
  hasOccupiedCell,
  projectOnFace,
  FLAT_LIMIT,
  EDGE_R 
} from '../../utils/cellUtils';
import { varyColorBrightness } from '../../colorPalettes';
import { ShapedBox } from '../ShapedBox';
import { WINDOW_PROTECTED_AREAS, isInProtectedArea, TOWER_EXTERNAL_RADIUS, DECO_BAND_RADIUS } from '../../config/protectedAreasConfig';

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
  const renderStonePatches = (hasBands: boolean, renderContext: 'tower' | 'wall' = 'wall') => {
    if (exposedFaces.length === 0) return null;

    const stones: any[] = [];
    const stoneColor = varyColorBrightness(baseColor, -0.25);

    // Utiliser la configuration centralisée des zones protégées
    const PROTECTED_AREAS = WINDOW_PROTECTED_AREAS;

    /**
     * Vérifie si une position (x, y) sur une face est dans une zone protégée
     * Utilise la fonction centralisée isInProtectedArea
     */
    const isInProtectedZone = (
      face: string,
      x: number,
      y: number,
      stoneWidth: number,
      stoneHeight: number
    ): boolean => {
      // Déterminer quel élément est sur cette face
      let area = PROTECTED_AREAS.window; // par défaut
      if (face === doorFace) {
        area = PROTECTED_AREAS.door;
      } else if (isIsolated) {
        area = PROTECTED_AREAS.arrowSlit;
      }
      
      // Vérifier l'élément principal (fenêtre, porte, meurtrière)
      if (isInProtectedArea(area, x, y, stoneWidth, stoneHeight)) {
        return true;
      }
      
      // Vérifier les decorative bands (toujours présentes)
      if (isInProtectedArea(PROTECTED_AREAS.bandTop, x, y, stoneWidth, stoneHeight)) {
        return true;
      }
      if (isInProtectedArea(PROTECTED_AREAS.bandBottom, x, y, stoneWidth, stoneHeight)) {
        return true;
      }
      
      return false;
    };

    // Taille de base des pierres
    const baseStoneW = 0.12 + (Math.abs(cell.x) % 4) * 0.02;
    const baseStoneH = baseStoneW * 0.75;

    // Rayon d'arrondi des pierres : proportionnel à la hauteur de la pierre
    // Même valeur pour tours et murs plats
    const stoneRadius = 0.012;

    // Nombre de pierres par face (3-5)
    const stonesPerFace = 3 + (Math.abs(cell.x * 3 + cell.z * 7) % 3);

    exposedFaces.forEach((face, faceIdx) => {
      for (let i = 0; i < stonesPerFace; i++) {
        const seed = Math.abs(cell.x * 7 + cell.y * 11 + cell.z * 13 + faceIdx * 23 + i * 17);
        const h1 = seed % 100;
        const h2 = (seed * 7 + 13) % 100;
        const h3 = (seed * 3 + 41) % 100;

        const sizeVar = 0.85 + (h1 % 20) / 100;
        const w = baseStoneW * sizeVar;
        const h = baseStoneH * (0.8 + (h2 % 15) / 100);

        // Répartir dans les 4 quadrants pour éviter le centre
        const quadrant = i % 4;
        const signX = (quadrant === 0 || quadrant === 2) ? -1 : 1;
        const signY = (quadrant === 0 || quadrant === 1) ? -1 : 1;

        // Distance minimale pour éviter le centre
        const minDist = 0.20;
        const distX = minDist + (h1 % 18) * 0.01;
        const distY = 0.18 + (h2 % 16) * 0.01;
        const offsetX = signX * distX;
        const offsetY = signY * distY;

        // Vérifier si cette pierre est dans une zone protégée
        // (fenêtre, porte ou meurtrière selon le contexte)
        if (isInProtectedZone(face, offsetX, offsetY, w, h)) {
          continue; // Sauter cette pierre
        }

        if (isIsolated) {
          // ── Tour cylindrique : projection de offsetX sur la surface du cylindre ─
          // Même logique que les murs plats : offsetX est la position latérale
          // sur la face, projetée sur le cercle via asin(t/r).
          const faceAngles: Record<string, number> = {
            front: 0, back: Math.PI, right: Math.PI / 2, left: -Math.PI / 2,
          };
          const baseFaceAngle = faceAngles[face] ?? 0;

          // Signe selon la face pour cohérence directionnelle
          const lateralSign = (face === 'back' || face === 'right') ? -1 : 1;

          // Les pierres sont placées sur le cylindre externe (TOWER_EXTERNAL_RADIUS)
          // pour être au-dessus des decorative bands (DECO_BAND_RADIUS)
          const safeT = Math.max(-towerStoneRadius * 0.95, Math.min(towerStoneRadius * 0.95, offsetX));
          const angle = baseFaceAngle + lateralSign * Math.asin(safeT / towerStoneRadius);

          const posX = Math.sin(angle) * towerStoneRadius;
          const posZ = Math.cos(angle) * towerStoneRadius;
          const rotY = angle;

          stones.push(
            <mesh
              key={`stone-${faceIdx}-${i}`}
              name={`stonePatch-${faceIdx}-${i}`}
              position={[posX, offsetY, posZ]}
              rotation={[0, rotY, 0]}
              castShadow
              receiveShadow
            >
              <RoundedBox args={[w, h, 0.025]} radius={stoneRadius} smoothness={4}>
                <meshStandardMaterial color={stoneColor} roughness={0.85} metalness={0.05} />
              </RoundedBox>
            </mesh>
          );
        } else {
          // ── Mur avec coins éventuellement arrondis ────────────────────────
          // Offset radial pour placer les pierres au-dessus des decorative bands
          // Decorative band radius = 0.505, pierre épaisseur = 0.025 (demi = 0.0125)
          // Pour éviter la superposition : 0.5 + offset + 0.0125 > 0.505
          // → offset > 0.505 - 0.5 - 0.0125 = 0.0025
          // Avec une marge de sécurité, utilisons offset = 0.015
          const stoneOffset = 0.015; // Décalage vers l'extérieur
          let pos: [number, number, number] = [0, 0, 0];
          let rot: [number, number, number] = [0, 0, 0];

          switch (face) {
            case 'front': {
              const { surfaceZ, rotY } = projectOnFace(offsetX, radii.frontLeft > 0.01, radii.frontRight > 0.01);
              pos = [offsetX, offsetY, surfaceZ + stoneOffset];
              rot = [0, rotY, 0];
              break;
            }
            case 'back': {
              const { surfaceZ, rotY } = projectOnFace(offsetX, radii.backLeft > 0.01, radii.backRight > 0.01);
              pos = [offsetX, offsetY, -(surfaceZ + stoneOffset)];
              rot = [0, Math.PI - rotY, 0];
              break;
            }
            case 'left': {
              const { surfaceZ, rotY } = projectOnFace(offsetX, radii.backLeft > 0.01, radii.frontLeft > 0.01);
              pos = [-(surfaceZ + stoneOffset), offsetY, offsetX];
              rot = [0, Math.PI / 2 + rotY, 0];
              break;
            }
            case 'right': {
              const { surfaceZ, rotY } = projectOnFace(offsetX, radii.backRight > 0.01, radii.frontRight > 0.01);
              pos = [surfaceZ + stoneOffset, offsetY, offsetX];
              rot = [0, -(Math.PI / 2 + rotY), 0];
              break;
            }
          }

          stones.push(
            <mesh
              key={`stone-${faceIdx}-${i}`}
              name={`stonePatch-${faceIdx}-${i}`}
              position={pos}
              rotation={rot}
              castShadow
              receiveShadow
            >
              <RoundedBox args={[w, h, 0.025]} radius={stoneRadius} smoothness={4}>
                <meshStandardMaterial color={stoneColor} roughness={0.85} metalness={0.1} />
              </RoundedBox>
            </mesh>
          );
        }
      }
    });

    return <>{stones}</>;
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

       if (hasTopLeftCorner) {
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

       if (hasTopRightCorner) {
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

       if (hasBottomLeftCorner) {
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

       if (hasBottomRightCorner) {
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