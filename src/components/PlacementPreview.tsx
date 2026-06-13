import { RoundedBox } from '@react-three/drei';

interface PlacementPreviewProps {
  previewCell: { x: number; z: number } | null;
  toWorldPosition: (x: number, y: number, z: number) => [number, number, number];
  getNextPlacementY?: (x: number, z: number, minimumY: number) => number | null;
}

export function PlacementPreview({
  previewCell,
  toWorldPosition,
  getNextPlacementY,
}: PlacementPreviewProps) {
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
