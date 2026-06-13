import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { getRoofConfig } from '../../utils/cellUtils';

interface RoofCellProps {
  cell: GridCell;
  position: [number, number, number];
  lookup: CellLookup;
  isIsolated: boolean;
}

export function RoofCell({ cell, position, lookup, isIsolated }: RoofCellProps) {
  const roofConfig = getRoofConfig(lookup, cell);
  const roofColor = cell.color ?? '#c85a3f';
  const roofColor2 = cell.color ?? '#b84731';
  
  // Toit de tour (bloc isolé) - créneaux raffinés
  if (isIsolated) {
    return (
      <group position={position}>
        {/* Anneau de base formant le chemin de ronde - collé au bas du bloc */}
        <mesh position={[0, -0.425, 0]} castShadow receiveShadow>
          <RoundedBox args={[1.15, 0.15, 1.15]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color="#9d3425" roughness={0.92} />
          </RoundedBox>
        </mesh>
        
        {/* Mur crénelé continu formant un anneau unique */}
        <mesh position={[0, -0.2, 0]} castShadow receiveShadow rotation={[0, Math.PI / 8, 0]}>
          <cylinderGeometry args={[0.54, 0.54, 0.25, 8, 1, false]} />
          <meshStandardMaterial color={roofColor} roughness={0.88} />
        </mesh>
        
        {/* Mur extérieur pour créer l'épaisseur */}
        <mesh position={[0, -0.2, 0]} castShadow receiveShadow rotation={[0, Math.PI / 8, 0]}>
          <cylinderGeometry args={[0.46, 0.46, 0.25, 8, 1, false]} />
          <meshStandardMaterial color={roofColor} roughness={0.88} />
        </mesh>
        
        {/* 8 créneaux (merlons) plus imposants */}
        {/* Coins - plus larges et plus hauts */}
        <mesh position={[-0.4, 0.1, -0.4]} castShadow receiveShadow>
          <RoundedBox args={[0.32, 0.55, 0.32]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh position={[0.4, 0.1, -0.4]} castShadow receiveShadow>
          <RoundedBox args={[0.32, 0.55, 0.32]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh position={[-0.4, 0.1, 0.4]} castShadow receiveShadow>
          <RoundedBox args={[0.32, 0.55, 0.32]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh position={[0.4, 0.1, 0.4]} castShadow receiveShadow>
          <RoundedBox args={[0.32, 0.55, 0.32]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        
        {/* Créneaux sur les faces - plus larges */}
        <mesh position={[0, 0.05, -0.52]} castShadow receiveShadow>
          <RoundedBox args={[0.35, 0.45, 0.12]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh position={[0, 0.05, 0.52]} castShadow receiveShadow>
          <RoundedBox args={[0.35, 0.45, 0.12]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh position={[-0.52, 0.05, 0]} castShadow receiveShadow>
          <RoundedBox args={[0.12, 0.45, 0.35]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh position={[0.52, 0.05, 0]} castShadow receiveShadow>
          <RoundedBox args={[0.12, 0.45, 0.35]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        
        {/* Plateforme intérieure */}
        <mesh position={[0, -0.31, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.58, 0.58, 0.1, 32]} />
          <meshStandardMaterial color={roofColor2} roughness={0.9} />
        </mesh>
        
        {/* Toit conique amélioré avec tuiles apparentes */}
        {/* Base du toit avec bordure */}
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.42, 0.48, 0.1, 8]} />
          <meshStandardMaterial color={roofColor} roughness={0.88} />
        </mesh>
        
        {/* Dôme conique principal plus élancé */}
        <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.38, 0.7, 8]} />
          <meshStandardMaterial color="#7b241b" roughness={0.85} />
        </mesh>
        
        {/* Segments de tuiles (anneaux décoratifs) */}
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.35, 0.36, 0.04, 8]} />
          <meshStandardMaterial color="#8b2a1f" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.25, 0.26, 0.04, 8]} />
          <meshStandardMaterial color="#8b2a1f" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.15, 0.16, 0.04, 8]} />
          <meshStandardMaterial color="#8b2a1f" roughness={0.9} />
        </mesh>
        
        {/* Finial (pointe) au sommet */}
        <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.06, 0.15, 8]} />
          <meshStandardMaterial color="#6b1b13" roughness={0.85} />
        </mesh>
        
        {/* Sphère décorative dorée */}
        <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#d4a04f" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>
    );
  }
  
  // Toit de coin (forme en L)
  if (roofConfig.isCorner) {
    const rotation = 
      roofConfig.hasLeft && roofConfig.hasFront ? Math.PI * 0.5 :
      roofConfig.hasLeft && roofConfig.hasBack ? Math.PI :
      roofConfig.hasRight && roofConfig.hasBack ? Math.PI * 1.5 :
      0; // hasRight && hasFront
    
    return (
      <group position={position} rotation={[0, rotation, 0]}>
        {/* Structure de base sous le toit */}
        <mesh position={[0, -0.42, 0]} castShadow receiveShadow>
          <RoundedBox args={[1.0, 0.12, 1.0]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color="#9d3425" roughness={0.92} />
          </RoundedBox>
        </mesh>
        
        {/* Toit principal (côté droit) */}
        <mesh rotation={[Math.PI / 4, 0, 0]} position={[0.2, 0.12, 0]} castShadow receiveShadow>
          <RoundedBox args={[0.7, 0.14, 0.85]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh rotation={[-Math.PI / 4, 0, 0]} position={[0.2, 0.12, 0]} castShadow receiveShadow>
          <RoundedBox args={[0.7, 0.14, 0.85]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        
        {/* Toit perpendiculaire (côté avant) */}
        <mesh rotation={[0, 0, Math.PI / 4]} position={[0, 0.12, 0.2]} castShadow receiveShadow>
          <RoundedBox args={[0.85, 0.14, 0.7]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]} position={[0, 0.12, 0.2]} castShadow receiveShadow>
          <RoundedBox args={[0.85, 0.14, 0.7]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        
        {/* Faîtage */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <RoundedBox args={[0.6, 0.08, 0.08]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color="#7b241b" roughness={0.92} />
          </RoundedBox>
        </mesh>
        <mesh position={[0, 0.4, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
          <RoundedBox args={[0.6, 0.08, 0.08]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color="#7b241b" roughness={0.92} />
          </RoundedBox>
        </mesh>
      </group>
    );
  }
  
  // Toit d'extrémité avec pignon
  if (roofConfig.isEnd) {
    const rotation = 
      roofConfig.hasLeft ? Math.PI * 0.5 :
      roofConfig.hasBack ? Math.PI :
      roofConfig.hasRight ? Math.PI * 1.5 :
      0; // hasFront
    
    return (
      <group position={position} rotation={[0, rotation, 0]}>
        {/* Structure de base sous le toit */}
        <mesh position={[0, -0.42, 0]} castShadow receiveShadow>
          <RoundedBox args={[1.0, 0.12, 1.0]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color="#9d3425" roughness={0.92} />
          </RoundedBox>
        </mesh>
        
        {/* Pignon (mur triangulaire à l'extrémité) */}
        <mesh position={[0, 0.05, -0.48]} castShadow receiveShadow>
          <boxGeometry args={[0.86, 0.7, 0.05]} />
          <meshStandardMaterial color="#b8a890" roughness={0.94} />
        </mesh>
        
        {/* Plans de toit inclinés */}
        <mesh rotation={[Math.PI / 4, 0, 0]} position={[0, 0.15, 0]} castShadow receiveShadow>
          <RoundedBox args={[1.1, 0.14, 0.8]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh rotation={[-Math.PI / 4, 0, 0]} position={[0, 0.15, 0]} castShadow receiveShadow>
          <RoundedBox args={[1.1, 0.14, 0.8]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        
        {/* Faîtage (arête du toit) */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <RoundedBox args={[1.16, 0.08, 0.1]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color="#7b241b" roughness={0.92} />
          </RoundedBox>
        </mesh>
        
        {/* Tuiles décoratives le long du faîtage */}
        {[-0.3, -0.1, 0.1, 0.3].map((xOffset, i) => (
          <mesh key={i} position={[xOffset, 0.46, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.12, 8]} />
            <meshStandardMaterial color="#8b3424" roughness={0.9} />
          </mesh>
        ))}
      </group>
    );
  }
  
  // Toit standard (simple faîte)
  const roofAxis = roofConfig.axis;
  
  return (
    <group position={position}>
      {/* Structure de base sous le toit */}
      <mesh position={[0, -0.42, 0]} castShadow receiveShadow>
        <RoundedBox args={[1.0, 0.12, 1.0]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color="#9d3425" roughness={0.92} />
        </RoundedBox>
      </mesh>
      
      {/* Plans de toit inclinés */}
      <mesh
        rotation={roofAxis === 'x' ? [0, 0, Math.PI / 4] : [Math.PI / 4, 0, 0]}
        position={[0, 0.12, 0]}
        castShadow
        receiveShadow
      >
        <RoundedBox args={[1.32, 0.14, 0.68]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color={roofColor} roughness={0.88} />
        </RoundedBox>
      </mesh>
      <mesh
        rotation={roofAxis === 'x' ? [0, 0, -Math.PI / 4] : [-Math.PI / 4, 0, 0]}
        position={[0, 0.12, 0]}
        castShadow
        receiveShadow
      >
        <RoundedBox args={[1.32, 0.14, 0.68]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color={roofColor2} roughness={0.88} />
        </RoundedBox>
      </mesh>
      
      {/* Faîtage (arête du toit) */}
      <mesh 
        position={[0, 0.4, 0]} 
        rotation={roofAxis === 'x' ? [0, 0, 0] : [0, Math.PI / 2, 0]}
        castShadow 
        receiveShadow
      >
        <RoundedBox args={[1.36, 0.08, 0.12]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color="#7b241b" roughness={0.92} />
        </RoundedBox>
      </mesh>
      
      {/* Tuiles décoratives le long du faîtage */}
      {roofAxis === 'x' ? (
        <>
          <mesh position={[-0.35, 0.44, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#8b3424" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.44, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#8b3424" roughness={0.9} />
          </mesh>
          <mesh position={[0.35, 0.44, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#8b3424" roughness={0.9} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.44, -0.35]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#8b3424" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.44, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#8b3424" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.44, 0.35]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#8b3424" roughness={0.9} />
          </mesh>
        </>
      )}
    </group>
  );
}
