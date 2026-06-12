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

function CellMesh({ cell, toWorldPosition }: { cell: GridCell; toWorldPosition: VoxelSceneProps['toWorldPosition'] }) {
  const position = toWorldPosition(cell.x, cell.y, cell.z);

  if (cell.type === 'ROOF') {
    return (
      <mesh position={position} castShadow receiveShadow>
        <coneGeometry args={[0.45, 0.95, 4]} />
        <meshStandardMaterial color={cell.color ?? '#b84731'} roughness={0.8} metalness={0.05} />
      </mesh>
    );
  }

  if (cell.type === 'ARCH') {
    return (
      <group position={position}>
        <mesh position={[-0.2, -0.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.18, 0.72, 0.18]} />
          <meshStandardMaterial color={cell.color ?? '#9f8f7b'} roughness={0.85} />
        </mesh>
        <mesh position={[0.2, -0.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.18, 0.72, 0.18]} />
          <meshStandardMaterial color={cell.color ?? '#9f8f7b'} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.72, 0.18, 0.18]} />
          <meshStandardMaterial color={cell.color ?? '#9f8f7b'} roughness={0.85} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[0.82, cell.type === 'FOUNDATION' ? 0.82 : 0.78, 0.82]} />
      <meshStandardMaterial color={cell.color ?? '#b8b8b8'} roughness={0.92} />
      {cell.type === 'WALL_WINDOW' ? (
        <mesh position={[0, 0, 0.43]}>
          <boxGeometry args={[0.24, 0.24, 0.04]} />
          <meshStandardMaterial color="#2f435a" roughness={0.25} metalness={0.15} />
        </mesh>
      ) : null}
    </mesh>
  );
}

function PlacementPreview({
  previewCell,
  selectedHeight,
  toWorldPosition,
}: {
  previewCell: { x: number; z: number } | null;
  selectedHeight: number;
  toWorldPosition: VoxelSceneProps['toWorldPosition'];
}) {
  if (!previewCell) {
    return null;
  }

  const position = toWorldPosition(previewCell.x, selectedHeight, previewCell.z);

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
      {cells.map((cell) => (
        <CellMesh key={`${cell.x}-${cell.y}-${cell.z}`} cell={cell} toWorldPosition={toWorldPosition} />
      ))}
      <PlacementPreview previewCell={previewCell} selectedHeight={selectedHeight} toWorldPosition={toWorldPosition} />
      <OrbitControls enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.08} minDistance={6} maxDistance={36} />
    </Canvas>
  );
}