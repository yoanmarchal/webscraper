import { RoundedBox } from '@react-three/drei';
import type { GridCell, ProtectedAreasConfig } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { getExposedFaces, getCornerRadii, hasOccupiedCell } from '../../utils/cellUtils';
import { varyColorBrightness } from '../../colorPalettes';
import { ShapedBox } from '../ShapedBox';

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
  const renderStonePatches = () => {
    if (exposedFaces.length === 0) return null;

    const stones: JSX.Element[] = [];
    const stoneColor = varyColorBrightness(baseColor, -0.25);

    // Rayon des arcs de coin (EDGE_R dans ShapedBox)
    const EDGE_R = 0.18;
    const FLAT_LIMIT = 0.5 - EDGE_R; // 0.32

    /**
     * Définition des zones protégées pour fenêtres, portes et meurtrières
     * Ces marges empêchent les pierres de se superposer aux éléments fonctionnels
     * Les marges sont calculées comme la moitié de la taille de l'élément + une marge de sécurité
     */
    const PROTECTED_AREAS: ProtectedAreasConfig = {
      // Fenêtre : cadre 0.6x0.5, vitre 0.54x0.44 → zone à protéger : ~0.35x0.27
      window: { marginX: 0.32, marginY: 0.27, centerX: 0, centerY: 0 },
      // Porte : cadre 0.48x0.8, panneau 0.4x0.7, centrée à y≈-0.10 → zone : ~0.24x0.40
      door: { marginX: 0.26, marginY: 0.42, centerX: 0, centerY: -0.10 },
      // Meurtrière : 0.14x0.4 → zone : ~0.08x0.22
      arrowSlit: { marginX: 0.09, marginY: 0.23, centerX: 0, centerY: 0 },
    };

    /**
     * Vérifie si une position (x, y) sur une face est dans une zone protégée
     * @param face - La face concernée
     * @param x - Position horizontale sur la face (-0.5 à 0.5)
     * @param y - Position verticale sur la face (-0.5 à 0.5)
     * @param stoneWidth - Largeur de la pierre
     * @param stoneHeight - Hauteur de la pierre
     * @returns true si la pierre chevauche une zone protégée
     */
    const isInProtectedZone = (
      face: string,
      x: number,
      y: number,
      stoneWidth: number,
      stoneHeight: number
    ): boolean => {
      let area;
      
      // Déterminer quel élément est sur cette face
      if (face === doorFace) {
        // Face avec porte
        area = PROTECTED_AREAS.door;
      } else if (isIsolated) {
        // Pour les tours isolées, toutes les faces exposées ont des meurtrières
        area = PROTECTED_AREAS.arrowSlit;
      } else {
        // Pour les murs standards, les faces exposées (non-porte) ont des fenêtres
        area = PROTECTED_AREAS.window;
      }

      // Vérifier si le coin de la pierre le plus proche du centre est dans la zone protégée
      const closestX = Math.abs(x) - stoneWidth / 2;
      const closestY = Math.abs(y - area.centerY) - stoneHeight / 2;
      return closestX < area.marginX && closestY < area.marginY;
    };

    /**
     * Projette un point latéral t sur la surface réelle d'une face.
     * Retourne { surfaceZ, rotY } dans le repère local de la face.
     */
    const projectOnFace = (
      t: number,
      cornerRoundedNeg: boolean,
      cornerRoundedPos: boolean,
    ): { surfaceZ: number; rotY: number } => {
      if (t > FLAT_LIMIT && cornerRoundedPos) {
        const dx = Math.min(t - FLAT_LIMIT, EDGE_R);
        const theta = Math.asin(dx / EDGE_R);
        return { surfaceZ: FLAT_LIMIT + EDGE_R * Math.cos(theta), rotY: theta };
      } else if (t < -FLAT_LIMIT && cornerRoundedNeg) {
        const dx = Math.max(t + FLAT_LIMIT, -EDGE_R);
        const theta = Math.asin(dx / EDGE_R);
        return { surfaceZ: FLAT_LIMIT + EDGE_R * Math.cos(theta), rotY: theta };
      }
      return { surfaceZ: 0.5, rotY: 0 };
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

          const towerRadius = 0.502;
          const safeT = Math.max(-towerRadius * 0.95, Math.min(towerRadius * 0.95, offsetX));
          const angle = baseFaceAngle + lateralSign * Math.asin(safeT / towerRadius);

          const posX = Math.sin(angle) * towerRadius;
          const posZ = Math.cos(angle) * towerRadius;
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
          let pos: [number, number, number] = [0, 0, 0];
          let rot: [number, number, number] = [0, 0, 0];

          switch (face) {
            case 'front': {
              const { surfaceZ, rotY } = projectOnFace(offsetX, radii.frontLeft > 0.01, radii.frontRight > 0.01);
              pos = [offsetX, offsetY, surfaceZ + 0.003];
              rot = [0, rotY, 0];
              break;
            }
            case 'back': {
              const { surfaceZ, rotY } = projectOnFace(offsetX, radii.backLeft > 0.01, radii.backRight > 0.01);
              pos = [offsetX, offsetY, -(surfaceZ + 0.003)];
              rot = [0, Math.PI - rotY, 0];
              break;
            }
            case 'left': {
              const { surfaceZ, rotY } = projectOnFace(offsetX, radii.backLeft > 0.01, radii.frontLeft > 0.01);
              pos = [-(surfaceZ + 0.003), offsetY, offsetX];
              rot = [0, Math.PI / 2 + rotY, 0];
              break;
            }
            case 'right': {
              const { surfaceZ, rotY } = projectOnFace(offsetX, radii.backRight > 0.01, radii.frontRight > 0.01);
              pos = [surfaceZ + 0.003, offsetY, offsetX];
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
     const towerDecoSegments = 24; // Même nombre de segments que le corps principal

     return (
       <group name="wallWithWindowCell" position={position}>
         <ShapedBox args={[1.0, 1.0, 1.0]} radii={radii} isIsolated={true}
           color={cell.color ?? '#d0baa0'} roughness={0.94} castShadow receiveShadow />

         {/* Décorations murales fusionnées - bandes décoratives avec le même radius que le corps */}
         <mesh name="decorativeBandTop" position={[0, 0.35, 0]} castShadow>
           <cylinderGeometry args={[towerBodyRadius, towerBodyRadius, 0.05, towerDecoSegments]} />
           <meshStandardMaterial color={varyColorBrightness(baseColor, -0.1)} roughness={0.9} />
         </mesh>
         <mesh name="decorativeBandBottom" position={[0, -0.35, 0]} castShadow>
           <cylinderGeometry args={[towerBodyRadius, towerBodyRadius, 0.05, towerDecoSegments]} />
           <meshStandardMaterial color={varyColorBrightness(baseColor, -0.1)} roughness={0.9} />
         </mesh>

        {/* Pierres apparentes - toujours présentes sur les murs */}
        {renderStonePatches()}

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
      const wallDecoRadius = 0.5; // Correspond au radius effectif du corps principal
      const wallDecoSegments = 24; // Même nombre de segments que les tours

      decoElements.push(
        <mesh key="deco-band-top" name="decorativeBandTop" position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[wallDecoRadius, wallDecoRadius, 0.04, wallDecoSegments]} />
          <meshStandardMaterial color={decoColor} roughness={0.9} />
        </mesh>,
        <mesh key="deco-band-bottom" name="decorativeBandBottom" position={[0, -0.35, 0]} castShadow>
          <cylinderGeometry args={[wallDecoRadius, wallDecoRadius, 0.04, wallDecoSegments]} />
          <meshStandardMaterial color={decoColor} roughness={0.9} />
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
        decoElements.push(
          <mesh key="corner-deco-tl" name="cornerDecoTL" position={[-0.4, 0.4, -0.4]} castShadow>
            <boxGeometry args={[0.2, 0.2, 0.03]} />
            <meshStandardMaterial color={decoColor} roughness={0.85} />
          </mesh>
        );
      }

      if (hasTopRightCorner) {
        decoElements.push(
          <mesh key="corner-deco-tr" name="cornerDecoTR" position={[0.4, 0.4, -0.4]} castShadow>
            <boxGeometry args={[0.2, 0.2, 0.03]} />
            <meshStandardMaterial color={decoColor} roughness={0.85} />
          </mesh>
        );
      }

      if (hasBottomLeftCorner) {
        decoElements.push(
          <mesh key="corner-deco-bl" name="cornerDecoBL" position={[-0.4, -0.4, 0.4]} castShadow>
            <boxGeometry args={[0.2, 0.2, 0.03]} />
            <meshStandardMaterial color={decoColor} roughness={0.85} />
          </mesh>
        );
      }

      if (hasBottomRightCorner) {
        decoElements.push(
          <mesh key="corner-deco-br" name="cornerDecoBR" position={[0.4, -0.4, 0.4]} castShadow>
            <boxGeometry args={[0.2, 0.2, 0.03]} />
            <meshStandardMaterial color={decoColor} roughness={0.85} />
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

      decoElements.push(
        <mesh key="side-deco" name="sideDecoration" position={decoPosition} rotation={decoRotation} castShadow>
          <boxGeometry args={[1.02, 0.1, 0.03]} />
          <meshStandardMaterial color={decoColor} roughness={0.88} />
        </mesh>
      );
    }

    return <>{decoElements}</>;
  };

  return (
    <group name="wallWithWindowCell" position={position}>
      <ShapedBox args={[1.0, 1.0, 1.0]} radii={radii} isIsolated={false}
        color={cell.color ?? '#e0c996'} roughness={0.94} castShadow receiveShadow />

      {/* Décorations murales adaptées au contexte du bloc */}
      {renderWallDecorations()}

      {/* Pierres apparentes - toujours présentes sur les murs (sauf toits) */}
      {renderStonePatches()}

      {exposedFaces.map((face, index) => renderFace(face, index, false))}
    </group>
  );
}