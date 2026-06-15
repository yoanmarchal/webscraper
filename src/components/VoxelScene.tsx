import { OrbitControls, Sky } from '@react-three/drei';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import type { GridCell } from '../types';
import { makeCellLookup } from '../utils/cellUtils';
import { CellMesh } from './CellMesh';
import { PlacementPreview } from './PlacementPreview';
import { Bloom, EffectComposer, Noise, Vignette, SSAO   } from '@react-three/postprocessing'

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
      <EffectComposer>
        <Bloom mipmapBlur  luminanceThreshold={0.3} luminanceSmoothing={0.9} height={300} />
        <Noise opacity={0.02} />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>

    </Canvas>
  );
}
