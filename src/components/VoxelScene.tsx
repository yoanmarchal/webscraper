import { OrbitControls, Sky } from '@react-three/drei';
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
          <boxGeometry args={[1.26, 0.14, 0.6]} />
          <meshStandardMaterial color={cell.color ?? '#b84731'} roughness={0.88} />
        </mesh>
        <mesh
          rotation={roofAxis === 'x' ? [0, 0, -Math.PI / 4] : [-Math.PI / 4, 0, 0]}
          position={[0, 0.1, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1.26, 0.14, 0.6]} />
          <meshStandardMaterial color={cell.color ?? '#a93e2a'} roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.1, 0.14]} />
          <meshStandardMaterial color="#7b241b" roughness={0.92} />
        </mesh>
        <mesh position={[0, -0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.12, 0.5]} />
          <meshStandardMaterial color="#9d3425" roughness={0.92} />
        </mesh>
      </group>
    );
  }

  if (cell.type === 'ARCH') {
    const archAxis = getArchAxis(lookup, cell);

    return (
      <group position={position} rotation={archAxis === 'z' ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
        <mesh position={archAxis === 'x' ? [-0.32, 0, 0] : [0, 0, -0.32]} castShadow receiveShadow>
          <boxGeometry args={[archAxis === 'x' ? 0.28 : 0.3, 1.0, archAxis === 'x' ? 0.3 : 0.28]} />
          <meshStandardMaterial color={cell.color ?? '#9f8f7b'} roughness={0.88} />
        </mesh>
        <mesh position={archAxis === 'x' ? [0.32, 0, 0] : [0, 0, 0.32]} castShadow receiveShadow>
          <boxGeometry args={[archAxis === 'x' ? 0.28 : 0.3, 1.0, archAxis === 'x' ? 0.3 : 0.28]} />
          <meshStandardMaterial color={cell.color ?? '#9f8f7b'} roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <torusGeometry args={[0.36, 0.1, 10, 24, Math.PI]} />
          <meshStandardMaterial color={cell.color ?? '#9f8f7b'} roughness={0.82} />
        </mesh>
        <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.14, 0.26]} />
          <meshStandardMaterial color={cell.color ?? '#8f7f6e'} roughness={0.88} />
        </mesh>
      </group>
    );
  }

  if (cell.type === 'WALL_WINDOW') {
    return (
      <group position={position}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.0, 1.0, 1.0]} />
          <meshStandardMaterial color={cell.color ?? '#e0c996'} roughness={0.94} />
        </mesh>
        <mesh position={[0, 0.04, 0.49]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.36, 0.04]} />
          <meshStandardMaterial color="#101722" roughness={0.18} metalness={0.08} />
        </mesh>
        <mesh position={[0, 0.04, 0.475]} castShadow receiveShadow>
          <boxGeometry args={[0.36, 0.4, 0.02]} />
          <meshStandardMaterial color="#3f3320" roughness={0.85} />
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
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[1.0, 1.0, 1.0]} />
      <meshStandardMaterial color={cell.color ?? '#b8b8b8'} roughness={0.94} />
      <mesh position={[0, 0.32, 0.46]}>
        <boxGeometry args={[0.94, 0.05, 0.05]} />
        <meshStandardMaterial color="#d8c8ae" roughness={0.8} />
      </mesh>
    </mesh>
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
    <mesh position={position}>
      <boxGeometry args={[0.9, 0.9, 0.9]} />
      <meshStandardMaterial color="#e8f3ff" transparent opacity={0.22} />
    </mesh>
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
      <color attach="background" args={['#09111d']} />
      <fog attach="fog" args={['#09111d', 22, 48]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[10, 18, 8]} intensity={2.1} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <Sky distance={80} sunPosition={[8, 16, 8]} inclination={0.38} azimuth={0.3} />
      <gridHelper args={[Math.max(gridWidth, gridDepth), Math.max(gridWidth, gridDepth), '#2c3b52', '#172231']} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerMove={handlePointer} onPointerDown={handlePointer} receiveShadow>
        <planeGeometry args={[gridWidth, gridDepth]} />
        <meshStandardMaterial color="#0c1726" transparent opacity={0.08} />
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