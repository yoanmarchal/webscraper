import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { getExposedFaces, getCornerRadii } from '../../utils/cellUtils';
import { varyColorBrightness } from '../../colorPalettes';
import { ShapedBox } from '../ShapedBox';

interface WallWithWindowCellProps {
  cell: GridCell;
  position: [number, number, number];
  lookup: CellLookup;
  isIsolated: boolean;
}

export function WallWithWindowCell({ cell, position, lookup, isIsolated }: WallWithWindowCellProps) {
  const windowVariant = (cell.x + cell.z) % 2; // Simplifié à 2 variantes
  const exposedFaces = getExposedFaces(lookup, cell);

  const baseColor = cell.color ?? '#e0c996';
  const windowFrameColor = varyColorBrightness(baseColor, -0.15);
  const windowGlassColor = '#2a3a4a';
  const doorColor = varyColorBrightness(baseColor, -0.20);
  const doorFrameColor = varyColorBrightness(baseColor, -0.15);

  const radii = getCornerRadii(lookup, cell);

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

  // ── Fenêtre simplifiée ─────────────────────────────────────────────────
  const createSimpleWindow = (rotation: number, faceId: number) => {
    return (
      <group name="window" rotation={[0, rotation, 0]} key={`window-${faceId}`}>
        {/* Cadre de fenêtre adapté à l'arrondi */}
        <mesh name="windowFrame" position={[0, 0, 0.505]} castShadow receiveShadow>
          <RoundedBox args={[0.6, 0.5, 0.02]} radius={0.02} smoothness={4}>
            <meshStandardMaterial color={windowFrameColor} roughness={0.85} />
          </RoundedBox>
        </mesh>
        {/* Vitre transparente */}
        <mesh name="windowGlass" position={[0, 0, 0.495]} castShadow receiveShadow>
          <RoundedBox args={[0.54, 0.44, 0.01]} radius={0.015} smoothness={4}>
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
        <mesh position={[0, 0, 0.51]} castShadow>
          <boxGeometry args={[0.56, 0.03, 0.01]} />
          <meshStandardMaterial color={varyColorBrightness(windowFrameColor, -0.05)} roughness={0.88} />
        </mesh>
        {/* Séparateur vertical */}
        <mesh position={[0, 0, 0.51]} castShadow>
          <boxGeometry args={[0.03, 0.46, 0.01]} />
          <meshStandardMaterial color={varyColorBrightness(windowFrameColor, -0.05)} roughness={0.88} />
        </mesh>
      </group>
    );
  };

  // ── Porte simplifiée ────────────────────────────────────────────────────
  const createSimpleDoor = (rotation: number, key: string) => {
    return (
      <group name="door" rotation={[0, rotation, 0]} key={key}>
        {/* Encadrement de porte */}
        <mesh name="doorFrame" position={[0, -0.06, 0.502]} castShadow receiveShadow>
          <RoundedBox args={[0.48, 0.8, 0.03]} radius={0.012} smoothness={4}>
            <meshStandardMaterial color={doorFrameColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        {/* Panneau de porte */}
        <mesh name="doorPanel" position={[0, -0.10, 0.5]} castShadow receiveShadow>
          <RoundedBox args={[0.4, 0.7, 0.04]} radius={0.01} smoothness={6}>
            <meshStandardMaterial color={doorColor} roughness={0.92} />
          </RoundedBox>
        </mesh>
        {/* Poignée de porte */}
        <mesh name="doorHandle" position={[0.16, -0.14, 0.502]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.04, 8]} />
          <meshStandardMaterial color="#8a6a3a" metalness={0.55} roughness={0.35} />
        </mesh>
        {/* Seuil de porte */}
        <mesh name="doorThreshold" position={[0, -0.49, 0.501]} castShadow receiveShadow>
          <RoundedBox args={[0.5, 0.04, 0.03]} radius={0.008} smoothness={4}>
            <meshStandardMaterial color={varyColorBrightness(baseColor, -0.18)} roughness={0.94} />
          </RoundedBox>
        </mesh>
      </group>
    );
  };

  // ── Meurtrière simplifiée (sans volets) ───────────────────────────────
  const createSimpleArrowSlit = (rotation: number, faceId: number) => (
    <group name="arrowSlit" rotation={[0, rotation, 0]} key={`arrowslit-${faceId}`}>
      {/* Ouverture de meurtrière simple */}
      <mesh name="arrowSlitMain" position={[0, 0, 0.505]} castShadow receiveShadow>
        <RoundedBox args={[0.14, 0.4, 0.02]} radius={0.015} smoothness={4}>
          <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
        </RoundedBox>
      </mesh>
      {/* Intérieur de meurtrière */}
      <mesh name="arrowSlitInner" position={[0, 0, 0.49]} castShadow receiveShadow>
        <RoundedBox args={[0.08, 0.32, 0.04]} radius={0.01} smoothness={4}>
          <meshStandardMaterial color="#0a0a0a" roughness={0.98} />
        </RoundedBox>
      </mesh>
    </group>
  );

  // ── Helper : rendu d'une face ──────────────────────────────────────────
  const renderFace = (face: string, index: number, towerMode: boolean) => {
    if (face === doorFace) {
      return createSimpleDoor(rotMap[face], `door-${index}`);
    }
    const rot = rotMap[face];
    if (towerMode) return createSimpleArrowSlit(rot, index);
    return createSimpleWindow(rot, index);
  };

  // ── RENDU TOUR ISOLÉE ──────────────────────────────────────────────────
  if (isIsolated) {
    return (
      <group name="wallWithWindowCell" position={position}>
        <ShapedBox args={[1.0, 1.0, 1.0]} radii={radii} isIsolated={true}
          color={cell.color ?? '#d0baa0'} roughness={0.94} castShadow receiveShadow />

        {/* Décorations murales fusionnées - bandes décoratives simples */}
        <mesh name="decorativeBandTop" position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.52, 0.52, 0.05, 12]} />
          <meshStandardMaterial color={varyColorBrightness(baseColor, -0.1)} roughness={0.9} />
        </mesh>
        <mesh name="decorativeBandBottom" position={[0, -0.35, 0]} castShadow>
          <cylinderGeometry args={[0.52, 0.52, 0.05, 12]} />
          <meshStandardMaterial color={varyColorBrightness(baseColor, -0.1)} roughness={0.9} />
        </mesh>

        {exposedFaces.map((face, index) => renderFace(face, index, true))}
      </group>
    );
  }

  // ── RENDU MUR STANDARD ────────────────────────────────────────────────
  return (
    <group name="wallWithWindowCell" position={position}>
      <ShapedBox args={[1.0, 1.0, 1.0]} radii={radii} isIsolated={false}
        color={cell.color ?? '#e0c996'} roughness={0.94} castShadow receiveShadow />

      {/* Décorations murales fusionnées - texture de base avec le bloc */}
      {/* Les décorations sont maintenant intégrées directement dans le ShapedBox */}

      {exposedFaces.map((face, index) => renderFace(face, index, false))}
    </group>
  );
}
