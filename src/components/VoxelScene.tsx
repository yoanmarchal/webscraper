import { OrbitControls, RoundedBox, Sky } from '@react-three/drei';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import type { GridCell } from '../types';

interface VoxelSceneProps {
  cells: GridCell[];
  gridWidth: number;
  gridDepth: number;
  selectedHeight: number;
  onCellAction: (action: 'add' | 'remove', x: number, y: number, z: number) => void;
  onPreviewMove: (x: number, z: number) => void;
  previewCell: { x: number; z: number } | null;
  toWorldPosition: (x: number, y: number, z: number) => [number, number, number];
  getNextPlacementY: (x: number, z: number, minimumY: number) => number | null;
  getTopOccupiedY: (x: number, z: number) => number | null;
}

type CellLookup = Record<string, GridCell>;

function cellKey(x: number, y: number, z: number): string {
  return `${x}:${y}:${z}`;
}

function makeCellLookup(cells: GridCell[]): CellLookup {
  return cells.reduce<CellLookup>((lookup, cell) => {
    lookup[cellKey(cell.x, cell.y, cell.z)] = cell;
    return lookup;
  }, {});
}

function getCell(lookup: CellLookup, x: number, y: number, z: number): GridCell | null {
  return lookup[cellKey(x, y, z)] ?? null;
}

function hasOccupiedCell(lookup: CellLookup, x: number, y: number, z: number): boolean {
  return getCell(lookup, x, y, z)?.isOccupied ?? false;
}

// Détecte la configuration du toit et son orientation
function getRoofConfig(lookup: CellLookup, cell: GridCell): {
  axis: 'x' | 'z';
  hasLeft: boolean;
  hasRight: boolean;
  hasFront: boolean;
  hasBack: boolean;
  isCorner: boolean;
  isEnd: boolean;
} {
  const hasLeft = hasOccupiedCell(lookup, cell.x - 1, cell.y, cell.z);
  const hasRight = hasOccupiedCell(lookup, cell.x + 1, cell.y, cell.z);
  const hasFront = hasOccupiedCell(lookup, cell.x, cell.y, cell.z + 1);
  const hasBack = hasOccupiedCell(lookup, cell.x, cell.y, cell.z - 1);
  
  const eastWest = Number(hasLeft) + Number(hasRight);
  const northSouth = Number(hasFront) + Number(hasBack);
  
  // Détecte si c'est un coin (voisins perpendiculaires)
  const isCorner = (eastWest === 1 && northSouth === 1);
  
  // Détecte si c'est une extrémité (voisin sur un seul côté)
  const isEnd = (eastWest + northSouth === 1);
  
  const axis = eastWest > northSouth ? 'x' : 'z';
  
  return { axis, hasLeft, hasRight, hasFront, hasBack, isCorner, isEnd };
}

function getArchAxis(lookup: CellLookup, cell: GridCell): 'x' | 'z' {
  const eastWest = Number(hasOccupiedCell(lookup, cell.x - 1, cell.y, cell.z)) + Number(hasOccupiedCell(lookup, cell.x + 1, cell.y, cell.z));
  const northSouth = Number(hasOccupiedCell(lookup, cell.x, cell.y, cell.z - 1)) + Number(hasOccupiedCell(lookup, cell.x, cell.y, cell.z + 1));

  if (eastWest >= northSouth) {
    return 'x';
  }

  return 'z';
}

// Détecte les faces exposées d'un bloc (sans voisin adjacent)
function getExposedFaces(lookup: CellLookup, cell: GridCell): Array<'front' | 'back' | 'left' | 'right'> {
  const faces: Array<'front' | 'back' | 'left' | 'right'> = [];
  
  if (!hasOccupiedCell(lookup, cell.x, cell.y, cell.z + 1)) faces.push('front');  // Z+
  if (!hasOccupiedCell(lookup, cell.x, cell.y, cell.z - 1)) faces.push('back');   // Z-
  if (!hasOccupiedCell(lookup, cell.x - 1, cell.y, cell.z)) faces.push('left');   // X-
  if (!hasOccupiedCell(lookup, cell.x + 1, cell.y, cell.z)) faces.push('right');  // X+
  
  return faces;
}

// Détecte si un bloc est isolé (aucun voisin horizontal)
function isIsolatedBlock(lookup: CellLookup, cell: GridCell): boolean {
  return !hasOccupiedCell(lookup, cell.x - 1, cell.y, cell.z) &&
         !hasOccupiedCell(lookup, cell.x + 1, cell.y, cell.z) &&
         !hasOccupiedCell(lookup, cell.x, cell.y, cell.z - 1) &&
         !hasOccupiedCell(lookup, cell.x, cell.y, cell.z + 1);
}

function CellMesh({
  cell,
  toWorldPosition,
  lookup,
}: {
  cell: GridCell;
  toWorldPosition: VoxelSceneProps['toWorldPosition'];
  lookup: CellLookup;
}) {
  const position = toWorldPosition(cell.x, cell.y, cell.z);
  const isIsolated = isIsolatedBlock(lookup, cell);

  if (cell.type === 'ROOF') {
    const roofConfig = getRoofConfig(lookup, cell);
    const roofColor = cell.color ?? '#c85a3f';
    const roofColor2 = cell.color ?? '#b84731';
    
    // Toit de tour (bloc isolé) - créneaux simples et propres
    if (isIsolated) {
      return (
        <group position={position}>
          {/* Anneau de base formant le chemin de ronde - collé au bas du bloc */}
          <mesh position={[0, -0.425, 0]} castShadow receiveShadow>
            <RoundedBox args={[1.1, 0.15, 1.1]} radius={0.02} smoothness={4}>
              <meshStandardMaterial color="#9d3425" roughness={0.92} />
            </RoundedBox>
          </mesh>
          
          {/* Murs pleins entre les créneaux - formant la base crénelée */}
          {/* Mur face avant (Z+) */}
          <mesh position={[0, -0.225, 0.5]} castShadow receiveShadow>
            <RoundedBox args={[1.0, 0.2, 0.1]} radius={0.02} smoothness={4}>
              <meshStandardMaterial color={roofColor} roughness={0.88} />
            </RoundedBox>
          </mesh>
          {/* Mur face arrière (Z-) */}
          <mesh position={[0, -0.225, -0.5]} castShadow receiveShadow>
            <RoundedBox args={[1.0, 0.2, 0.1]} radius={0.02} smoothness={4}>
              <meshStandardMaterial color={roofColor} roughness={0.88} />
            </RoundedBox>
          </mesh>
          {/* Mur face gauche (X-) */}
          <mesh position={[-0.5, -0.225, 0]} castShadow receiveShadow>
            <RoundedBox args={[0.1, 0.2, 0.9]} radius={0.02} smoothness={4}>
              <meshStandardMaterial color={roofColor} roughness={0.88} />
            </RoundedBox>
          </mesh>
          {/* Mur face droite (X+) */}
          <mesh position={[0.5, -0.225, 0]} castShadow receiveShadow>
            <RoundedBox args={[0.1, 0.2, 0.9]} radius={0.02} smoothness={4}>
              <meshStandardMaterial color={roofColor} roughness={0.88} />
            </RoundedBox>
          </mesh>
          
          {/* 8 créneaux (merlons) répartis régulièrement */}
          {/* Coins */}
          <mesh position={[-0.4, 0.025, -0.4]} castShadow receiveShadow>
            <RoundedBox args={[0.25, 0.4, 0.25]} radius={0.03} smoothness={4}>
              <meshStandardMaterial color={roofColor} roughness={0.88} />
            </RoundedBox>
          </mesh>
          <mesh position={[0.4, 0.025, -0.4]} castShadow receiveShadow>
            <RoundedBox args={[0.25, 0.4, 0.25]} radius={0.03} smoothness={4}>
              <meshStandardMaterial color={roofColor} roughness={0.88} />
            </RoundedBox>
          </mesh>
          <mesh position={[-0.4, 0.025, 0.4]} castShadow receiveShadow>
            <RoundedBox args={[0.25, 0.4, 0.25]} radius={0.03} smoothness={4}>
              <meshStandardMaterial color={roofColor} roughness={0.88} />
            </RoundedBox>
          </mesh>
          <mesh position={[0.4, 0.025, 0.4]} castShadow receiveShadow>
            <RoundedBox args={[0.25, 0.4, 0.25]} radius={0.03} smoothness={4}>
              <meshStandardMaterial color={roofColor} roughness={0.88} />
            </RoundedBox>
          </mesh>
          
          {/* Créneaux sur les faces (centrés) */}
          <mesh position={[0, 0.025, -0.5]} castShadow receiveShadow>
            <RoundedBox args={[0.25, 0.4, 0.1]} radius={0.03} smoothness={4}>
              <meshStandardMaterial color={roofColor2} roughness={0.88} />
            </RoundedBox>
          </mesh>
          <mesh position={[0, 0.025, 0.5]} castShadow receiveShadow>
            <RoundedBox args={[0.25, 0.4, 0.1]} radius={0.03} smoothness={4}>
              <meshStandardMaterial color={roofColor2} roughness={0.88} />
            </RoundedBox>
          </mesh>
          <mesh position={[-0.5, 0.025, 0]} castShadow receiveShadow>
            <RoundedBox args={[0.1, 0.4, 0.25]} radius={0.03} smoothness={4}>
              <meshStandardMaterial color={roofColor2} roughness={0.88} />
            </RoundedBox>
          </mesh>
          <mesh position={[0.5, 0.025, 0]} castShadow receiveShadow>
            <RoundedBox args={[0.1, 0.4, 0.25]} radius={0.03} smoothness={4}>
              <meshStandardMaterial color={roofColor2} roughness={0.88} />
            </RoundedBox>
          </mesh>
          
          {/* Plateforme intérieure */}
          <mesh position={[0, -0.325, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.55, 0.55, 0.08, 32]} />
            <meshStandardMaterial color={roofColor2} roughness={0.9} />
          </mesh>
          
          {/* Dôme conique au centre */}
          <mesh position={[0, 0.175, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.35, 0.55, 8]} />
            <meshStandardMaterial color="#7b241b" roughness={0.9} />
          </mesh>
          
          {/* Sphère décorative dorée */}
          <mesh position={[0, 0.505, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.09, 16, 16]} />
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

function PlacementPreview({
  previewCell,
  toWorldPosition,
  getNextPlacementY,
}: {
  previewCell: { x: number; z: number } | null;
  toWorldPosition: VoxelSceneProps['toWorldPosition'];
  getNextPlacementY?: VoxelSceneProps['getNextPlacementY'];
}) {
  if (!previewCell) {
    return null;
  }

  if (!getNextPlacementY) {
    return null;
  }

  const placementY = getNextPlacementY(previewCell.x, previewCell.z, 0);

  if (placementY === null) {
    return null;
  }

  const position = toWorldPosition(previewCell.x, placementY, previewCell.z);

  return (
    <RoundedBox args={[0.9, 0.9, 0.9]} radius={0.08} smoothness={4} position={position}>
      <meshStandardMaterial color="#ffd4a3" transparent opacity={0.35} />
    </RoundedBox>
  );
}

export function VoxelScene({
  cells,
  gridWidth,
  gridDepth,
  selectedHeight,
  onCellAction,
  onPreviewMove,
  previewCell,
  toWorldPosition,
  getNextPlacementY,
  getTopOccupiedY,
}: VoxelSceneProps) {
  const handlePointer = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const gridX = Math.floor(event.point.x + gridWidth / 2);
    const gridZ = Math.floor(event.point.z + gridDepth / 2);
    onPreviewMove(gridX, gridZ);
    const placementY = getNextPlacementY(gridX, gridZ, selectedHeight);
    const removalY = getTopOccupiedY(gridX, gridZ);

    if (event.button === 2) {
      if (removalY !== null) {
        onCellAction('remove', gridX, removalY, gridZ);
      }
      return;
    }

    if (event.button === 0 && placementY !== null) {
      onCellAction('add', gridX, placementY, gridZ);
    }
  };

  return (
    <Canvas
      shadows
      camera={{ position: [10, 12, 14], fov: 45, near: 0.1, far: 100 }}
      gl={{ antialias: true }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <color attach="background" args={['#b8d4f1']} />
      <fog attach="fog" args={['#d0e5f5', 30, 60]} />
      <ambientLight intensity={1.3} color="#fffaed" />
      <directionalLight 
        position={[12, 16, 10]} 
        intensity={1.8} 
        color="#fffaed"
        castShadow 
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048}
        shadow-radius={4}
        shadow-bias={-0.0001}
      />
      <Sky distance={450000} sunPosition={[100, 20, 100]} inclination={0.6} azimuth={0.25} turbidity={8} rayleigh={1.2} />
      <gridHelper args={[Math.max(gridWidth, gridDepth), Math.max(gridWidth, gridDepth), '#d4c4a8', '#e8dcc8']} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerMove={handlePointer} onPointerDown={handlePointer} receiveShadow>
        <planeGeometry args={[gridWidth, gridDepth]} />
        <meshStandardMaterial color="#f5e6d3" transparent opacity={0.95} roughness={0.95} />
      </mesh>
      {(() => {
        const lookup = makeCellLookup(cells);
        return cells.map((cell) => (
          <CellMesh key={`${cell.x}-${cell.y}-${cell.z}`} cell={cell} toWorldPosition={toWorldPosition} lookup={lookup} />
        ));
      })()}
      <PlacementPreview
        previewCell={previewCell}
        toWorldPosition={toWorldPosition}
        getNextPlacementY={getNextPlacementY}
      />
      <OrbitControls enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.08} minDistance={6} maxDistance={36} />
    </Canvas>
  );
}