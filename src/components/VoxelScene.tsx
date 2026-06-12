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

function getRoofAxis(lookup: CellLookup, cell: GridCell): 'x' | 'z' {
  const eastWest = Number(hasOccupiedCell(lookup, cell.x - 1, cell.y, cell.z)) + Number(hasOccupiedCell(lookup, cell.x + 1, cell.y, cell.z));
  const northSouth = Number(hasOccupiedCell(lookup, cell.x, cell.y, cell.z - 1)) + Number(hasOccupiedCell(lookup, cell.x, cell.y, cell.z + 1));

  if (eastWest > northSouth) {
    return 'x';
  }

  return 'z';
}

function getArchAxis(lookup: CellLookup, cell: GridCell): 'x' | 'z' {
  const eastWest = Number(hasOccupiedCell(lookup, cell.x - 1, cell.y, cell.z)) + Number(hasOccupiedCell(lookup, cell.x + 1, cell.y, cell.z));
  const northSouth = Number(hasOccupiedCell(lookup, cell.x, cell.y, cell.z - 1)) + Number(hasOccupiedCell(lookup, cell.x, cell.y, cell.z + 1));

  if (eastWest >= northSouth) {
    return 'x';
  }

  return 'z';
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

  if (cell.type === 'ROOF') {
    const roofAxis = getRoofAxis(lookup, cell);

    return (
      <group position={position}>
        <mesh
          rotation={roofAxis === 'x' ? [0, 0, Math.PI / 4] : [Math.PI / 4, 0, 0]}
          position={[0, 0.1, 0]}
          castShadow
          receiveShadow
        >
          <RoundedBox args={[1.26, 0.14, 0.6]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={cell.color ?? '#b84731'} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh
          rotation={roofAxis === 'x' ? [0, 0, -Math.PI / 4] : [-Math.PI / 4, 0, 0]}
          position={[0, 0.1, 0]}
          castShadow
          receiveShadow
        >
          <RoundedBox args={[1.26, 0.14, 0.6]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={cell.color ?? '#a93e2a'} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <RoundedBox args={[1.2, 0.1, 0.14]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color="#7b241b" roughness={0.92} />
          </RoundedBox>
        </mesh>
        <mesh position={[0, -0.42, 0]} castShadow receiveShadow>
          <RoundedBox args={[1.0, 0.12, 0.5]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color="#9d3425" roughness={0.92} />
          </RoundedBox>
        </mesh>
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
    return (
      <group position={position}>
        <RoundedBox args={[1.0, 1.0, 1.0]} radius={0.08} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color={cell.color ?? '#e0c996'} roughness={0.94} />
        </RoundedBox>
        <mesh position={[0, 0.04, 0.49]} castShadow receiveShadow>
          <RoundedBox args={[0.3, 0.36, 0.04]} radius={0.01} smoothness={4}>
            <meshStandardMaterial color="#101722" roughness={0.18} metalness={0.08} />
          </RoundedBox>
        </mesh>
        <mesh position={[0, 0.04, 0.475]} castShadow receiveShadow>
          <RoundedBox args={[0.36, 0.4, 0.02]} radius={0.01} smoothness={4}>
            <meshStandardMaterial color="#3f3320" roughness={0.85} />
          </RoundedBox>
        </mesh>
        <mesh position={[0, -0.14, 0.475]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.05, 0.02]} />
          <meshStandardMaterial color="#816c45" roughness={0.82} />
        </mesh>
        <mesh position={[-0.16, -0.02, 0.475]} castShadow receiveShadow>
          <boxGeometry args={[0.02, 0.34, 0.02]} />
          <meshStandardMaterial color="#816c45" roughness={0.82} />
        </mesh>
        <mesh position={[0.16, -0.02, 0.475]} castShadow receiveShadow>
          <boxGeometry args={[0.02, 0.34, 0.02]} />
          <meshStandardMaterial color="#816c45" roughness={0.82} />
        </mesh>
        <mesh position={[0, -0.02, 0.49]} castShadow receiveShadow>
          <boxGeometry args={[0.24, 0.24, 0.01]} />
          <meshStandardMaterial color="#0a0f18" roughness={0.16} metalness={0.06} />
        </mesh>
      </group>
    );
  }

  const isFoundation = cell.type === 'FOUNDATION';

  return (
    <group position={position}>
      <RoundedBox args={[1.0, 1.0, 1.0]} radius={0.08} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={cell.color ?? '#b8b8b8'} roughness={0.94} />
      </RoundedBox>
      <mesh position={[0, 0.32, 0.46]}>
        <RoundedBox args={[0.94, 0.05, 0.05]} radius={0.01} smoothness={4}>
          <meshStandardMaterial color="#d8c8ae" roughness={0.8} />
        </RoundedBox>
      </mesh>
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