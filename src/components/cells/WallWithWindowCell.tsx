import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { getExposedFaces } from '../../utils/cellUtils';

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
        {/* Mur principal de la tour */}
        <RoundedBox args={[1.0, 1.0, 1.0]} radius={0.08} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color={cell.color ?? '#d0baa0'} roughness={0.94} />
        </RoundedBox>
        
        {/* Bandes horizontales décoratives */}
        <mesh name="decorativeBandTop" position={[0, 0.35, 0]}>
          <RoundedBox args={[1.05, 0.04, 1.05]} radius={0.01} smoothness={4} castShadow>
            <meshStandardMaterial color="#9a8a70" roughness={0.9} />
          </RoundedBox>
        </mesh>
        <mesh name="decorativeBandBottom" position={[0, -0.35, 0]}>
          <RoundedBox args={[1.05, 0.04, 1.05]} radius={0.01} smoothness={4} castShadow>
            <meshStandardMaterial color="#9a8a70" roughness={0.9} />
          </RoundedBox>
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
      {/* Mur principal */}
      <RoundedBox args={[1.0, 1.0, 1.0]} radius={0.08} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={cell.color ?? '#e0c996'} roughness={0.94} />
      </RoundedBox>

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
