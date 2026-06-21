import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { hasOccupiedCell, getExposedFaces, getCornerRadii } from '../../utils/cellUtils';
import { varyColorBrightness } from '../../colorPalettes';
import { ShapedBox } from '../ShapedBox';

interface StandardCellProps {
  cell: GridCell;
  position: [number, number, number];
  lookup: CellLookup;
  isIsolated: boolean;
}

export function StandardCell({ cell, position, lookup, isIsolated }: StandardCellProps) {
  // Debug: vérifier si la cellule a un propertyBundle
  console.log(`StandardCell (${cell.x},${cell.y},${cell.z}) - has propertyBundle:`, !!cell.propertyBundle);
  if (cell.propertyBundle) {
    console.log(`StandardCell (${cell.x},${cell.y},${cell.z}) - decorationStyle:`, cell.propertyBundle.decorationStyle);
    console.log(`StandardCell (${cell.x},${cell.y},${cell.z}) - mergeFlags:`, cell.propertyBundle.mergeFlags);
  }

  const isFoundation = cell.type === 'FOUNDATION';
  const baseColor = cell.color ?? (isFoundation ? '#8d8a80' : '#c0b0a0');

  const quoinColor = varyColorBrightness(baseColor, -0.12);
  const patchColor = varyColorBrightness(baseColor, -0.15);
  const trimColor = varyColorBrightness(baseColor, -0.08);

  // ── Shape inheritance: corner radii driven by neighbours ──────────────────
  const radii = getCornerRadii(lookup, cell);

  const renderQuoins = () => {
    // Vérifier si le propertyBundle existe et si nous devons supprimer les quoins
    if (cell.propertyBundle) {
      const { mergeFlags } = cell.propertyBundle;

      // Si tous les quoins sont supprimés, ne rien rendre
      if (mergeFlags.suppressQuoin.backLeft && mergeFlags.suppressQuoin.backRight &&
          mergeFlags.suppressQuoin.frontLeft && mergeFlags.suppressQuoin.frontRight) {
        return null;
      }
    }

    const corners = [
      { dx: -1, dz: -1, cornerName: 'backLeft' as const },
      { dx: 1, dz: -1, cornerName: 'frontRight' as const },
      { dx: -1, dz: 1, cornerName: 'frontLeft' as const },
      { dx: 1, dz: 1, cornerName: 'backRight' as const },
    ];

    return corners.map(({ dx, dz, cornerName }, i) => {
      // Vérifier si ce quoin spécifique est supprimé
      if (cell.propertyBundle?.mergeFlags.suppressQuoin[cornerName]) {
        return null;
      }

      // Un coin est exposé si au moins un des côtés adjacents n'est pas occupé
      const adj1 = hasOccupiedCell(lookup, cell.x + dx, cell.y, cell.z);
      const adj2 = hasOccupiedCell(lookup, cell.x, cell.y, cell.z + dz);
      const diag = hasOccupiedCell(lookup, cell.x + dx, cell.y, cell.z + dz);
      const isExposed = !(adj1 && adj2 && diag);

      if (!isExposed) return null;

      // Niveau 0 (bas) et Niveau 2 (haut) - longs le long de X
      const w1_x = 0.16;
      const w1_z = 0.08;
      const posX1 = dx * (0.5 - w1_x / 2);
      const posZ1 = dz * (0.5 - w1_z / 2);

      // Niveau 1 (milieu) - long le long de Z
      const w2_x = 0.08;
      const w2_z = 0.16;
      const posX2 = dx * (0.5 - w2_x / 2);
      const posZ2 = dz * (0.5 - w2_z / 2);

      return (
        <group key={`quoin-${i}`}>
          <mesh name="quoinL0" position={[posX1, -0.32, posZ1]} castShadow receiveShadow>
            <RoundedBox args={[w1_x, 0.18, w1_z]} radius={0.01} smoothness={2}>
              <meshStandardMaterial color={quoinColor} roughness={0.9} />
            </RoundedBox>
          </mesh>
          <mesh name="quoinL1" position={[posX2, 0.0, posZ2]} castShadow receiveShadow>
            <RoundedBox args={[w2_x, 0.18, w2_z]} radius={0.01} smoothness={2}>
              <meshStandardMaterial color={quoinColor} roughness={0.9} />
            </RoundedBox>
          </mesh>
          <mesh name="quoinL2" position={[posX1, 0.32, posZ1]} castShadow receiveShadow>
            <RoundedBox args={[w1_x, 0.18, w1_z]} radius={0.01} smoothness={2}>
              <meshStandardMaterial color={quoinColor} roughness={0.9} />
            </RoundedBox>
          </mesh>
        </group>
      );
    });
  };

  const renderStonePatches = () => {
    const exposedFaces = getExposedFaces(lookup, cell);
    if (exposedFaces.length === 0) return null;

    // Seul le style STONE affiche les pierres apparentes
    const hasStoneStyle = cell.propertyBundle?.decorationStyle === 'STONE';
    if (!hasStoneStyle) return null;

    const stones: JSX.Element[] = [];

    // Rayon des arcs de coin tel que défini dans ShapedBox (EDGE_R = 0.18)
    // Centre des arcs à ±(0.5 - EDGE_R) = ±0.32
    const EDGE_R = 0.18;
    const FLAT_LIMIT = 0.5 - EDGE_R; // 0.32 : limite de la zone plate

    /**
     * Définition des zones protégées pour éviter les superpositions
     * avec les quoins (coins) et la base trim
     * Les quoins sont positionnés aux coins : (±0.42, ±0.46) et (±0.46, ±0.42)
     * avec des tailles de 0.16×0.18×0.08 et 0.08×0.18×0.16
     */
    const PROTECTED_AREAS = {
      // Zones des coins sur chaque face
      // Pour chaque coin, on protège une zone autour
      corner: { marginX: 0.12, marginY: 0.12 },
      // Zone de la base trim (en bas de chaque face)
      baseTrim: { marginY: 0.10, centerY: -0.46 },
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
      // Vérifier les coins de la face
      // Sur chaque face (qui va de -0.5 à 0.5 en x et y),
      // les coins sont aux extrémités : (-0.5, -0.5), (-0.5, 0.5), (0.5, -0.5), (0.5, 0.5)
      
      const cornerMarginX = PROTECTED_AREAS.corner.marginX;
      const cornerMarginY = PROTECTED_AREAS.corner.marginY;
      
      // Calculer la distance du bord de la pierre au coin
      // Coin haut-gauche (-0.5, 0.5)
      const distToTL_X = Math.abs(x - (-0.5)) - stoneWidth / 2;
      const distToTL_Y = Math.abs(y - 0.5) - stoneHeight / 2;
      if (distToTL_X < cornerMarginX && distToTL_Y < cornerMarginY) return true;
      
      // Coin haut-droite (0.5, 0.5)
      const distToTR_X = Math.abs(x - 0.5) - stoneWidth / 2;
      const distToTR_Y = Math.abs(y - 0.5) - stoneHeight / 2;
      if (distToTR_X < cornerMarginX && distToTR_Y < cornerMarginY) return true;
      
      // Coin bas-gauche (-0.5, -0.5)
      const distToBL_X = Math.abs(x - (-0.5)) - stoneWidth / 2;
      const distToBL_Y = Math.abs(y - (-0.5)) - stoneHeight / 2;
      if (distToBL_X < cornerMarginX && distToBL_Y < cornerMarginY) return true;
      
      // Coin bas-droite (0.5, -0.5)
      const distToBR_X = Math.abs(x - 0.5) - stoneWidth / 2;
      const distToBR_Y = Math.abs(y - (-0.5)) - stoneHeight / 2;
      if (distToBR_X < cornerMarginX && distToBR_Y < cornerMarginY) return true;
      
      // Vérifier la zone de la base trim (en bas)
      const baseArea = PROTECTED_AREAS.baseTrim;
      const closestY_Base = Math.abs(y - baseArea.centerY) - stoneHeight / 2;
      if (closestY_Base < baseArea.marginY) return true;
      
      return false;
    };

    /**
     * Projette un point (latéral t, profondeur nominale 0.5) sur la surface
     * réelle d'une face, en tenant compte des coins arrondis.
     * Retourne { surfaceZ: profondeur réelle, rotY: rotation tangente }
     * dans le repère local de la face (Z+ = profondeur de sortie).
     *
     * cornerRoundedNeg : coin arrondi côté t < 0 ?
     * cornerRoundedPos : coin arrondi côté t > 0 ?
     */
    const projectOnFace = (
      t: number,
      cornerRoundedNeg: boolean,
      cornerRoundedPos: boolean,
    ): { surfaceZ: number; rotY: number } => {
      if (t > FLAT_LIMIT && cornerRoundedPos) {
        // Zone de coin arrondi côté positif
        const cx = FLAT_LIMIT; // centre de l'arc en X
        const cz = FLAT_LIMIT; // centre de l'arc en Z
        const dx = Math.min(t - cx, EDGE_R); // clamp au quart de cercle
        const theta = Math.asin(dx / EDGE_R);
        return {
          surfaceZ: cz + EDGE_R * Math.cos(theta),
          rotY: theta,
        };
      } else if (t < -FLAT_LIMIT && cornerRoundedNeg) {
        // Zone de coin arrondi côté négatif
        const cx = -FLAT_LIMIT;
        const cz = FLAT_LIMIT;
        const dx = Math.max(t - cx, -EDGE_R);
        const theta = Math.asin(dx / EDGE_R); // négatif
        return {
          surfaceZ: cz + EDGE_R * Math.cos(theta),
          rotY: theta,
        };
      }
      // Zone plate
      return { surfaceZ: 0.5, rotY: 0 };
    };

    // Taille de base des pierres
    const baseW = 0.14;
    const baseH = 0.09;

    // Nombre de pierres par face (3-5 selon seed)
    const stonesPerFace = 3 + (Math.abs(cell.x * 3 + cell.z * 7) % 3);

    exposedFaces.forEach((face, faceIdx) => {
      for (let i = 0; i < stonesPerFace; i++) {
        // Hash déterministe par face + pierre
        const seed = Math.abs(cell.x * 17 + cell.y * 31 + cell.z * 47 + faceIdx * 23 + i * 59);
        const h1 = seed % 100;
        const h2 = (seed * 7 + 13) % 100;
        const h3 = (seed * 3 + 41) % 100;

        // Variation de taille
        const w = baseW + (h2 % 5) * 0.018; // 0.14 → 0.21
        const h = baseH + (h3 % 4) * 0.012; // 0.09 → 0.14

        // Position dans les quadrants, évitant le centre
        const quadrant = i % 4;
        const signX = (quadrant === 0 || quadrant === 2) ? -1 : 1;
        const signY = (quadrant === 0 || quadrant === 1) ? -1 : 1;
        const distX = 0.20 + (h1 % 20) * 0.01; // 0.20 → 0.39
        const distY = 0.18 + (h2 % 18) * 0.01;
        const offsetX = signX * distX;
        const offsetY = signY * distY;

        // Vérifier si cette pierre est dans une zone protégée (coin ou base trim)
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

          // Le signe de la projection dépend de la face pour garder la
          // cohérence avec la direction latérale sur chaque face :
          //   front : X+ → angle+   back  : X+ → angle-
          //   left  : Z+ → angle+   right : Z+ → angle-
          const lateralSign = (face === 'back' || face === 'right') ? -1 : 1;

          const radius = 0.502;
          // Clamp pour éviter asin hors domaine
          const safeT = Math.max(-radius * 0.95, Math.min(radius * 0.95, offsetX));
          const angle = baseFaceAngle + lateralSign * Math.asin(safeT / radius);

          const posX = Math.sin(angle) * radius;
          const posZ = Math.cos(angle) * radius;
          const rotY = angle;

          stones.push(
            <mesh
              key={`stone-${face}-${i}`}
              name={`stonePatch-${face}-${i}`}
              position={[posX, offsetY, posZ]}
              rotation={[0, rotY, 0]}
              castShadow
              receiveShadow
            >
              <RoundedBox args={[w, h, 0.012]} radius={0.004} smoothness={2}>
                <meshStandardMaterial color={patchColor} roughness={0.95} />
              </RoundedBox>
            </mesh>
          );
        } else {
          // ── Mur avec coins éventuellement arrondis ────────────────────────
          // Détecter si chaque coin de la face est arrondi
          let pos: [number, number, number] = [0, 0, 0];
          let rot: [number, number, number] = [0, 0, 0];

          switch (face) {
            case 'front': {
              // Face Z+ : latéral = X, profondeur = Z
              // Coins : frontLeft (X-), frontRight (X+)
              const crNeg = radii.frontLeft > 0.01;
              const crPos = radii.frontRight > 0.01;
              const { surfaceZ, rotY } = projectOnFace(offsetX, crNeg, crPos);
              pos = [offsetX, offsetY, surfaceZ + 0.003];
              rot = [0, rotY, 0];
              break;
            }
            case 'back': {
              // Face Z- : latéral = X (inversé), profondeur = -Z
              // Coins : backLeft (X-), backRight (X+)
              const crNeg = radii.backLeft > 0.01;
              const crPos = radii.backRight > 0.01;
              const { surfaceZ, rotY } = projectOnFace(offsetX, crNeg, crPos);
              pos = [offsetX, offsetY, -(surfaceZ + 0.003)];
              rot = [0, Math.PI - rotY, 0];
              break;
            }
            case 'left': {
              // Face X- : latéral = Z, profondeur = -X
              // Coins : backLeft (Z-), frontLeft (Z+)
              const crNeg = radii.backLeft > 0.01;
              const crPos = radii.frontLeft > 0.01;
              const { surfaceZ, rotY } = projectOnFace(offsetX, crNeg, crPos);
              pos = [-(surfaceZ + 0.003), offsetY, offsetX];
              rot = [0, Math.PI / 2 + rotY, 0];
              break;
            }
            case 'right': {
              // Face X+ : latéral = Z, profondeur = X
              // Coins : backRight (Z-), frontRight (Z+)
              const crNeg = radii.backRight > 0.01;
              const crPos = radii.frontRight > 0.01;
              const { surfaceZ, rotY } = projectOnFace(offsetX, crNeg, crPos);
              pos = [surfaceZ + 0.003, offsetY, offsetX];
              rot = [0, -(Math.PI / 2 + rotY), 0];
              break;
            }
          }

          stones.push(
            <mesh
              key={`stone-${face}-${i}`}
              name={`stonePatch-${face}-${i}`}
              position={pos}
              rotation={rot}
              castShadow
              receiveShadow
            >
              <RoundedBox args={[w, h, 0.012]} radius={0.004} smoothness={2}>
                <meshStandardMaterial color={patchColor} roughness={0.95} />
              </RoundedBox>
            </mesh>
          );
        }
      }
    });

    return <>{stones}</>;
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

        {/* Éléments décoratifs : bande horizontale moins ronde */}
        {!isFoundation && (
          <mesh name="decorativeBandTop" position={[0, 0.455, 0]}>
            <RoundedBox args={[1.05, 0.04, 1.05]} radius={0.2} smoothness={4} castShadow>
              <meshStandardMaterial color="#9a8a70" roughness={0.9} />
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
      {renderQuoins()}
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

