import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { getArchAxis } from '../../utils/cellUtils';

interface ArchCellProps {
  cell: GridCell;
  position: [number, number, number];
  lookup: CellLookup;
}

export function ArchCell({ cell, position, lookup }: ArchCellProps) {
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
