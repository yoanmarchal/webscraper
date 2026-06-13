import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../types';
import type { CellLookup } from '../utils/cellUtils';
import {
  getRoofConfig,
  getArchAxis,
  getExposedFaces,
  isIsolatedBlock,
} from '../utils/cellUtils';

interface CellMeshProps {
  cell: GridCell;
  toWorldPosition: (x: number, y: number, z: number) => [number, number, number];
  lookup: CellLookup;
}

export function CellMesh({ cell, toWorldPosition, lookup }: CellMeshProps) {
  const position = toWorldPosition(cell.x, cell.y, cell.z);
  const isIsolated = isIsolatedBlock(lookup, cell);

  if (cell.type === 'ROOF') {
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

  if (cell.type === 'ARCH') {
    const archAxis = getArchAxis(lookup, cell);

    return (
      <group position={position} rotation={archAxis === 'z' ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
        <mesh position={archAxis === 'x' ? [-0.32, 0, 0] : [0, 0, -0.32]} castShadow receiveShadow>
          <RoundedBox args={[archAxis === 'x' ? 0.28 : 0.3, 1.0, archAxis === 'x' ? 0.3 : 0.28]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={cell.color ?? '#9f8f7b'} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh position={archAxis === 'x' ? [0.32, 0, 0] : [0, 0, 0.32]} castShadow receiveShadow>
          <RoundedBox args={[archAxis === 'x' ? 0.28 : 0.3, 1.0, archAxis === 'x' ? 0.3 : 0.28]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={cell.color ?? '#9f8f7b'} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <torusGeometry args={[0.36, 0.1, 12, 32, Math.PI]} />
          <meshStandardMaterial color={cell.color ?? '#9f8f7b'} roughness={0.82} />
        </mesh>
        <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
          <RoundedBox args={[1.0, 0.14, 0.26]} radius={0.03} smoothness={4}>
            <meshStandardMaterial color={cell.color ?? '#8f7f6e'} roughness={0.88} />
          </RoundedBox>
        </mesh>
      </group>
    );
  }

  if (cell.type === 'WALL_WINDOW') {
    // Variation de fenêtre basée sur la position pour diversité
    const windowVariant = (cell.x + cell.z) % 3;
    const exposedFaces = getExposedFaces(lookup, cell);
    
    // Tour isolée - meurtrières au lieu de fenêtres
    if (isIsolated) {
      // Fonction pour créer une meurtrière selon la rotation
      const createArrowSlit = (rotation: number, faceId: number) => {
        return (
          <group rotation={[0, rotation, 0]} key={`arrowslit-${faceId}`}>
            {/* Meurtrière extérieure (large) */}
            <mesh position={[0, 0.1, 0.505]} castShadow receiveShadow>
              <RoundedBox args={[0.18, 0.55, 0.02]} radius={0.02} smoothness={4}>
                <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
              </RoundedBox>
            </mesh>
            {/* Ouverture intérieure sombre */}
            <mesh position={[0, 0.1, 0.48]} castShadow receiveShadow>
              <RoundedBox args={[0.08, 0.48, 0.05]} radius={0.01} smoothness={4}>
                <meshStandardMaterial color="#0a0a0a" roughness={0.98} />
              </RoundedBox>
            </mesh>
            {/* Bord décoratif */}
            <mesh position={[0, 0.1, 0.51]} castShadow>
              <RoundedBox args={[0.22, 0.59, 0.01]} radius={0.03} smoothness={4}>
                <meshStandardMaterial color="#5a4a3a" roughness={0.88} />
              </RoundedBox>
            </mesh>
            
            {/* Meurtrière inférieure (plus petite) */}
            <mesh position={[0, -0.28, 0.505]} castShadow receiveShadow>
              <RoundedBox args={[0.12, 0.18, 0.02]} radius={0.02} smoothness={4}>
                <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
              </RoundedBox>
            </mesh>
            <mesh position={[0, -0.28, 0.48]} castShadow receiveShadow>
              <RoundedBox args={[0.06, 0.12, 0.05]} radius={0.01} smoothness={4}>
                <meshStandardMaterial color="#0a0a0a" roughness={0.98} />
              </RoundedBox>
            </mesh>
          </group>
        );
      };
      
      return (
        <group position={position}>
          {/* Mur principal de la tour */}
          <RoundedBox args={[1.0, 1.0, 1.0]} radius={0.08} smoothness={4} castShadow receiveShadow>
            <meshStandardMaterial color={cell.color ?? '#d0baa0'} roughness={0.94} />
          </RoundedBox>
          
          {/* Bandes horizontales décoratives */}
          <mesh position={[0, 0.35, 0]}>
            <RoundedBox args={[1.05, 0.04, 1.05]} radius={0.01} smoothness={4} castShadow>
              <meshStandardMaterial color="#9a8a70" roughness={0.9} />
            </RoundedBox>
          </mesh>
          <mesh position={[0, -0.35, 0]}>
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
        <group rotation={[0, rotation, 0]} key={`window-${faceId}`}>
          {variant === 0 && (
            // Grande fenêtre simple
            <>
              <mesh position={[0, 0.08, 0.505]} castShadow receiveShadow>
                <RoundedBox args={[0.72, 0.68, 0.02]} radius={0.03} smoothness={4}>
                  <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
                </RoundedBox>
              </mesh>
              <mesh position={[0, 0.08, 0.495]} castShadow receiveShadow>
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
              <mesh position={[0, 0.08, 0.51]} castShadow>
                <boxGeometry args={[0.68, 0.04, 0.01]} />
                <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
              </mesh>
              <mesh position={[0, 0.08, 0.51]} castShadow>
                <boxGeometry args={[0.04, 0.64, 0.01]} />
                <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
              </mesh>
              <mesh position={[0, -0.28, 0.52]} castShadow receiveShadow>
                <RoundedBox args={[0.78, 0.06, 0.08]} radius={0.02} smoothness={4}>
                  <meshStandardMaterial color="#6a5a4a" roughness={0.82} />
                </RoundedBox>
              </mesh>
            </>
          )}

          {variant === 1 && (
            // Deux petites fenêtres côte à côte
            <>
              <mesh position={[-0.22, 0.08, 0.505]} castShadow receiveShadow>
                <RoundedBox args={[0.32, 0.56, 0.02]} radius={0.03} smoothness={4}>
                  <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
                </RoundedBox>
              </mesh>
              <mesh position={[-0.22, 0.08, 0.495]} castShadow receiveShadow>
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
              <mesh position={[-0.22, 0.08, 0.51]} castShadow>
                <boxGeometry args={[0.03, 0.52, 0.01]} />
                <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
              </mesh>
              <mesh position={[0.22, 0.08, 0.505]} castShadow receiveShadow>
                <RoundedBox args={[0.32, 0.56, 0.02]} radius={0.03} smoothness={4}>
                  <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
                </RoundedBox>
              </mesh>
              <mesh position={[0.22, 0.08, 0.495]} castShadow receiveShadow>
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
              <mesh position={[0.22, 0.08, 0.51]} castShadow>
                <boxGeometry args={[0.03, 0.52, 0.01]} />
                <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
              </mesh>
              <mesh position={[0, -0.22, 0.52]} castShadow receiveShadow>
                <RoundedBox args={[0.78, 0.06, 0.08]} radius={0.02} smoothness={4}>
                  <meshStandardMaterial color="#6a5a4a" roughness={0.82} />
                </RoundedBox>
              </mesh>
            </>
          )}

          {variant === 2 && (
            // Fenêtre avec volets
            <>
              <mesh position={[0, 0.08, 0.505]} castShadow receiveShadow>
                <RoundedBox args={[0.58, 0.64, 0.02]} radius={0.03} smoothness={4}>
                  <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
                </RoundedBox>
              </mesh>
              <mesh position={[0, 0.08, 0.495]} castShadow receiveShadow>
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
              <mesh position={[0, 0.08, 0.51]} castShadow>
                <boxGeometry args={[0.54, 0.03, 0.01]} />
                <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
              </mesh>
              <mesh position={[0, 0.08, 0.51]} castShadow>
                <boxGeometry args={[0.03, 0.6, 0.01]} />
                <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
              </mesh>
              <mesh position={[-0.38, 0.08, 0.505]} rotation={[0, -0.15, 0]} castShadow receiveShadow>
                <RoundedBox args={[0.16, 0.64, 0.03]} radius={0.02} smoothness={4}>
                  <meshStandardMaterial color="#7a5a4a" roughness={0.9} />
                </RoundedBox>
              </mesh>
              {[0.2, 0.08, -0.04, -0.16].map((yOffset, i) => (
                <mesh key={`left-${i}`} position={[-0.38, 0.08 + yOffset, 0.51]} rotation={[0, -0.15, 0]} castShadow>
                  <boxGeometry args={[0.14, 0.02, 0.01]} />
                  <meshStandardMaterial color="#6a4a3a" roughness={0.92} />
                </mesh>
              ))}
              <mesh position={[0.38, 0.08, 0.505]} rotation={[0, 0.15, 0]} castShadow receiveShadow>
                <RoundedBox args={[0.16, 0.64, 0.03]} radius={0.02} smoothness={4}>
                  <meshStandardMaterial color="#7a5a4a" roughness={0.9} />
                </RoundedBox>
              </mesh>
              {[0.2, 0.08, -0.04, -0.16].map((yOffset, i) => (
                <mesh key={`right-${i}`} position={[0.38, 0.08 + yOffset, 0.51]} rotation={[0, 0.15, 0]} castShadow>
                  <boxGeometry args={[0.14, 0.02, 0.01]} />
                  <meshStandardMaterial color="#6a4a3a" roughness={0.92} />
                </mesh>
              ))}
              <mesh position={[0, -0.26, 0.52]} castShadow receiveShadow>
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
      <group position={position}>
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
        </>
      )}
    </group>
  );
}
