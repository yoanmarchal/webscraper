import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../../types';

interface StandardCellProps {
  cell: GridCell;
  position: [number, number, number];
  isIsolated: boolean;
}

export function StandardCell({ cell, position, isIsolated }: StandardCellProps) {
  const isFoundation = cell.type === 'FOUNDATION';

  // Tour isolée - aspect de tour même pour les murs simples
  if (isIsolated) {
    return (
      <group position={position}>
        <RoundedBox args={[1.0, 1.0, 1.0]} radius={0.08} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color={cell.color ?? (isFoundation ? '#8d8a80' : '#c0b0a0')} roughness={0.94} />
        </RoundedBox>
        
        {/* Bandes horizontales décoratives pour tour */}
        <mesh position={[0, 0.35, 0]}>
          <RoundedBox args={[1.05, 0.04, 1.05]} radius={0.01} smoothness={4} castShadow>
            <meshStandardMaterial color={isFoundation ? '#6d6a60' : '#9a8a70'} roughness={0.9} />
          </RoundedBox>
        </mesh>
        <mesh position={[0, -0.35, 0]}>
          <RoundedBox args={[1.05, 0.04, 1.05]} radius={0.01} smoothness={4} castShadow>
            <meshStandardMaterial color={isFoundation ? '#6d6a60' : '#9a8a70'} roughness={0.9} />
          </RoundedBox>
        </mesh>
        
        {/* Éléments décoratifs aux coins pour aspect de tour */}
        {!isFoundation && (
          <>
            <mesh position={[-0.45, 0.1, -0.45]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 0.8, 8]} />
              <meshStandardMaterial color="#8a7a60" roughness={0.92} />
            </mesh>
            <mesh position={[0.45, 0.1, -0.45]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 0.8, 8]} />
              <meshStandardMaterial color="#8a7a60" roughness={0.92} />
            </mesh>
            <mesh position={[-0.45, 0.1, 0.45]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 0.8, 8]} />
              <meshStandardMaterial color="#8a7a60" roughness={0.92} />
            </mesh>
            <mesh position={[0.45, 0.1, 0.45]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 0.8, 8]} />
              <meshStandardMaterial color="#8a7a60" roughness={0.92} />
            </mesh>
          </>
        )}
        
        {/* Fondation renforcée pour tour */}
        {isFoundation && (
          <>
            {/* Base élargie */}
            <mesh position={[0, -0.46, 0]}>
              <RoundedBox args={[1.12, 0.06, 1.12]} radius={0.02} smoothness={4} castShadow receiveShadow>
                <meshStandardMaterial color="#7d7a70" roughness={0.96} />
              </RoundedBox>
            </mesh>
            
            {/* Joints de pierre en cercle */}
            {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
              <mesh key={i} position={[Math.cos(angle) * 0.48, 0, Math.sin(angle) * 0.48]} rotation={[0, angle, 0]}>
                <boxGeometry args={[0.02, 0.96, 0.05]} />
                <meshStandardMaterial color="#6d6a60" roughness={0.95} />
              </mesh>
            ))}
          </>
        )}
      </group>
    );
  }

  // Mur ou fondation standard (non-tour)
  return (
    <group position={position}>
      <RoundedBox args={[1.0, 1.0, 1.0]} radius={0.08} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={cell.color ?? '#b8b8b8'} roughness={0.94} />
      </RoundedBox>
      
      {/* Corniche horizontale sur les murs (pas sur les fondations) */}
      {!isFoundation && (
        <>
          <mesh position={[0, 0.46, 0]}>
            <RoundedBox args={[1.04, 0.06, 1.04]} radius={0.02} smoothness={4} castShadow receiveShadow>
              <meshStandardMaterial color="#d8c8ae" roughness={0.86} />
            </RoundedBox>
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <RoundedBox args={[1.02, 0.04, 1.02]} radius={0.01} smoothness={4} castShadow>
              <meshStandardMaterial color="#c8b89e" roughness={0.88} />
            </RoundedBox>
          </mesh>
        </>
      )}
      
      {/* Détails de fondation en pierre */}
      {isFoundation && (
        <>
          {/* Joints de pierre horizontaux */}
          <mesh position={[0, 0.15, 0.505]}>
            <boxGeometry args={[0.98, 0.02, 0.01]} />
            <meshStandardMaterial color="#6d6a60" roughness={0.95} />
          </mesh>
          <mesh position={[0, -0.15, 0.505]}>
            <boxGeometry args={[0.98, 0.02, 0.01]} />
            <meshStandardMaterial color="#6d6a60" roughness={0.95} />
          </mesh>
          <mesh position={[0.505, 0.15, 0]}>
            <boxGeometry args={[0.01, 0.02, 0.98]} />
            <meshStandardMaterial color="#6d6a60" roughness={0.95} />
          </mesh>
          <mesh position={[0.505, -0.15, 0]}>
            <boxGeometry args={[0.01, 0.02, 0.98]} />
            <meshStandardMaterial color="#6d6a60" roughness={0.95} />
          </mesh>
          
          {/* Joints verticaux */}
          <mesh position={[-0.25, 0, 0.505]}>
            <boxGeometry args={[0.02, 0.96, 0.01]} />
            <meshStandardMaterial color="#6d6a60" roughness={0.95} />
          </mesh>
          <mesh position={[0.25, 0, 0.505]}>
            <boxGeometry args={[0.02, 0.96, 0.01]} />
            <meshStandardMaterial color="#6d6a60" roughness={0.95} />
          </mesh>
          <mesh position={[-0.25, 0, -0.505]}>
            <boxGeometry args={[0.02, 0.96, 0.01]} />
            <meshStandardMaterial color="#6d6a60" roughness={0.95} />
          </mesh>
          <mesh position={[0.25, 0, -0.505]}>
            <boxGeometry args={[0.02, 0.96, 0.01]} />
            <meshStandardMaterial color="#6d6a60" roughness={0.95} />
          </mesh>
          
          {/* Base élargie de fondation */}
          <mesh position={[0, -0.48, 0]}>
            <RoundedBox args={[1.08, 0.02, 1.08]} radius={0.01} smoothness={4} castShadow receiveShadow>
              <meshStandardMaterial color="#7d7a70" roughness={0.96} />
            </RoundedBox>
          </mesh>
        </>
      )}
    </group>
  );
}
