import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../types';
import type { CellLookup, CornerRadii } from './cellUtils';
import { hasOccupiedCell } from './cellUtils';
import { varyColorBrightness } from '../colorPalettes';

export function isQuoinProtected(
  cell: GridCell,
  lookup: CellLookup,
  isIsolated: boolean,
  face: string,
  x: number,
  w: number
): boolean {
  if (isIsolated) return false;

  const margin = 0.20;
  const isNearLeft = x - w / 2 < -0.5 + margin;
  const isNearRight = x + w / 2 > 0.5 - margin;

  if (isNearLeft || isNearRight) {
    let dx = 0;
    let dz = 0;
    let cornerName: 'backLeft' | 'backRight' | 'frontLeft' | 'frontRight' = 'frontLeft';

    const checkEdge = (isLeftEdge: boolean) => {
      if (face === 'front') { dz = 1; dx = isLeftEdge ? -1 : 1; cornerName = isLeftEdge ? 'frontLeft' : 'frontRight'; }
      else if (face === 'back') { dz = -1; dx = isLeftEdge ? -1 : 1; cornerName = isLeftEdge ? 'backLeft' : 'backRight'; }
      else if (face === 'left') { dx = -1; dz = isLeftEdge ? -1 : 1; cornerName = isLeftEdge ? 'backLeft' : 'frontLeft'; }
      else if (face === 'right') { dx = 1; dz = isLeftEdge ? -1 : 1; cornerName = isLeftEdge ? 'backRight' : 'frontRight'; }

      if (cell.propertyBundle?.mergeFlags.suppressQuoin[cornerName]) return false;

      const adj1 = hasOccupiedCell(lookup, cell.x + dx, cell.y, cell.z);
      const adj2 = hasOccupiedCell(lookup, cell.x, cell.y, cell.z + dz);
      const diag = hasOccupiedCell(lookup, cell.x + dx, cell.y, cell.z + dz);
      return !(adj1 && adj2 && diag);
    };

    if (isNearLeft && checkEdge(true)) return true;
    if (isNearRight && checkEdge(false)) return true;
  }
  
  return false;
}

interface QuoinsConfig {
  cell: GridCell;
  lookup: CellLookup;
  isIsolated: boolean;
  baseColor: string;
  radii?: CornerRadii;
}

export function renderQuoins({ cell, lookup, isIsolated, baseColor, radii }: QuoinsConfig) {
  // Les tours (isIsolated) n'ont pas de quoins (coins d'angle)
  if (isIsolated) return null;

  // Vérifier si le propertyBundle existe et si nous devons supprimer les quoins
  if (cell.propertyBundle) {
    const { mergeFlags } = cell.propertyBundle;
    // Si tous les quoins sont supprimés, ne rien rendre
    if (
      mergeFlags.suppressQuoin.backLeft &&
      mergeFlags.suppressQuoin.backRight &&
      mergeFlags.suppressQuoin.frontLeft &&
      mergeFlags.suppressQuoin.frontRight
    ) {
      return null;
    }
  }

  const quoinColor = varyColorBrightness(baseColor, -0.12);

  const corners = [
    { dx: -1, dz: -1, cornerName: 'backLeft' as const },
    { dx: 1, dz: -1, cornerName: 'backRight' as const },
    { dx: -1, dz: 1, cornerName: 'frontLeft' as const },
    { dx: 1, dz: 1, cornerName: 'frontRight' as const },
  ];

  const renderedCorners = corners.map(({ dx, dz, cornerName }, i) => {
    // Vérifier si ce quoin spécifique est supprimé
    if (cell.propertyBundle?.mergeFlags.suppressQuoin[cornerName]) {
      return null;
    }

    // Ignorer le quoin si le coin est arrondi


    // Un coin est exposé si au moins un des côtés adjacents n'est pas occupé
    const adj1 = hasOccupiedCell(lookup, cell.x + dx, cell.y, cell.z);
    const adj2 = hasOccupiedCell(lookup, cell.x, cell.y, cell.z + dz);
    const diag = hasOccupiedCell(lookup, cell.x + dx, cell.y, cell.z + dz);
    const isExposed = !(adj1 && adj2 && diag);

    if (!isExposed) return null;

    // Décalage pour faire ressortir le quoin du mur et éviter les artefacts visuels
    const protrusion = 0.01;

    // Niveau 0 (bas) et Niveau 2 (haut) - longs le long de X
    const w1_x = 0.16;
    const w1_z = 0.08;
    const posX1 = dx * (0.5 + protrusion - w1_x / 2);
    const posZ1 = dz * (0.5 + protrusion - w1_z / 2);

    // Niveau 1 (milieu) - long le long de Z
    const w2_x = 0.08;
    const w2_z = 0.16;
    const posX2 = dx * (0.5 + protrusion - w2_x / 2);
    const posZ2 = dz * (0.5 + protrusion - w2_z / 2);

    return (
      <group key={`quoin-${i}`}>
        <mesh name={`quoinL0-${cornerName}`} position={[posX1, -0.32, posZ1]} castShadow receiveShadow>
          <RoundedBox args={[w1_x, 0.18, w1_z]} radius={0.01} smoothness={2}>
            <meshStandardMaterial color={quoinColor} roughness={0.9} />
          </RoundedBox>
        </mesh>
        <mesh name={`quoinL1-${cornerName}`} position={[posX2, 0.0, posZ2]} castShadow receiveShadow>
          <RoundedBox args={[w2_x, 0.18, w2_z]} radius={0.01} smoothness={2}>
            <meshStandardMaterial color={quoinColor} roughness={0.9} />
          </RoundedBox>
        </mesh>
        <mesh name={`quoinL2-${cornerName}`} position={[posX1, 0.32, posZ1]} castShadow receiveShadow>
          <RoundedBox args={[w1_x, 0.18, w1_z]} radius={0.01} smoothness={2}>
            <meshStandardMaterial color={quoinColor} roughness={0.9} />
          </RoundedBox>
        </mesh>
      </group>
    );
  });

  return <>{renderedCorners}</>;
}
