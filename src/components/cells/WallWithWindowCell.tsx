import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { getExposedFaces, hasOccupiedCell, getCornerRadii } from '../../utils/cellUtils';
import { varyColorBrightness } from '../../colorPalettes';
import { ShapedBox } from '../ShapedBox';

interface WallWithWindowCellProps {
  cell: GridCell;
  position: [number, number, number];
  lookup: CellLookup;
  isIsolated: boolean;
}

export function WallWithWindowCell({ cell, position, lookup, isIsolated }: WallWithWindowCellProps) {
  // Variation de fenêtre basée sur la position pour diversité
  const windowVariant = (cell.x + cell.z) % 3;
  const exposedFaces = getExposedFaces(lookup, cell);
  
  const baseColor = cell.color ?? '#e0c996';
  const quoinColor = varyColorBrightness(baseColor, -0.12);
  const patchColor = varyColorBrightness(baseColor, -0.15);
  const trimColor = varyColorBrightness(baseColor, -0.08);

  // ── Shape inheritance: corner radii driven by neighbours ──────────────────
  const radii = getCornerRadii(lookup, cell);

  const renderQuoins = () => {
    const corners = [
      { dx: -1, dz: -1 },
      { dx: 1, dz: -1 },
      { dx: -1, dz: 1 },
      { dx: 1, dz: 1 },
    ];

    return corners.map(({ dx, dz }, i) => {
      const adj1 = hasOccupiedCell(lookup, cell.x + dx, cell.y, cell.z);
      const adj2 = hasOccupiedCell(lookup, cell.x, cell.y, cell.z + dz);
      const diag = hasOccupiedCell(lookup, cell.x + dx, cell.y, cell.z + dz);
      const isExposed = !(adj1 && adj2 && diag);

      if (!isExposed) return null;

      const w1_x = 0.16;
      const w1_z = 0.08;
      const posX1 = dx * (0.5 - w1_x / 2);
      const posZ1 = dz * (0.5 - w1_z / 2);

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
    if (exposedFaces.length === 0) return null;

    const hash1 = Math.abs(cell.x * 23 + cell.y * 37 + cell.z * 13) % 100;
    const hash2 = Math.abs(cell.x * 61 + cell.y * 29 + cell.z * 43) % 100;

    if (hash1 > 40) return null;

    const face = exposedFaces[hash2 % exposedFaces.length];
    
    const offsetX = ((hash1 % 10) / 10 - 0.5) * 0.4;
    const offsetY = (((hash1 / 10) % 10) / 10 - 0.5) * 0.4;

    const w = 0.18 + (hash2 % 4) * 0.03;
    const h = 0.12 + ((hash2 / 4) % 3) * 0.02;

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

  // Tour isolée - meurtrières au lieu de fenêtres
  if (isIsolated) {
    // Fonction pour créer une meurtrière selon la rotation
    const createArrowSlit = (rotation: number, faceId: number) => {
      return (
        <group name="arrowSlit" rotation={[0, rotation, 0]} key={`arrowslit-${faceId}`}>
          {/* Meurtrière extérieure (large) */}
          <mesh name="arrowSlitOuter" position={[0, 0.1, 0.505]} castShadow receiveShadow>
            <RoundedBox args={[0.18, 0.55, 0.02]} radius={0.02} smoothness={4}>
              <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
            </RoundedBox>
          </mesh>
          {/* Ouverture intérieure sombre */}
          <mesh name="arrowSlitInner" position={[0, 0.1, 0.48]} castShadow receiveShadow>
            <RoundedBox args={[0.08, 0.48, 0.05]} radius={0.01} smoothness={4}>
              <meshStandardMaterial color="#0a0a0a" roughness={0.98} />
            </RoundedBox>
          </mesh>
          {/* Bord décoratif */}
          <mesh name="arrowSlitBorder" position={[0, 0.1, 0.51]} castShadow>
            <RoundedBox args={[0.22, 0.59, 0.01]} radius={0.03} smoothness={4}>
              <meshStandardMaterial color="#5a4a3a" roughness={0.88} />
            </RoundedBox>
          </mesh>
          
          {/* Meurtrière inférieure (plus petite) */}
          <mesh name="arrowSlitLower" position={[0, -0.28, 0.505]} castShadow receiveShadow>
            <RoundedBox args={[0.12, 0.18, 0.02]} radius={0.02} smoothness={4}>
              <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
            </RoundedBox>
          </mesh>
          <mesh name="arrowSlitLowerInner" position={[0, -0.28, 0.48]} castShadow receiveShadow>
            <RoundedBox args={[0.06, 0.12, 0.05]} radius={0.01} smoothness={4}>
              <meshStandardMaterial color="#0a0a0a" roughness={0.98} />
            </RoundedBox>
          </mesh>
        </group>
      );
    };
    
    return (
      <group name="wallWithWindowCell" position={position}>
        {/* Corps principal : cylindre circulaire (vraie tour ronde) */}
        <ShapedBox
          args={[1.0, 1.0, 1.0]}
          radii={radii}
          isIsolated={true}
          color={cell.color ?? '#d0baa0'}
          roughness={0.94}
          castShadow
          receiveShadow
        />
        
        {/* Bandes horizontales décoratives (anneau sur le cylindre) */}
        <mesh name="decorativeBandTop" position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.52, 0.52, 0.05, 24]} />
          <meshStandardMaterial color="#9a8a70" roughness={0.9} />
        </mesh>
        <mesh name="decorativeBandBottom" position={[0, -0.35, 0]} castShadow>
          <cylinderGeometry args={[0.52, 0.52, 0.05, 24]} />
          <meshStandardMaterial color="#9a8a70" roughness={0.9} />
        </mesh>

        {/* Créer des meurtrières sur chaque face exposée */}
        {exposedFaces.map((face, index) => {
          switch (face) {
            case 'front':
              return createArrowSlit(0, index);
            case 'back':
              return createArrowSlit(Math.PI, index);
            case 'left':
              return createArrowSlit(-Math.PI / 2, index);
            case 'right':
              return createArrowSlit(Math.PI / 2, index);
            default:
              return null;
          }
        })}
      </group>
    );
  }
  
  // Fonction pour créer une fenêtre selon le type et la rotation
  const createWindow = (rotation: number, faceId: number) => {
    const variant = (windowVariant + faceId) % 3;
    
    return (
      <group name="window" rotation={[0, rotation, 0]} key={`window-${faceId}`}>
        {variant === 0 && (
          // Grande fenêtre simple
          <>
            <mesh name="largeWindowOuter" position={[0, 0.08, 0.505]} castShadow receiveShadow>
              <RoundedBox args={[0.72, 0.68, 0.02]} radius={0.03} smoothness={4}>
                <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
              </RoundedBox>
            </mesh>
            <mesh name="largeWindowInner" position={[0, 0.08, 0.495]} castShadow receiveShadow>
              <RoundedBox args={[0.64, 0.6, 0.01]} radius={0.02} smoothness={4}>
                <meshStandardMaterial 
                  color="#2a3a4a" 
                  roughness={0.1} 
                  metalness={0.15} 
                  transparent 
                  opacity={0.85}
                />
              </RoundedBox>
            </mesh>
            <mesh name="largeWindowHorizontalBar" position={[0, 0.08, 0.51]} castShadow>
              <boxGeometry args={[0.68, 0.04, 0.01]} />
              <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
            </mesh>
            <mesh name="largeWindowVerticalBar" position={[0, 0.08, 0.51]} castShadow>
              <boxGeometry args={[0.04, 0.64, 0.01]} />
              <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
            </mesh>
            <mesh name="largeWindowLower" position={[0, -0.28, 0.52]} castShadow receiveShadow>
              <RoundedBox args={[0.78, 0.06, 0.08]} radius={0.02} smoothness={4}>
                <meshStandardMaterial color="#6a5a4a" roughness={0.82} />
              </RoundedBox>
            </mesh>
          </>
        )}

        {variant === 1 && (
          // Deux petites fenêtres côte à côte
          <>
            <mesh name="smallWindowLeftOuter" position={[-0.22, 0.08, 0.505]} castShadow receiveShadow>
              <RoundedBox args={[0.32, 0.56, 0.02]} radius={0.03} smoothness={4}>
                <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
              </RoundedBox>
            </mesh>
            <mesh name="smallWindowLeftInner" position={[-0.22, 0.08, 0.495]} castShadow receiveShadow>
              <RoundedBox args={[0.26, 0.48, 0.01]} radius={0.02} smoothness={4}>
                <meshStandardMaterial 
                  color="#2a3a4a" 
                  roughness={0.1} 
                  metalness={0.15} 
                  transparent 
                  opacity={0.85}
                />
              </RoundedBox>
            </mesh>
            <mesh name="smallWindowLeftVerticalBar" position={[-0.22, 0.08, 0.51]} castShadow>
              <boxGeometry args={[0.03, 0.52, 0.01]} />
              <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
            </mesh>
            <mesh name="smallWindowRightOuter" position={[0.22, 0.08, 0.505]} castShadow receiveShadow>
              <RoundedBox args={[0.32, 0.56, 0.02]} radius={0.03} smoothness={4}>
                <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
              </RoundedBox>
            </mesh>
            <mesh name="smallWindowRightInner" position={[0.22, 0.08, 0.495]} castShadow receiveShadow>
              <RoundedBox args={[0.26, 0.48, 0.01]} radius={0.02} smoothness={4}>
                <meshStandardMaterial 
                  color="#2a3a4a" 
                  roughness={0.1} 
                  metalness={0.15} 
                  transparent 
                  opacity={0.85}
                />
              </RoundedBox>
            </mesh>
            <mesh name="smallWindowRightVerticalBar" position={[0.22, 0.08, 0.51]} castShadow>
              <boxGeometry args={[0.03, 0.52, 0.01]} />
              <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
            </mesh>
            <mesh name="smallWindowLower" position={[0, -0.22, 0.52]} castShadow receiveShadow>
              <RoundedBox args={[0.78, 0.06, 0.08]} radius={0.02} smoothness={4}>
                <meshStandardMaterial color="#6a5a4a" roughness={0.82} />
              </RoundedBox>
            </mesh>
          </>
        )}

        {variant === 2 && (
          // Fenêtre avec volets
          <>
            <mesh name="largeWindowOuter" position={[0, 0.08, 0.505]} castShadow receiveShadow>
              <RoundedBox args={[0.58, 0.64, 0.02]} radius={0.03} smoothness={4}>
                <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
              </RoundedBox>
            </mesh>
            <mesh name="largeWindowInner" position={[0, 0.08, 0.495]} castShadow receiveShadow>
              <RoundedBox args={[0.5, 0.56, 0.01]} radius={0.02} smoothness={4}>
                <meshStandardMaterial 
                  color="#2a3a4a" 
                  roughness={0.1} 
                  metalness={0.15} 
                  transparent 
                  opacity={0.85}
                />
              </RoundedBox>
            </mesh>
            <mesh name="largeWindowHorizontalBar" position={[0, 0.08, 0.51]} castShadow>
              <boxGeometry args={[0.54, 0.03, 0.01]} />
              <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
            </mesh>
            <mesh name="largeWindowVerticalBar" position={[0, 0.08, 0.51]} castShadow>
              <boxGeometry args={[0.03, 0.6, 0.01]} />
              <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
            </mesh>
            <mesh name="largeWindowLeftShutter" position={[-0.38, 0.08, 0.505]} rotation={[0, -0.15, 0]} castShadow receiveShadow>
              <RoundedBox args={[0.16, 0.64, 0.03]} radius={0.02} smoothness={4}>
                <meshStandardMaterial color="#7a5a4a" roughness={0.9} />
              </RoundedBox>
            </mesh>
            {[0.2, 0.08, -0.04, -0.16].map((yOffset, i) => (
              <mesh key={`left-${i}`} name={`largeWindowLeftShutterBar${i}`} position={[-0.38, 0.08 + yOffset, 0.51]} rotation={[0, -0.15, 0]} castShadow>
                <boxGeometry args={[0.14, 0.02, 0.01]} />
                <meshStandardMaterial color="#6a4a3a" roughness={0.92} />
              </mesh>
            ))}
            <mesh name="largeWindowRightShutter" position={[0.38, 0.08, 0.505]} rotation={[0, 0.15, 0]} castShadow receiveShadow>
              <RoundedBox args={[0.16, 0.64, 0.03]} radius={0.02} smoothness={4}>
                <meshStandardMaterial color="#7a5a4a" roughness={0.9} />
              </RoundedBox>
            </mesh>
            {[0.2, 0.08, -0.04, -0.16].map((yOffset, i) => (
              <mesh key={`right-${i}`} name={`largeWindowRightShutterBar${i}`} position={[0.38, 0.08 + yOffset, 0.51]} rotation={[0, 0.15, 0]} castShadow>
                <boxGeometry args={[0.14, 0.02, 0.01]} />
                <meshStandardMaterial color="#6a4a3a" roughness={0.92} />
              </mesh>
            ))}
            <mesh name="largeWindowLower" position={[0, -0.26, 0.52]} castShadow receiveShadow>
              <RoundedBox args={[0.7, 0.06, 0.08]} radius={0.02} smoothness={4}>
                <meshStandardMaterial color="#6a5a4a" roughness={0.82} />
              </RoundedBox>
            </mesh>
          </>
        )}
      </group>
    );
  };
  
  return (
    <group name="wallWithWindowCell" position={position}>
      {/* Mur principal : coins arrondis sur les faces exposées, plats sur les joints */}
      <ShapedBox
        args={[1.0, 1.0, 1.0]}
        radii={radii}
        isIsolated={false}
        color={cell.color ?? '#e0c996'}
        roughness={0.94}
        castShadow
        receiveShadow
      />

      {/* Détails décoratifs : chaînages d'angle, maçonnerie apparente et plinthes */}
      {renderQuoins()}
      {renderStonePatches()}
      {renderBaseTrim()}

      {/* Créer des fenêtres sur chaque face exposée */}
      {exposedFaces.map((face, index) => {
        switch (face) {
          case 'front':
            return createWindow(0, index);           // Z+ (0°)
          case 'back':
            return createWindow(Math.PI, index);     // Z- (180°)
          case 'left':
            return createWindow(-Math.PI / 2, index); // X- (-90°)
          case 'right':
            return createWindow(Math.PI / 2, index);  // X+ (90°)
          default:
            return null;
        }
      })}
    </group>
  );
}
