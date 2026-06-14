import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { getArchAxis, getCornerRadii } from '../../utils/cellUtils';
import { varyColorBrightness } from '../../colorPalettes';
import { ShapedBox } from '../ShapedBox';

interface ArchCellProps {
  cell: GridCell;
  position: [number, number, number];
  lookup: CellLookup;
}

export function ArchCell({ cell, position, lookup }: ArchCellProps) {
  const archAxis = getArchAxis(lookup, cell);
  
  const baseColor = cell.color ?? '#9f8f7b';
  const mainColor = baseColor;
  const darkStoneColor = varyColorBrightness(baseColor, -0.12);
  const accentStoneColor = varyColorBrightness(baseColor, -0.18);
  const lintelColor = varyColorBrightness(baseColor, -0.06);

  // ── Shape inheritance: corner radii driven by neighbours ──────────────────
  // For arches the radii apply along the span axis.
  // We compute them in world space then un-rotate mentally – simpler to just
  // pass them through to ShapedBox which operates in local (pre-rotation) space.
  const radii = getCornerRadii(lookup, cell);

  // We design the arch locally along the X-axis (bridging X, opening facing Z).
  // If the environment dictates Z orientation, we rotate the parent group by 90 degrees.
  return (
    <group name="archCell" position={position} rotation={archAxis === 'z' ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
      {/* Left Pillar */}
      <mesh name="archLeftPillar" position={[-0.35, -0.07, 0]} castShadow receiveShadow>
        <RoundedBox args={[0.26, 0.86, 0.8]} radius={0.03} smoothness={4}>
          <meshStandardMaterial color={mainColor} roughness={0.88} />
        </RoundedBox>
      </mesh>
      
      {/* Left Pillar Base */}
      <mesh name="archLeftBase" position={[-0.35, -0.44, 0]} castShadow receiveShadow>
        <RoundedBox args={[0.32, 0.12, 0.86]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color={darkStoneColor} roughness={0.9} />
        </RoundedBox>
      </mesh>
      
      {/* Left Pillar Capital */}
      <mesh name="archLeftCapital" position={[-0.35, 0.11, 0]} castShadow receiveShadow>
        <RoundedBox args={[0.32, 0.08, 0.86]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color={darkStoneColor} roughness={0.9} />
        </RoundedBox>
      </mesh>

      {/* Right Pillar */}
      <mesh name="archRightPillar" position={[0.35, -0.07, 0]} castShadow receiveShadow>
        <RoundedBox args={[0.26, 0.86, 0.8]} radius={0.03} smoothness={4}>
          <meshStandardMaterial color={mainColor} roughness={0.88} />
        </RoundedBox>
      </mesh>
      
      {/* Right Pillar Base */}
      <mesh name="archRightBase" position={[0.35, -0.44, 0]} castShadow receiveShadow>
        <RoundedBox args={[0.32, 0.12, 0.86]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color={darkStoneColor} roughness={0.9} />
        </RoundedBox>
      </mesh>
      
      {/* Right Pillar Capital */}
      <mesh name="archRightCapital" position={[0.35, 0.11, 0]} castShadow receiveShadow>
        <RoundedBox args={[0.32, 0.08, 0.86]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color={darkStoneColor} roughness={0.9} />
        </RoundedBox>
      </mesh>

      {/* Arch Curve (Torus) */}
      <mesh name="archTopCurve" position={[0, 0.15, 0]} scale={[1, 1, 5.7]} castShadow receiveShadow>
        <torusGeometry args={[0.29, 0.07, 12, 32, Math.PI]} />
        <meshStandardMaterial color={mainColor} roughness={0.82} />
      </mesh>

      {/* Keystone */}
      <mesh name="archKeystone" position={[0, 0.38, 0]} castShadow receiveShadow>
        <RoundedBox args={[0.15, 0.18, 0.86]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color={accentStoneColor} roughness={0.85} />
        </RoundedBox>
      </mesh>

      {/* Top Lintel Slab */}
      <mesh name="archTopLintel" position={[0, 0.43, 0]} castShadow receiveShadow>
        <RoundedBox args={[1.02, 0.14, 0.84]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color={lintelColor} roughness={0.88} />
        </RoundedBox>
      </mesh>
    </group>
  );
}

