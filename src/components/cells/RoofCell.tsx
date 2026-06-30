import * as THREE from 'three';
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

// ── Geometry constants (local cell space: Y=0 is cell center, ±0.5 = cell edges) ──
const EAVE_Y    = -0.50;                                  // bottom of slope flush with cell bottom
const RIDGE_Y   =  0.22;                                  // top of slope (ridge)
const RISE      = RIDGE_Y - EAVE_Y;                       // 0.72
const RUN       = 0.5;                                     // horizontal run = half cell width
const SLOPE_LEN = Math.sqrt(RISE * RISE + RUN * RUN);     // ≈ 0.872
const SLOPE_ANG = Math.atan2(RISE, RUN);                  // radians
const CENTER_Y  = (EAVE_Y + RIDGE_Y) / 2;
const PANEL_LEN = 1.08;                                    // panel length along ridge (incl. overhang)
const PANEL_T   = 0.055;                                   // panel thickness

// Tour radius matches the cylinder body (r = 0.5 = cell half-width)
const TOWER_R = 0.50;

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

  // Rib Z offsets in panel-local space (4 tile rows along the ridge direction)
  const RIB_OFFSETS: number[] = [-0.40, -0.13, 0.13, 0.40];

  // ── Chimney (deterministic: ~33% of cells) ──
  const renderChimney = () => {
    if ((cell.x + cell.z) % 3 !== 0) return null;
    const sideX = cell.x % 2 === 0 ? 0.14 : -0.14;
    return (
      <group name="chimney" position={[sideX, RIDGE_Y - 0.06, 0.06]}>
        {/* Stone body */}
        <mesh name="chimneyBody" castShadow receiveShadow>
          <boxGeometry args={[0.14, 0.46, 0.14]} />
          <meshStandardMaterial color="#a09080" roughness={0.93} />
        </mesh>
        {/* Stone cap */}
        <mesh name="chimneyCap" castShadow position={[0, 0.25, 0]}>
          <boxGeometry args={[0.19, 0.04, 0.19]} />
          <meshStandardMaterial color="#7a6a5a" roughness={0.91} />
        </mesh>
        {/* Terracotta pot */}
        <mesh name="chimneyPot" castShadow position={[0, 0.31, 0]}>
          <cylinderGeometry args={[0.034, 0.042, 0.09, 8]} />
          <meshStandardMaterial color="#a05a42" roughness={0.82} />
        </mesh>
      </group>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // CASE 1 — Isolated tower: round parapet + conical spire
  //
  // Designed to sit flush on top of the cylindrical body below (r = 0.5).
  // All elements are circular to match the tower shape.
  // ════════════════════════════════════════════════════════════════════════════
  if (isIsolated) {
    // Parapet : cylindre solide légèrement plus large que le corps (r=0.5)
    // Il descend 0.05 sous la limite de la cellule pour chevaucher le corps en dessous.
    const PARAPET_R     = TOWER_R + 0.04;   // overhang léger sur le cylindre
    const PARAPET_Y_BOT = -0.55;            // -0.05 sous la limite → chevauche le corps
    const PARAPET_Y_TOP = -0.10;
    const PARAPET_H     = PARAPET_Y_TOP - PARAPET_Y_BOT;  // 0.45
    const PARAPET_MID_Y = PARAPET_Y_BOT + PARAPET_H / 2;

    // Merlons circulaires espacés régulièrement sur le bord du parapet
    const MERLON_COUNT  = 6;
    const MERLON_R      = 0.10;
    const MERLON_H      = 0.28;
    const MERLON_RING_R = TOWER_R;
    const MERLON_Y      = PARAPET_Y_TOP + MERLON_H / 2;

    // Flèche conique
    const SPIRE_BASE_R  = TOWER_R - 0.06;
    const SPIRE_H       = 1.10;

    return (
      <group name="roofCell" position={position}>

          {/* ── Corps du parapet (cylindre solide) ── */}
          <mesh name="parapetBody" castShadow receiveShadow position={[0, PARAPET_MID_Y, 0]}>
            <cylinderGeometry args={[PARAPET_R, PARAPET_R, PARAPET_H, 24]} />
            <meshStandardMaterial color={roofColor} roughness={0.90} />
          </mesh>

          {/* ── Bandeau de couronnement ── */}
          <mesh name="parapetCrownBand" castShadow receiveShadow position={[0, PARAPET_Y_TOP + 0.02, 0]}>
            <cylinderGeometry args={[PARAPET_R + 0.02, PARAPET_R + 0.02, 0.04, 24]} />
            <meshStandardMaterial color={colorDark} roughness={0.88} />
          </mesh>

          {/* ── Merlons ── */}
          {Array.from({ length: MERLON_COUNT }).map((_, i) => {
            const angle = (i / MERLON_COUNT) * Math.PI * 2;
            const mx = Math.cos(angle) * MERLON_RING_R;
            const mz = Math.sin(angle) * MERLON_RING_R;
            return (
              <mesh name={`merlon-${i}`} key={`merlon-${i}`} castShadow receiveShadow position={[mx, MERLON_Y, mz]}>
                <cylinderGeometry args={[MERLON_R, MERLON_R * 1.1, MERLON_H, 10]} />
                <meshStandardMaterial color={roofColor} roughness={0.87} />
              </mesh>
            );
          })}

          {/* ── Bague de base de flèche ── */}
          <mesh name="spireBaseRing" castShadow receiveShadow position={[0, PARAPET_Y_TOP + 0.09, 0]}>
            <cylinderGeometry args={[SPIRE_BASE_R + 0.04, SPIRE_BASE_R + 0.08, 0.10, 16]} />
            <meshStandardMaterial color={colorDark} roughness={0.88} />
          </mesh>

          {/* ── Flèche conique ── */}
          <mesh name="spireCone" castShadow receiveShadow position={[0, PARAPET_Y_TOP + 0.14 + SPIRE_H / 2, 0]}>
            <coneGeometry args={[SPIRE_BASE_R, SPIRE_H, 16]} />
            <meshStandardMaterial color={colorDark} roughness={0.82} />
          </mesh>

          {/* ── Anneaux de tuiles sur la flèche ── */}
          {[0.18, 0.36, 0.54, 0.72].map((t, i) => {
            const bandR = SPIRE_BASE_R * (1 - t);
            const bandY = PARAPET_Y_TOP + 0.14 + t * SPIRE_H;
            return (
              <mesh name={`spireBand-${i}`} key={`band-${i}`} castShadow position={[0, bandY, 0]}>
                <cylinderGeometry args={[bandR + 0.015, bandR + 0.015, 0.03, 16]} />
                <meshStandardMaterial color={roofColor} roughness={0.88} />
              </mesh>
            );
          })}

          {/* ── Épis doré ── */}
          <mesh name="spireFinial" castShadow position={[0, PARAPET_Y_TOP + 0.14 + SPIRE_H + 0.06, 0]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color="#d4a04f" metalness={0.75} roughness={0.15} />
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
      <group name="rightSlopePanel" position={[RUN / 2, CENTER_Y, 0]} rotation={[0, 0, -SLOPE_ANG]}>
        {/* Main panel surface */}
        <mesh name="rightSlopePanelSurface" castShadow receiveShadow>
          <boxGeometry args={[SLOPE_LEN, PANEL_T, PANEL_LEN]} />
          <meshStandardMaterial color={roofColor} roughness={0.84} />
        </mesh>
        {/* Horizontal tile rib lines */}
        {RIB_OFFSETS.map((z, i) => (
          <mesh key={i} name={`rightSlopePanelRib-${i}`} castShadow position={[0, PANEL_T / 2 + 0.012, z]}>
            <boxGeometry args={[SLOPE_LEN, 0.022, 0.042]} />
            <meshStandardMaterial color={colorDark} roughness={0.92} />
          </mesh>
        ))}
      </group>

      {/* ── Left slope panel (slopes down toward −X) ── */}
      <group name="leftSlopePanel" position={[-RUN / 2, CENTER_Y, 0]} rotation={[0, 0, SLOPE_ANG]}>
        {/* Main panel surface */}
        <mesh name="leftSlopePanelSurface" castShadow receiveShadow>
          <boxGeometry args={[SLOPE_LEN, PANEL_T, PANEL_LEN]} />
          <meshStandardMaterial color={colorLight} roughness={0.84} />
        </mesh>
        {/* Horizontal tile rib lines */}
        {RIB_OFFSETS.map((z, i) => (
          <mesh key={i} name={`leftSlopePanelRib-${i}`} castShadow position={[0, PANEL_T / 2 + 0.012, z]}>
            <boxGeometry args={[SLOPE_LEN, 0.022, 0.042]} />
            <meshStandardMaterial color={colorDark} roughness={0.92} />
          </mesh>
        ))}
      </group>

      {/* ── Ridge cap ── */}
      <mesh name="ridgeCap" castShadow receiveShadow position={[0, RIDGE_Y + 0.028, 0]}>
        <boxGeometry args={[0.14, 0.056, PANEL_LEN + 0.02]} />
        <meshStandardMaterial color={colorDark} roughness={0.89} />
      </mesh>

      {/* ── Ridge end caps (rounded knobs) ── */}
      {needGablePos && (
        <mesh name="ridgeEndCapPos" castShadow position={[0, RIDGE_Y + 0.028, PANEL_LEN / 2 + 0.01]}>
          <boxGeometry args={[0.14, 0.056, 0.06]} />
          <meshStandardMaterial color={colorDark} roughness={0.89} />
        </mesh>
      )}
      {needGableNeg && (
        <mesh name="ridgeEndCapNeg" castShadow position={[0, RIDGE_Y + 0.028, -(PANEL_LEN / 2 + 0.01)]}>
          <boxGeometry args={[0.14, 0.056, 0.06]} />
          <meshStandardMaterial color={colorDark} roughness={0.89} />
        </mesh>
      )}

      {/* ── Right eave board (fascia) ── */}
      <mesh name="rightEaveBoard" castShadow receiveShadow position={[0.518, EAVE_Y - 0.020, 0]}>
        <boxGeometry args={[0.044, 0.064, PANEL_LEN + 0.06]} />
        <meshStandardMaterial color={colorDark} roughness={0.89} />
      </mesh>

      {/* ── Left eave board (fascia) ── */}
      <mesh name="leftEaveBoard" castShadow receiveShadow position={[-0.518, EAVE_Y - 0.020, 0]}>
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
          <mesh name="bargeBoardPosPos" castShadow position={[RUN / 2, CENTER_Y, 0.502]} rotation={[0, 0, -SLOPE_ANG]}>
            <boxGeometry args={[SLOPE_LEN, 0.04, 0.05]} />
            <meshStandardMaterial color={colorDark} roughness={0.91} />
          </mesh>
          <mesh name="bargeBoardPosNeg" castShadow position={[-RUN / 2, CENTER_Y, 0.502]} rotation={[0, 0, SLOPE_ANG]}>
            <boxGeometry args={[SLOPE_LEN, 0.04, 0.05]} />
            <meshStandardMaterial color={colorDark} roughness={0.91} />
          </mesh>
          {/* Gable bottom board */}
          <mesh name="gablePosBottomBoard" castShadow receiveShadow position={[0, EAVE_Y - 0.020, 0.502]}>
            <boxGeometry args={[1.06, 0.064, 0.044]} />
            <meshStandardMaterial color={colorDark} roughness={0.89} />
          </mesh>
        </>
      )}

      {/* ── Gable face at −Z end ── */}
      {needGableNeg && (
        <>
          {/* Triangular gable fill */}
          <mesh name="gableNegFill" castShadow receiveShadow geometry={gableGeo} position={[0, 0, -0.466]} rotation={[0, Math.PI, 0]}>
            <meshStandardMaterial color={roofColor} roughness={0.88} />
          </mesh>
          {/* Barge boards */}
          <mesh name="bargeBoardNegPos" castShadow position={[RUN / 2, CENTER_Y, -0.502]} rotation={[0, 0, -SLOPE_ANG]}>
            <boxGeometry args={[SLOPE_LEN, 0.04, 0.05]} />
            <meshStandardMaterial color={colorDark} roughness={0.91} />
          </mesh>
          <mesh name="bargeBoardNegNeg" castShadow position={[-RUN / 2, CENTER_Y, -0.502]} rotation={[0, 0, SLOPE_ANG]}>
            <boxGeometry args={[SLOPE_LEN, 0.04, 0.05]} />
            <meshStandardMaterial color={colorDark} roughness={0.91} />
          </mesh>
          {/* Gable bottom board */}
          <mesh name="gableNegBottomBoard" castShadow receiveShadow position={[0, EAVE_Y - 0.020, -0.502]}>
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
