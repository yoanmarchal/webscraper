import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { getRoofConfig } from '../../utils/cellUtils';
import { varyColorBrightness } from '../../colorPalettes';

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
  
  const roofColorDark = varyColorBrightness(roofColor, -0.15);

  const renderChimney = (offsetZ = 0.2) => {
    // Placer une cheminée déterministe sur 33% des toits
    if ((cell.x + cell.z) % 3 !== 0) return null;
    
    // Choisir le côté gauche/droite selon les coordonnées
    const sideX = (cell.x % 2 === 0) ? 0.26 : -0.26;
    
    return (
      <group name="chimney" position={[sideX, 0.15, offsetZ]}>
        {/* Corps de la cheminée en pierre */}
        <mesh name="chimneyBody" castShadow receiveShadow>
          <RoundedBox args={[0.16, 0.55, 0.16]} radius={0.015} smoothness={2}>
            <meshStandardMaterial color="#9f8f7b" roughness={0.9} />
          </RoundedBox>
        </mesh>
        {/* Chapeau de cheminée */}
        <mesh name="chimneyCap" position={[0, 0.28, 0]} castShadow>
          <RoundedBox args={[0.20, 0.04, 0.20]} radius={0.01} smoothness={2}>
            <meshStandardMaterial color="#7a6a5a" roughness={0.9} />
          </RoundedBox>
        </mesh>
        {/* Pot de cheminée en terre cuite */}
        <mesh name="chimneyPot" position={[0, 0.34, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.04, 0.08, 8]} />
          <meshStandardMaterial color="#a05a42" roughness={0.8} />
        </mesh>
      </group>
    );
  };
  
  // Toit de tour (bloc isolé) - créneaux raffinés
  if (isIsolated) {
    return (
      <group name="roofCell" position={position}>
        {/* Anneau de base formant le chemin de ronde - collé au bas du bloc */}
        <mesh name="baseRing" position={[0, -0.425, 0]} castShadow receiveShadow>
          <RoundedBox args={[1.15, 0.15, 1.15]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color="#9d3425" roughness={0.92} />
          </RoundedBox>
        </mesh>
        
        {/* Mur crénelé continu formant un anneau unique */}
        <mesh name="crenelledWall" position={[0, -0.2, 0]} castShadow receiveShadow rotation={[0, Math.PI / 8, 0]}>
          <cylinderGeometry args={[0.54, 0.54, 0.25, 8, 1, false]} />
          <meshStandardMaterial color={roofColor} roughness={0.88} />
        </mesh>
        
        {/* Mur extérieur pour créer l'épaisseur */}
        <mesh name="outerWall" position={[0, -0.2, 0]} castShadow receiveShadow rotation={[0, Math.PI / 8, 0]}>
          <cylinderGeometry args={[0.46, 0.46, 0.25, 8, 1, false]} />
          <meshStandardMaterial color={roofColor} roughness={0.88} />
        </mesh>
        
        {/* 8 créneaux (merlons) plus imposants */}
        {/* Coins - plus larges et plus hauts */}
        <mesh name="cornerMerlon1" position={[-0.4, 0.1, -0.4]} castShadow receiveShadow>
          <RoundedBox args={[0.32, 0.55, 0.32]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh name="cornerMerlon2" position={[0.4, 0.1, -0.4]} castShadow receiveShadow>
          <RoundedBox args={[0.32, 0.55, 0.32]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh name="cornerMerlon3" position={[-0.4, 0.1, 0.4]} castShadow receiveShadow>
          <RoundedBox args={[0.32, 0.55, 0.32]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh name="cornerMerlon4" position={[0.4, 0.1, 0.4]} castShadow receiveShadow>
          <RoundedBox args={[0.32, 0.55, 0.32]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        
        {/* Créneaux sur les faces - plus larges */}
        <mesh name="faceMerlon1" position={[0, 0.05, -0.52]} castShadow receiveShadow>
          <RoundedBox args={[0.35, 0.45, 0.12]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh name="faceMerlon2" position={[0, 0.05, 0.52]} castShadow receiveShadow>
          <RoundedBox args={[0.35, 0.45, 0.12]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh name="faceMerlon3" position={[-0.52, 0.05, 0]} castShadow receiveShadow>
          <RoundedBox args={[0.12, 0.45, 0.35]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh name="faceMerlon4" position={[0.52, 0.05, 0]} castShadow receiveShadow>
          <RoundedBox args={[0.12, 0.45, 0.35]} radius={0.04} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        
        {/* Plateforme intérieure */}
        <mesh name="innerPlatform" position={[0, -0.31, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.58, 0.58, 0.1, 32]} />
          <meshStandardMaterial color={roofColor2} roughness={0.9} />
        </mesh>
        
        {/* Toit conique amélioré avec tuiles apparentes */}
        {/* Base du toit avec bordure */}
        <mesh name="roofBase" position={[0, 0.15, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.42, 0.48, 0.1, 8]} />
          <meshStandardMaterial color={roofColor} roughness={0.88} />
        </mesh>
        
        {/* Dôme conique principal plus élancé */}
        <mesh name="roofDome" position={[0, 0.32, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.38, 0.7, 8]} />
          <meshStandardMaterial color="#7b241b" roughness={0.85} />
        </mesh>
        
        {/* Segments de tuiles (anneaux décoratifs) */}
        <mesh name="tileSegment1" position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.35, 0.36, 0.04, 8]} />
          <meshStandardMaterial color="#8b2a1f" roughness={0.9} />
        </mesh>
        <mesh name="tileSegment2" position={[0, 0.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.25, 0.26, 0.04, 8]} />
          <meshStandardMaterial color="#8b2a1f" roughness={0.9} />
        </mesh>
        <mesh name="tileSegment3" position={[0, 0.52, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.15, 0.16, 0.04, 8]} />
          <meshStandardMaterial color="#8b2a1f" roughness={0.9} />
        </mesh>
        
        {/* Finial (pointe) au sommet */}
        <mesh name="finial" position={[0, 0.68, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.06, 0.15, 8]} />
          <meshStandardMaterial color="#6b1b13" roughness={0.85} />
        </mesh>
        
        {/* Sphère décorative dorée */}
        <mesh name="decorativeSphere" position={[0, 0.78, 0]} castShadow receiveShadow>
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
      <group name="roofCell" position={position} rotation={[0, rotation, 0]}>
        {/* Structure de base sous le toit */}
        <mesh name="baseStructure" position={[0, -0.42, 0]} castShadow receiveShadow>
          <RoundedBox args={[1.0, 0.12, 1.0]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color="#9d3425" roughness={0.92} />
          </RoundedBox>
        </mesh>
        
        {/* Toit principal (côté droit) */}
        <group name="mainRoofRightGroup" rotation={[Math.PI / 4, 0, 0]} position={[0.2, 0.12, 0]}>
          <mesh castShadow receiveShadow>
            <RoundedBox args={[0.7, 0.14, 0.85]} radius={0.02} smoothness={4}>
              <meshStandardMaterial color={roofColor} roughness={0.88} />
            </RoundedBox>
          </mesh>
          {/* Tuiles décoratives */}
          {[-0.2, 0, 0.2].map((xOffset, i) => (
            <mesh key={i} name={`tileRibRight-${i}`} position={[xOffset, 0.08, 0]} castShadow>
              <RoundedBox args={[0.03, 0.04, 0.87]} radius={0.01} smoothness={2}>
                <meshStandardMaterial color={roofColorDark} roughness={0.9} />
              </RoundedBox>
            </mesh>
          ))}
        </group>

        <mesh name="mainRoofRightInner" rotation={[-Math.PI / 4, 0, 0]} position={[0.2, 0.12, 0]} castShadow receiveShadow>
          <RoundedBox args={[0.7, 0.14, 0.85]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        
        {/* Toit perpendiculaire (côté avant) */}
        <group name="mainRoofFrontGroup" rotation={[0, 0, Math.PI / 4]} position={[0, 0.12, 0.2]}>
          <mesh castShadow receiveShadow>
            <RoundedBox args={[0.85, 0.14, 0.7]} radius={0.02} smoothness={4}>
              <meshStandardMaterial color={roofColor} roughness={0.88} />
            </RoundedBox>
          </mesh>
          {/* Tuiles décoratives */}
          {[-0.2, 0, 0.2].map((zOffset, i) => (
            <mesh key={i} name={`tileRibFront-${i}`} position={[0, 0.08, zOffset]} castShadow>
              <RoundedBox args={[0.87, 0.03, 0.04]} radius={0.01} smoothness={2}>
                <meshStandardMaterial color={roofColorDark} roughness={0.9} />
              </RoundedBox>
            </mesh>
          ))}
        </group>

        <mesh name="mainRoofFrontInner" rotation={[0, 0, -Math.PI / 4]} position={[0, 0.12, 0.2]} castShadow receiveShadow>
          <RoundedBox args={[0.85, 0.14, 0.7]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        
        {/* Faîtage */}
        <mesh name="ridge" position={[0, 0.4, 0]} castShadow receiveShadow>
          <RoundedBox args={[0.6, 0.08, 0.08]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color="#7b241b" roughness={0.92} />
          </RoundedBox>
        </mesh>
        <mesh name="ridgeSide" position={[0, 0.4, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
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
      <group name="roofCell" position={position} rotation={[0, rotation, 0]}>
        {/* Structure de base sous le toit */}
        <mesh name="baseStructure" position={[0, -0.42, 0]} castShadow receiveShadow>
          <RoundedBox args={[1.0, 0.12, 1.0]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color="#9d3425" roughness={0.92} />
          </RoundedBox>
        </mesh>
        
        {/* Pignon (mur triangulaire à l'extrémité) */}
        <mesh name="gable" position={[0, 0.05, -0.48]} castShadow receiveShadow>
          <boxGeometry args={[0.86, 0.7, 0.05]} />
          <meshStandardMaterial color="#b8a890" roughness={0.94} />
        </mesh>

        {/* Oeil-de-boeuf (Attic window) sur pignon */}
        <group name="atticWindow" position={[0, 0.16, -0.51]}>
          {/* Vitre sombre */}
          <mesh name="windowGlass" rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
            <meshStandardMaterial color="#2a3a4a" roughness={0.15} metalness={0.2} transparent opacity={0.85} />
          </mesh>
          {/* Cadre en bois */}
          <mesh name="windowFrame">
            <torusGeometry args={[0.08, 0.02, 8, 24]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.8} />
          </mesh>
          {/* Croisillon vertical */}
          <mesh name="windowBarV" position={[0, 0, 0.005]}>
            <boxGeometry args={[0.015, 0.16, 0.01]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.8} />
          </mesh>
          {/* Croisillon horizontal */}
          <mesh name="windowBarH" position={[0, 0, 0.005]}>
            <boxGeometry args={[0.16, 0.015, 0.01]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.8} />
          </mesh>
        </group>
        
        {/* Plans de toit inclinés avec tuiles */}
        <group name="roofSlopeGroup" rotation={[Math.PI / 4, 0, 0]} position={[0, 0.15, 0]}>
          <mesh castShadow receiveShadow>
            <RoundedBox args={[1.1, 0.14, 0.8]} radius={0.02} smoothness={4}>
              <meshStandardMaterial color={roofColor} roughness={0.88} />
            </RoundedBox>
          </mesh>
          {/* Tuiles décoratives */}
          {[-0.36, -0.12, 0.12, 0.36].map((xOffset, i) => (
            <mesh key={i} name={`tileRibEnd-${i}`} position={[xOffset, 0.08, 0]} castShadow>
              <RoundedBox args={[0.035, 0.04, 0.82]} radius={0.01} smoothness={2}>
                <meshStandardMaterial color={roofColorDark} roughness={0.9} />
              </RoundedBox>
            </mesh>
          ))}
        </group>

        <mesh name="roofSlopeInner" rotation={[-Math.PI / 4, 0, 0]} position={[0, 0.15, 0]} castShadow receiveShadow>
          <RoundedBox args={[1.1, 0.14, 0.8]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        
        {/* Faîtage (arête du toit) */}
        <mesh name="ridge" position={[0, 0.42, 0]} castShadow receiveShadow>
          <RoundedBox args={[1.16, 0.08, 0.1]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color="#7b241b" roughness={0.92} />
          </RoundedBox>
        </mesh>
        
        {/* Tuiles décoratives le long du faîtage */}
        {[-0.3, -0.1, 0.1, 0.3].map((xOffset, i) => (
          <mesh key={i} name={`decorativeTile${i}`} position={[xOffset, 0.46, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.12, 8]} />
            <meshStandardMaterial color="#8b3424" roughness={0.9} />
          </mesh>
        ))}

        {/* Cheminée déterministe (située à l'arrière, opposée au pignon de devant) */}
        {renderChimney(0.18)}
      </group>
    );
  }
  
  // Toit standard (simple faîte)
  const roofAxis = roofConfig.axis;
  
  return (
    <group name="roofCell" position={position}>
      {/* Structure de base sous le toit */}
      <mesh name="baseStructure" position={[0, -0.42, 0]} castShadow receiveShadow>
        <RoundedBox args={[1.0, 0.12, 1.0]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color="#9d3425" roughness={0.92} />
        </RoundedBox>
      </mesh>
      
      {/* Plans de toit inclinés avec tuiles */}
      <group
        name="mainRoofFrontGroup"
        rotation={roofAxis === 'x' ? [0, 0, Math.PI / 4] : [Math.PI / 4, 0, 0]}
        position={[0, 0.12, 0]}
      >
        <mesh castShadow receiveShadow>
          <RoundedBox args={[1.32, 0.14, 0.68]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        {/* Tuiles décoratives */}
        {roofAxis === 'x' ? (
          [-0.22, 0, 0.22].map((zOffset, i) => (
            <mesh key={i} name={`tileRib-${i}`} position={[0, 0.08, zOffset]} castShadow>
              <RoundedBox args={[1.34, 0.04, 0.04]} radius={0.015} smoothness={2}>
                <meshStandardMaterial color={roofColorDark} roughness={0.9} />
              </RoundedBox>
            </mesh>
          ))
        ) : (
          [-0.44, -0.22, 0, 0.22, 0.44].map((xOffset, i) => (
            <mesh key={i} name={`tileRib-${i}`} position={[xOffset, 0.08, 0]} castShadow>
              <RoundedBox args={[0.04, 0.04, 0.70]} radius={0.015} smoothness={2}>
                <meshStandardMaterial color={roofColorDark} roughness={0.9} />
              </RoundedBox>
            </mesh>
          ))
        )}
      </group>

      <group
        name="mainRoofBackGroup"
        rotation={roofAxis === 'x' ? [0, 0, -Math.PI / 4] : [-Math.PI / 4, 0, 0]}
        position={[0, 0.12, 0]}
      >
        <mesh castShadow receiveShadow>
          <RoundedBox args={[1.32, 0.14, 0.68]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={roofColor2} roughness={0.88} />
          </RoundedBox>
        </mesh>
        {/* Tuiles décoratives */}
        {roofAxis === 'x' ? (
          [-0.22, 0, 0.22].map((zOffset, i) => (
            <mesh key={i} name={`tileRib-${i}`} position={[0, 0.08, zOffset]} castShadow>
              <RoundedBox args={[1.34, 0.04, 0.04]} radius={0.015} smoothness={2}>
                <meshStandardMaterial color={roofColorDark} roughness={0.9} />
              </RoundedBox>
            </mesh>
          ))
        ) : (
          [-0.44, -0.22, 0, 0.22, 0.44].map((xOffset, i) => (
            <mesh key={i} name={`tileRib-${i}`} position={[xOffset, 0.08, 0]} castShadow>
              <RoundedBox args={[0.04, 0.04, 0.70]} radius={0.015} smoothness={2}>
                <meshStandardMaterial color={roofColorDark} roughness={0.9} />
              </RoundedBox>
            </mesh>
          ))
        )}
      </group>
      
      {/* Faîtage (arête du toit) */}
      <mesh name="ridge"
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
          <mesh name="decorativeTile0" position={[-0.35, 0.44, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#8b3424" roughness={0.9} />
          </mesh>
          <mesh name="decorativeTile1" position={[0, 0.44, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#8b3424" roughness={0.9} />
          </mesh>
          <mesh name="decorativeTile2" position={[0.35, 0.44, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#8b3424" roughness={0.9} />
          </mesh>
        </>
      ) : (
        <>
          <mesh name="decorativeTile0" position={[0, 0.44, -0.35]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#8b3424" roughness={0.9} />
          </mesh>
          <mesh name="decorativeTile1" position={[0, 0.44, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#8b3424" roughness={0.9} />
          </mesh>
          <mesh name="decorativeTile2" position={[0, 0.44, 0.35]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.14, 8]} />
            <meshStandardMaterial color="#8b3424" roughness={0.9} />
          </mesh>
        </>
      )}

      {/* Cheminée déterministe */}
      {renderChimney()}
    </group>
  );
}

