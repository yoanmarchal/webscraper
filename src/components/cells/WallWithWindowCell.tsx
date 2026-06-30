import React, { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import { Geometry, Base, Subtraction } from '@react-three/csg';
import { RoundedBoxGeometry } from 'three-stdlib';
import type { GridCell, ProtectedAreasConfig } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { 
  getExposedFaces, 
  getCornerRadii, 
  hasOccupiedCell,
  FLAT_LIMIT,
  EDGE_R 
} from '../../utils/cellUtils';
import { varyColorBrightness } from '../../colorPalettes';
import { ShapedBox } from '../ShapedBox';
import { WINDOW_PROTECTED_AREAS, isInProtectedArea, TOWER_EXTERNAL_RADIUS, DECO_BAND_RADIUS } from '../../config/protectedAreasConfig';
import { renderStonePatches as renderStonePatchesShared } from '../../utils/stonePatches';
import { renderQuoins, isQuoinProtected } from '../../utils/cornerDecorations';

interface WallWithWindowCellProps {
  cell: GridCell;
  position: [number, number, number];
  lookup: CellLookup;
  isIsolated: boolean;
}

export function WallWithWindowCell({ cell, position, lookup, isIsolated }: WallWithWindowCellProps) {
  const exposedFaces = getExposedFaces(lookup, cell);

  const baseColor = cell.color ?? '#e0c996';
  const windowFrameColor = varyColorBrightness(baseColor, -0.15);
  const windowGlassColor = '#2a3a4a';
  const doorColor = varyColorBrightness(baseColor, -0.20);
  const doorFrameColor = varyColorBrightness(baseColor, -0.15);

  const radii = getCornerRadii(lookup, cell);

  // Calculer le radius moyen du bloc pour l'utiliser dans tous les éléments
  const avgRadius = (radii.backLeft + radii.backRight + radii.frontLeft + radii.frontRight) / 4;

  // Pré-calcul des rayons pour la fenêtre
  const windowRadius = Math.min(0.025, avgRadius * 0.9);
  const glassRadius = Math.min(0.02, avgRadius * 0.8);

  // ── Géométries CSG mémorisées (optimisation R3F) ──────────────────────
  const frameOuterGeometry = useMemo(
    () => new RoundedBoxGeometry(0.6, 0.5, 0.02, 4, windowRadius),
    [windowRadius]
  );

  const frameInnerGeometry = useMemo(
    () => new RoundedBoxGeometry(0.54, 0.44, 0.04, 4, glassRadius),
    [glassRadius]
  );

  // Rayons pour les stone patches sur les tours
  const towerStoneRadius = TOWER_EXTERNAL_RADIUS;

  const MAIN_ELEMENT_ROUNDING_RADIUS = 0.015;
  const MAIN_BLOCK_EDGE_RADIUS = 0.12;

  // Déterminer le contexte du bloc
  const hasLeftNeighbor = hasOccupiedCell(lookup, cell.x - 1, cell.y, cell.z);
  const hasRightNeighbor = hasOccupiedCell(lookup, cell.x + 1, cell.y, cell.z);
  const hasFrontNeighbor = hasOccupiedCell(lookup, cell.x, cell.y, cell.z + 1);
  const hasBackNeighbor = hasOccupiedCell(lookup, cell.x, cell.y, cell.z - 1);

  const exteriorFaces = [
    !hasLeftNeighbor ? 'left' : null,
    !hasRightNeighbor ? 'right' : null,
    !hasFrontNeighbor ? 'front' : null,
    !hasBackNeighbor ? 'back' : null
  ].filter((face): face is string => face !== null);

  const isExteriorWall = exteriorFaces.length > 0;
  const exteriorFaceCount = exteriorFaces.length;
  const isFullyExposed = exteriorFaceCount === 4;
  const isCorner = exteriorFaceCount >= 2 && !isFullyExposed;

  // ── Porte au rez-de-chaussée uniquement ────────────────────────────────
  const isGroundFloor = cell.y === 0;
  const doorFaceHash = Math.abs(cell.x * 31 + cell.z * 17) % Math.max(exposedFaces.length, 1);
  const doorFace = isGroundFloor && exposedFaces.length > 0 ? exposedFaces[doorFaceHash] : null;

  const rotMap: Record<string, number> = {
    front: 0,
    back: Math.PI,
    left: -Math.PI / 2,
    right: Math.PI / 2,
  };

  // ── Pierres apparentes ─────────────────────────────────────────────────
  const STONES_PER_FACE = 25;

  const renderStonePatches = (hasBands: boolean) => {
    if (exposedFaces.length === 0) return null;

    const stoneColor = varyColorBrightness(baseColor, -0.25);
    const baseStoneW = 0.12 + (Math.abs(cell.x) % 4) * 0.02;
    const baseStoneH = baseStoneW * 0.75;

    return renderStonePatchesShared({
      cell,
      exposedFaces,
      isIsolated,
      radii,
      cornerMode: 'numeric',
      towerRadius: towerStoneRadius,
      wallSurfaceOffset: 0.015,
      stonesPerFace: STONES_PER_FACE,
      seedSalt: { x: 7, y: 11, z: 13, face: 23, stone: 17 },
      baseSize: { width: baseStoneW, height: baseStoneH },
      computeSize: (h1, h2, _h3, base) => ({
        width: base.width * (0.85 + (h1 % 20) / 100),
        height: base.height * (0.8 + (h2 % 15) / 100),
      }),
      distance: { xBase: 0, xModRange: 45, yBase: 0, yModRange: 45 },
      visual: {
        thickness: 0.025,
        cornerRadius: 0.012,
        smoothness: 4,
        color: stoneColor,
        roughness: 0.85,
        metalness: 0.1,
        metalnessIsolated: 0.05,
      },
      isInProtectedZone: (face, x, y, w, h) => {
        let area = WINDOW_PROTECTED_AREAS.window;
        if (face === doorFace) {
          area = WINDOW_PROTECTED_AREAS.door;
        } else if (isIsolated) {
          area = WINDOW_PROTECTED_AREAS.arrowSlit;
        }

        if (isInProtectedArea(area, x, y, w, h)) return true;
        
        if (hasBands) {
          if (isInProtectedArea(WINDOW_PROTECTED_AREAS.bandTop, x, y, w, h)) return true;
          if (isInProtectedArea(WINDOW_PROTECTED_AREAS.bandBottom, x, y, w, h)) return true;
        }

        if (isQuoinProtected(cell, lookup, isIsolated, face, x, w)) return true;
        
        return false;
      },
    });
  };

  // ── Fenêtre avec géométrie soustraite (CSG) ────────────────────────────
  const createSimpleWindow = (rotation: number, faceId: number) => {
    return (
      <group name="window" rotation={[0, rotation, 0]} key={`window-${faceId}`}>
        {/* Cadre de fenêtre creusé via @react-three/csg */}
        <mesh name="windowFrame" position={[0, 0, 0.50]} castShadow receiveShadow>
          <Geometry>
            <Base geometry={frameOuterGeometry} />
            <Subtraction geometry={frameInnerGeometry} />
          </Geometry>
          <meshStandardMaterial color={windowFrameColor} roughness={0.85} />
        </mesh>
        
        {/* Vitre transparente */}
        <mesh name="windowGlass" position={[0, 0, 0.51]} castShadow receiveShadow>
          <RoundedBox args={[0.54, 0.44, 0.03]} radius={glassRadius} smoothness={4}>
            <meshStandardMaterial
              color={windowGlassColor}
              roughness={0.1}
              metalness={0.15}
              transparent
              opacity={0.85}
            />
          </RoundedBox>
        </mesh>
        
        {/* Séparateur horizontal */}
        <mesh name="windowHorizontalSeparator" position={[0, 0, 0.52]} castShadow>
          <boxGeometry args={[0.54, 0.05, 0.019]} />
          <meshStandardMaterial color={varyColorBrightness(windowFrameColor, -0.05)} roughness={0.88} />
        </mesh>
        
        {/* Séparateur vertical */}
        <mesh name="windowVerticalSeparator" position={[0, 0, 0.52]} castShadow>
          <boxGeometry args={[0.03, 0.44, 0.019]} />
          <meshStandardMaterial color={varyColorBrightness(windowFrameColor, -0.05)} roughness={0.88} />
        </mesh>
      </group>
    );
  };

  // ── Porte simplifiée ────────────────────────────────────────────────────
  const createSimpleDoor = (rotation: number, key: string) => {
    const doorFrameRadius = Math.min(0.015, avgRadius * 0.8);
    const doorPanelRadius = Math.min(0.012, avgRadius * 0.7);
    const thresholdRadius = Math.min(0.01, avgRadius * 0.6);

    return (
      <group name="door" rotation={[0, rotation, 0]} key={key}>
        <mesh name="doorFrame" position={[0, -0.06, 0.502]} castShadow receiveShadow>
          <RoundedBox args={[0.48, 0.8, 0.03]} radius={doorFrameRadius} smoothness={4}>
            <meshStandardMaterial color={doorFrameColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        <mesh name="doorPanel" position={[0, -0.10, 0.5]} castShadow receiveShadow>
          <RoundedBox args={[0.4, 0.7, 0.04]} radius={doorPanelRadius} smoothness={6}>
            <meshStandardMaterial color={doorColor} roughness={0.92} />
          </RoundedBox>
        </mesh>
        <mesh name="doorHandle" position={[0.16, -0.14, 0.502]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.04, 8]} />
          <meshStandardMaterial color="#8a6a3a" metalness={0.55} roughness={0.35} />
        </mesh>
        <mesh name="doorThreshold" position={[0, -0.49, 0.501]} castShadow receiveShadow>
          <RoundedBox args={[0.5, 0.04, 0.03]} radius={thresholdRadius} smoothness={4}>
            <meshStandardMaterial color={varyColorBrightness(baseColor, -0.18)} roughness={0.94} />
          </RoundedBox>
        </mesh>
      </group>
    );
  };

  // ── Meurtrière simplifiée (sans volets) ───────────────────────────────
  const createSimpleArrowSlit = (rotation: number, faceId: number) => {
    const arrowSlitRadius = Math.min(0.02, avgRadius * 0.9);
    const arrowSlitInnerRadius = Math.min(0.015, avgRadius * 0.7);

    return (
      <group name="arrowSlit" rotation={[0, rotation, 0]} key={`arrowslit-${faceId}`}>
        <mesh name="arrowSlitMain" position={[0, 0, 0.505]} castShadow receiveShadow>
          <RoundedBox args={[0.14, 0.4, 0.02]} radius={arrowSlitRadius} smoothness={4}>
            <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
          </RoundedBox>
        </mesh>
        <mesh name="arrowSlitInner" position={[0, 0, 0.49]} castShadow receiveShadow>
          <RoundedBox args={[0.08, 0.32, 0.04]} radius={arrowSlitInnerRadius} smoothness={4}>
            <meshStandardMaterial color="#0a0a0a" roughness={0.98} />
          </RoundedBox>
        </mesh>
      </group>
    );
  };

  // ── Helper : rendu d'une face ──────────────────────────────────────────
  const renderFace = (face: string, index: number) => {
    if (face === doorFace) {
      return createSimpleDoor(rotMap[face], `door-${index}`);
    }
    const rot = rotMap[face];
    if (isIsolated) return createSimpleArrowSlit(rot, index);
    return createSimpleWindow(rot, index);
  };

  const decoColor = varyColorBrightness(baseColor, -0.2);
  const hasBands = isExteriorWall;

  // ── RENDU UNIFIÉ ──────────────────────────────────────────────────────
  return (
    <group name="wallWithWindowCell" position={position}>
      <ShapedBox args={[1.0, 1.0, 1.0]} radii={radii} isIsolated={isIsolated}
        color={cell.color ?? '#e0c996'} roughness={0.94} castShadow receiveShadow
        edgeRadius={MAIN_BLOCK_EDGE_RADIUS} />
      
      {renderQuoins({ cell, lookup, isIsolated, baseColor, radii })}
      {renderStonePatches(hasBands)}
      {exposedFaces.map((face, index) => renderFace(face, index))}
    </group>
  );
}