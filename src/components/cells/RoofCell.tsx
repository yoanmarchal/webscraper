import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { getRoofConfig, getCornerRadii } from '../../utils/cellUtils';
import { varyColorBrightness } from '../../colorPalettes';
import { ShapedBox } from '../ShapedBox';

interface RoofCellProps {
  cell: GridCell;
  position: [number, number, number];
  lookup: CellLookup;
  isIsolated: boolean;
}

// ── Geometry constants (local cell space: Y=0 is cell center, ±0.5 = cell edges) ──
const EAVE_Y    = -0.42;                                  // bottom of slope (eave)
const RIDGE_Y   =  0.22;                                  // top of slope (ridge)
const RISE      = RIDGE_Y - EAVE_Y;                       // 0.64
const RUN       = 0.5;                                     // horizontal run = half cell width
const SLOPE_LEN = Math.sqrt(RISE * RISE + RUN * RUN);     // ≈ 0.806
const SLOPE_ANG = Math.atan2(RISE, RUN);                  // ≈ 51.9°  in radians
const CENTER_Y  = (EAVE_Y + RIDGE_Y) / 2;               // −0.10 (mid-slope Y)
const PANEL_LEN = 1.08;                                    // panel length along ridge (incl. overhang)
const PANEL_T   = 0.055;                                   // panel thickness

// ── Shared gable geometry (triangular prism) – created once ──────────────────
function buildGableGeometry(): THREE.BufferGeometry {
  const hw = 0.525; // half-width of gable base (slight overhang)
  const hd = 0.035; // half-depth (gable wall thickness)

  // Each face has its own vertex copies so computeVertexNormals() gives sharp edges.
  const pos = new Float32Array([
    // Front face (z = +hd)  →  verts 0,1,2
    -hw, EAVE_Y,  hd,
     hw, EAVE_Y,  hd,
      0, RIDGE_Y, hd,
    // Back face (z = -hd)   →  verts 3,4,5
     hw, EAVE_Y,  -hd,
    -hw, EAVE_Y,  -hd,
      0, RIDGE_Y, -hd,
    // Bottom face            →  verts 6,7,8,9
    -hw, EAVE_Y,  hd,
    -hw, EAVE_Y, -hd,
     hw, EAVE_Y, -hd,
     hw, EAVE_Y,  hd,
    // Left slant face        →  verts 10,11,12,13
    -hw, EAVE_Y,  hd,
      0, RIDGE_Y, hd,
      0, RIDGE_Y,-hd,
    -hw, EAVE_Y, -hd,
    // Right slant face       →  verts 14,15,16,17
     hw, EAVE_Y,  hd,
     hw, EAVE_Y, -hd,
      0, RIDGE_Y,-hd,
      0, RIDGE_Y, hd,
  ]);

  // Winding verified for correct per-face normals:
  const idx = new Uint16Array([
    0, 1, 2,                        // front   (normal: +Z)
    3, 4, 5,                        // back    (normal: −Z)
    6, 7, 8,   6, 8, 9,             // bottom  (normal: −Y)
    10, 11, 12, 10, 12, 13,         // left slant  (normal: −X,+Y)
    14, 15, 16, 14, 16, 17,         // right slant (normal: +X,+Y)
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  return geo;
}

let _gableGeo: THREE.BufferGeometry | null = null;
const getGableGeo = () => {
  if (!_gableGeo) _gableGeo = buildGableGeometry();
  return _gableGeo;
};

// ── RoofCell ─────────────────────────────────────────────────────────────────
export function RoofCell({ cell, position, lookup, isIsolated }: RoofCellProps) {
  const roofConfig = getRoofConfig(lookup, cell);
  const roofColor  = cell.color ?? '#c85a3f';
  const colorDark  = varyColorBrightness(roofColor, -0.18);
  const colorLight = varyColorBrightness(roofColor, 0.07);

  // ── Shape inheritance: corner radii driven by neighbours ──────────────────
  const radii = getCornerRadii(lookup, cell);

  // Rib Z offsets in panel-local space (4 tile rows along the ridge direction)
  const RIB_OFFSETS: number[] = [-0.40, -0.13, 0.13, 0.40];

  // ── Chimney (deterministic: ~33% of cells) ──
  const renderChimney = () => {
    if ((cell.x + cell.z) % 3 !== 0) return null;
    const sideX = cell.x % 2 === 0 ? 0.14 : -0.14;
    return (
      <group name="chimney" position={[sideX, RIDGE_Y - 0.06, 0.06]}>
        {/* Stone body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.14, 0.46, 0.14]} />
          <meshStandardMaterial color="#a09080" roughness={0.93} />
        </mesh>
        {/* Stone cap */}
        <mesh castShadow position={[0, 0.25, 0]}>
          <boxGeometry args={[0.19, 0.04, 0.19]} />
          <meshStandardMaterial color="#7a6a5a" roughness={0.91} />
        </mesh>
        {/* Terracotta pot */}
        <mesh castShadow position={[0, 0.31, 0]}>
          <cylinderGeometry args={[0.034, 0.042, 0.09, 8]} />
          <meshStandardMaterial color="#a05a42" roughness={0.82} />
        </mesh>
      </group>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // CASE 1 — Isolated tower (battlements + conical spire)
  // ════════════════════════════════════════════════════════════════════════════
  if (isIsolated) {
    const CORNERS: [number, number][] = [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]];
    const FACES:   [number, number][] = [[0, -0.50], [0, 0.50], [-0.50, 0], [0.50, 0]];
    return (
      <group name="roofCell" position={position}>
        {/* Battlement ledge */}
        <mesh castShadow receiveShadow position={[0, -0.40, 0]}>
          <RoundedBox args={[1.10, 0.12, 1.10]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={colorDark} roughness={0.93} />
          </RoundedBox>
        </mesh>

        {/* Corner merlons */}
        {CORNERS.map(([x, z], i) => (
          <mesh key={`cm-${i}`} castShadow receiveShadow position={[x, 0.09, z]}>
            <RoundedBox args={[0.27, 0.50, 0.27]} radius={0.03} smoothness={4}>
              <meshStandardMaterial color={roofColor} roughness={0.87} />
            </RoundedBox>
          </mesh>
        ))}

        {/* Face merlons */}
        {FACES.map(([x, z], i) => {
          const isZFace = i < 2;
          return (
            <mesh key={`fm-${i}`} castShadow receiveShadow position={[x, 0.02, z]}>
              <RoundedBox
                args={isZFace ? [0.28, 0.40, 0.10] : [0.10, 0.40, 0.28]}
                radius={0.025}
                smoothness={4}
              >
                <meshStandardMaterial color={colorDark} roughness={0.88} />
              </RoundedBox>
            </mesh>
          );
        })}

        {/* Inner platform */}
        <mesh castShadow receiveShadow position={[0, -0.30, 0]}>
          <cylinderGeometry args={[0.56, 0.56, 0.06, 12]} />
          <meshStandardMaterial color={colorDark} roughness={0.92} />
        </mesh>

        {/* Spire base ring */}
        <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.32, 0.38, 0.10, 8]} />
          <meshStandardMaterial color={roofColor} roughness={0.87} />
        </mesh>

        {/* Main conical spire */}
        <mesh castShadow receiveShadow position={[0, 0.60, 0]}>
          <coneGeometry args={[0.30, 0.90, 8]} />
          <meshStandardMaterial color={colorDark} roughness={0.84} />
        </mesh>

        {/* Tile band rings on spire */}
        {([0.30, 0.46, 0.60] as number[]).map((y, i) => (
          <mesh key={`ring-${i}`} castShadow position={[0, y, 0]}>
            <cylinderGeometry args={[0.30 - i * 0.085, 0.30 - i * 0.085, 0.04, 8]} />
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </mesh>
        ))}

        {/* Golden finial sphere */}
        <mesh castShadow position={[0, 1.07, 0]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color="#d4a04f" metalness={0.72} roughness={0.18} />
        </mesh>
      </group>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CASE 2 — All other cases: proper pitched roof
  //
  // Ridge always runs along local Z; rotate group 90° around Y for axis='x'.
  // Gable faces appear at local ±Z ends where the ridge has no neighbor.
  // ════════════════════════════════════════════════════════════════════════════
  const yRot = roofConfig.axis === 'x' ? Math.PI / 2 : 0;

  // After Y rotation of +π/2: local +Z → world +X, local −Z → world −X
  const needGablePos = roofConfig.axis === 'z'
    ? !roofConfig.hasFront
    : !roofConfig.hasRight;

  const needGableNeg = roofConfig.axis === 'z'
    ? !roofConfig.hasBack
    : !roofConfig.hasLeft;

  const gableGeo = getGableGeo();

  return (
    <group name="roofCell" position={position} rotation={[0, yRot, 0]}>

      {/* ── Right slope panel (slopes down toward +X) ── */}
      <group position={[RUN / 2, CENTER_Y, 0]} rotation={[0, 0, -SLOPE_ANG]}>
        {/* Main panel surface */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[SLOPE_LEN, PANEL_T, PANEL_LEN]} />
          <meshStandardMaterial color={roofColor} roughness={0.84} />
        </mesh>
        {/* Horizontal tile rib lines */}
        {RIB_OFFSETS.map((z, i) => (
          <mesh key={i} castShadow position={[0, PANEL_T / 2 + 0.012, z]}>
            <boxGeometry args={[SLOPE_LEN, 0.022, 0.042]} />
            <meshStandardMaterial color={colorDark} roughness={0.92} />
          </mesh>
        ))}
      </group>

      {/* ── Left slope panel (slopes down toward −X) ── */}
      <group position={[-RUN / 2, CENTER_Y, 0]} rotation={[0, 0, SLOPE_ANG]}>
        {/* Main panel surface */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[SLOPE_LEN, PANEL_T, PANEL_LEN]} />
          <meshStandardMaterial color={colorLight} roughness={0.84} />
        </mesh>
        {/* Horizontal tile rib lines */}
        {RIB_OFFSETS.map((z, i) => (
          <mesh key={i} castShadow position={[0, PANEL_T / 2 + 0.012, z]}>
            <boxGeometry args={[SLOPE_LEN, 0.022, 0.042]} />
            <meshStandardMaterial color={colorDark} roughness={0.92} />
          </mesh>
        ))}
      </group>

      {/* ── Ridge cap ── */}
      <mesh castShadow receiveShadow position={[0, RIDGE_Y + 0.028, 0]}>
        <boxGeometry args={[0.14, 0.056, PANEL_LEN + 0.02]} />
        <meshStandardMaterial color={colorDark} roughness={0.89} />
      </mesh>

      {/* ── Ridge end caps (rounded knobs) ── */}
      {needGablePos && (
        <mesh castShadow position={[0, RIDGE_Y + 0.028, PANEL_LEN / 2 + 0.01]}>
          <boxGeometry args={[0.14, 0.056, 0.06]} />
          <meshStandardMaterial color={colorDark} roughness={0.89} />
        </mesh>
      )}
      {needGableNeg && (
        <mesh castShadow position={[0, RIDGE_Y + 0.028, -(PANEL_LEN / 2 + 0.01)]}>
          <boxGeometry args={[0.14, 0.056, 0.06]} />
          <meshStandardMaterial color={colorDark} roughness={0.89} />
        </mesh>
      )}

      {/* ── Right eave board (fascia) ── */}
      <mesh castShadow receiveShadow position={[0.518, EAVE_Y - 0.020, 0]}>
        <boxGeometry args={[0.044, 0.064, PANEL_LEN + 0.06]} />
        <meshStandardMaterial color={colorDark} roughness={0.89} />
      </mesh>

      {/* ── Left eave board (fascia) ── */}
      <mesh castShadow receiveShadow position={[-0.518, EAVE_Y - 0.020, 0]}>
        <boxGeometry args={[0.044, 0.064, PANEL_LEN + 0.06]} />
        <meshStandardMaterial color={colorDark} roughness={0.89} />
      </mesh>

      {/* ── Gable face at +Z end ── */}
      {needGablePos && (
        <>
          {/* Triangular gable fill */}
          <mesh
            castShadow
            receiveShadow
            geometry={gableGeo}
            position={[0, 0, 0.466]}
          >
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </mesh>
          {/* Barge boards along gable slope edges */}
          <mesh castShadow position={[RUN / 2, CENTER_Y, 0.502]} rotation={[0, 0, -SLOPE_ANG]}>
            <boxGeometry args={[SLOPE_LEN, 0.04, 0.05]} />
            <meshStandardMaterial color={colorDark} roughness={0.91} />
          </mesh>
          <mesh castShadow position={[-RUN / 2, CENTER_Y, 0.502]} rotation={[0, 0, SLOPE_ANG]}>
            <boxGeometry args={[SLOPE_LEN, 0.04, 0.05]} />
            <meshStandardMaterial color={colorDark} roughness={0.91} />
          </mesh>
          {/* Gable bottom board */}
          <mesh castShadow receiveShadow position={[0, EAVE_Y - 0.020, 0.502]}>
            <boxGeometry args={[1.06, 0.064, 0.044]} />
            <meshStandardMaterial color={colorDark} roughness={0.89} />
          </mesh>
        </>
      )}

      {/* ── Gable face at −Z end ── */}
      {needGableNeg && (
        <>
          {/* Triangular gable fill */}
          <mesh
            castShadow
            receiveShadow
            geometry={gableGeo}
            position={[0, 0, -0.466]}
            rotation={[0, Math.PI, 0]}
          >
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </mesh>
          {/* Barge boards */}
          <mesh castShadow position={[RUN / 2, CENTER_Y, -0.502]} rotation={[0, 0, -SLOPE_ANG]}>
            <boxGeometry args={[SLOPE_LEN, 0.04, 0.05]} />
            <meshStandardMaterial color={colorDark} roughness={0.91} />
          </mesh>
          <mesh castShadow position={[-RUN / 2, CENTER_Y, -0.502]} rotation={[0, 0, SLOPE_ANG]}>
            <boxGeometry args={[SLOPE_LEN, 0.04, 0.05]} />
            <meshStandardMaterial color={colorDark} roughness={0.91} />
          </mesh>
          {/* Gable bottom board */}
          <mesh castShadow receiveShadow position={[0, EAVE_Y - 0.020, -0.502]}>
            <boxGeometry args={[1.06, 0.064, 0.044]} />
            <meshStandardMaterial color={colorDark} roughness={0.89} />
          </mesh>
        </>
      )}

      {/* ── Chimney ── */}
      {renderChimney()}

    </group>
  );
}
