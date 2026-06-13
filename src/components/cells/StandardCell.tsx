import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { hasOccupiedCell, getExposedFaces } from '../../utils/cellUtils';
import { varyColorBrightness } from '../../colorPalettes';

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

  const renderQuoins = () => {
    const corners = [
      { dx: -1, dz: -1 },
      { dx: 1, dz: -1 },
      { dx: -1, dz: 1 },
      { dx: 1, dz: 1 },
    ];

    return corners.map(({ dx, dz }, i) => {
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

    // Calcul déterministe pour éviter les changements lors des re-rendus
    const hash1 = Math.abs(cell.x * 17 + cell.y * 31 + cell.z * 47) % 100;
    const hash2 = Math.abs(cell.x * 79 + cell.y * 13 + cell.z * 97) % 100;

    // 40% de chance d'avoir une plaque de maçonnerie apparente
    if (hash1 > 40) return null;

    const face = exposedFaces[hash2 % exposedFaces.length];
    
    // Décalage aléatoire sur le mur
    const offsetX = ((hash1 % 10) / 10 - 0.5) * 0.4;
    const offsetY = (((hash1 / 10) % 10) / 10 - 0.5) * 0.4;

    const w = 0.18 + (hash2 % 4) * 0.03; // 0.18 à 0.30
    const h = 0.12 + ((hash2 / 4) % 3) * 0.02; // 0.12 à 0.18

    let position: [number, number, number] = [0, 0, 0];
    let rotation: [number, number, number] = [0, 0, 0];

    switch (face) {
      case 'front':
        position = [offsetX, offsetY, 0.503];
        rotation = [0, 0, 0];
        break;
      case 'back':
        position = [offsetX, offsetY, -0.503];
        rotation = [0, Math.PI, 0];
        break;
      case 'left':
        position = [-0.503, offsetY, offsetX];
        rotation = [0, Math.PI / 2, 0];
        break;
      case 'right':
        position = [0.503, offsetY, offsetX];
        rotation = [0, -Math.PI / 2, 0];
        break;
    }

    return (
      <mesh name="stonePatch" position={position} rotation={rotation} castShadow receiveShadow>
        <RoundedBox args={[w, h, 0.01]} radius={0.005} smoothness={2}>
          <meshStandardMaterial color={patchColor} roughness={0.95} />
        </RoundedBox>
      </mesh>
    );
  };

  const renderBaseTrim = () => {
    const exposedFaces = getExposedFaces(lookup, cell);
    return exposedFaces.map((face, index) => {
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
        <RoundedBox args={[1.0, 1.0, 1.0]} radius={0.08} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color={baseColor} roughness={0.94} />
        </RoundedBox>
        
        {/* Bandes horizontales décoratives pour tour */}
        <mesh name="decorativeBandTop" position={[0, 0.455, 0]}>
          <RoundedBox args={[1.05, 0.04, 1.05]} radius={0.01} smoothness={4} castShadow>
            <meshStandardMaterial color={isFoundation ? '#6d6a60' : '#9a8a70'} roughness={0.9} />
          </RoundedBox>
        </mesh>
        
        {/* Éléments décoratifs aux coins pour aspect de tour */}
        {!isFoundation && (
          <>
            <mesh name="cornerDecoration0" position={[-0.45, 0, -0.45]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 1, 10]} />
              <meshStandardMaterial color="#8a7a60" roughness={0.92} />
            </mesh>
            <mesh name="cornerDecoration1" position={[0.45, 0, -0.45]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 1, 10]} />
              <meshStandardMaterial color="#8a7a60" roughness={0.92} />
            </mesh>
            <mesh name="cornerDecoration2" position={[-0.45, 0, 0.45]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 1, 10]} />
              <meshStandardMaterial color="#8a7a60" roughness={0.92} />
            </mesh>
            <mesh name="cornerDecoration3" position={[0.45, 0, 0.45]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 1, 10]} />
              <meshStandardMaterial color="#8a7a60" roughness={0.92} />
            </mesh>
          </>
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
      <RoundedBox args={[1.0, 1.0, 1.0]} radius={0.08} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={cell.color ?? '#b8b8b8'} roughness={0.94} />
      </RoundedBox>
      
      {/* Détails de murs et fondations : pierres d'angle, maçonnerie apparente et plinthes */}
      {renderQuoins()}
      {renderStonePatches()}
      {!isFoundation && renderBaseTrim()}

      {/* Corniche horizontale sur les murs (pas sur les fondations) */}
      {!isFoundation && (
        <>
          <mesh name='cornicheTop' position={[0, 0.46, 0]}>
            <RoundedBox args={[1.04, 0.06, 1.04]} radius={0.02} smoothness={4} castShadow receiveShadow>
              <meshStandardMaterial color="#d8c8ae" roughness={0.86} />
            </RoundedBox>
          </mesh>
          <mesh name='cornicheMiddle' position={[0, 0.38, 0]}>
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

