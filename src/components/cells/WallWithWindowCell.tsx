import { RoundedBox } from '@react-three/drei';
import type { GridCell } from '../../types';
import type { CellLookup } from '../../utils/cellUtils';
import { getExposedFaces, hasOccupiedCell, getCornerRadii } from '../../utils/cellUtils';
import { varyColorBrightness } from '../../colorPalettes';
import { ShapedBox } from '../ShapedBox';

interface WallWithWindowCellProps {
  cell: GridCell;
  position: [number, number, number];
  lookup: CellLookup;
  isIsolated: boolean;
}

export function WallWithWindowCell({ cell, position, lookup, isIsolated }: WallWithWindowCellProps) {
  // Debug: vérifier si la cellule a un propertyBundle
  console.log(`WallWithWindowCell (${cell.x},${cell.y},${cell.z}) - has propertyBundle:`, !!cell.propertyBundle);
  if (cell.propertyBundle) {
    console.log(`WallWithWindowCell (${cell.x},${cell.y},${cell.z}) - decorationStyle:`, cell.propertyBundle.decorationStyle);
    console.log(`WallWithWindowCell (${cell.x},${cell.y},${cell.z}) - mergeFlags:`, cell.propertyBundle.mergeFlags);
  }

  const windowVariant = (cell.x + cell.z) % 3;
  const exposedFaces = getExposedFaces(lookup, cell);

  const baseColor     = cell.color ?? '#e0c996';
  const quoinColor    = varyColorBrightness(baseColor, -0.12);
  const patchColor    = varyColorBrightness(baseColor, -0.15);
  const trimColor     = varyColorBrightness(baseColor, -0.08);
  const doorColor     = varyColorBrightness(baseColor, -0.22);
  const doorFrameColor = varyColorBrightness(baseColor, -0.16);

  const radii = getCornerRadii(lookup, cell);

  // ── Porte au rez-de-chaussée ──────────────────────────────────────────────
  // La porte et les fenêtres apparaissent uniquement au niveau du sol (y === 0).
  // Au-dessus, on n'a que des fenêtres, jamais de porte.
  const isGroundFloor = cell.y === 0;
  const doorFaceHash  = Math.abs(cell.x * 31 + cell.z * 17) % Math.max(exposedFaces.length, 1);
  const doorFace      = isGroundFloor && exposedFaces.length > 0 ? exposedFaces[doorFaceHash] : null;

  const rotMap: Record<string, number> = {
    front:  0,
    back:   Math.PI,
    left:  -Math.PI / 2,
    right:  Math.PI / 2,
  };

  // ── Helpers – déclarés AVANT tout return conditionnel ────────────────────

  const renderQuoins = () => {
    // Vérifier si le propertyBundle existe et si nous devons supprimer les quoins
    if (cell.propertyBundle) {
      const { mergeFlags } = cell.propertyBundle;

      // Si tous les quoins sont supprimés, ne rien rendre
      if (mergeFlags.suppressQuoin.backLeft && mergeFlags.suppressQuoin.backRight &&
          mergeFlags.suppressQuoin.frontLeft && mergeFlags.suppressQuoin.frontRight) {
        return null;
      }
    }

    const corners = [
      { dx: -1, dz: -1, cornerName: 'backLeft' as const },
      { dx:  1, dz: -1, cornerName: 'frontRight' as const },
      { dx: -1, dz:  1, cornerName: 'frontLeft' as const },
      { dx:  1, dz:  1, cornerName: 'backRight' as const },
    ];
    return corners.map(({ dx, dz, cornerName }, i) => {
      // Vérifier si ce quoin spécifique est supprimé
      if (cell.propertyBundle?.mergeFlags.suppressQuoin[cornerName]) {
        return null;
      }

      const adj1 = hasOccupiedCell(lookup, cell.x + dx, cell.y, cell.z);
      const adj2 = hasOccupiedCell(lookup, cell.x, cell.y, cell.z + dz);
      const diag = hasOccupiedCell(lookup, cell.x + dx, cell.y, cell.z + dz);
      if (adj1 && adj2 && diag) return null;

      const w1_x = 0.16, w1_z = 0.08;
      const w2_x = 0.08, w2_z = 0.16;
      const posX1 = dx * (0.5 - w1_x / 2), posZ1 = dz * (0.5 - w1_z / 2);
      const posX2 = dx * (0.5 - w2_x / 2), posZ2 = dz * (0.5 - w2_z / 2);

      return (
        <group key={`quoin-${i}`}>
          <mesh name="quoinL0" position={[posX1, -0.32, posZ1]} castShadow receiveShadow>
            <RoundedBox args={[w1_x, 0.18, w1_z]} radius={0.01} smoothness={2}>
              <meshStandardMaterial color={quoinColor} roughness={0.9} />
            </RoundedBox>
          </mesh>
          <mesh name="quoinL1" position={[posX2, 0.0, posZ2]} castShadow receiveShadow>
            <RoundedBox args={[w2_x, 0.18, w2_z]} radius={0.01} smoothness={2}>
              <meshStandardMaterial color={quoinColor} roughness={0.9} />
            </RoundedBox>
          </mesh>
          <mesh name="quoinL2" position={[posX1, 0.32, posZ1]} castShadow receiveShadow>
            <RoundedBox args={[w1_x, 0.18, w1_z]} radius={0.01} smoothness={2}>
              <meshStandardMaterial color={quoinColor} roughness={0.9} />
            </RoundedBox>
          </mesh>
        </group>
      );
    });
  };

  const renderStonePatches = () => {
    if (exposedFaces.length === 0) return null;

    // Vérifier si le style décoratif permet les pierres apparentes
    // Seule le style STONE devrait avoir des pierres apparentes
    const hasStoneStyle = cell.propertyBundle?.decorationStyle === 'STONE';
    if (!hasStoneStyle) return null;

    // Pour le style STONE, toujours afficher les pierres décoratives
    // Utiliser un hachage déterministe pour la position mais toujours afficher
    const hash1 = Math.abs(cell.x * 23 + cell.y * 37 + cell.z * 13) % 100;
    const hash2 = Math.abs(cell.x * 61 + cell.y * 29 + cell.z * 43) % 100;

    const face    = exposedFaces[hash2 % exposedFaces.length];
    const offsetX = ((hash1 % 10) / 10 - 0.5) * 0.4;
    const offsetY = (((hash1 / 10) % 10) / 10 - 0.5) * 0.4;
    const w = 0.18 + (hash2 % 4) * 0.03;
    const h = 0.12 + ((hash2 / 4) % 3) * 0.02;

    let pos: [number, number, number] = [0, 0, 0];
    let rot: [number, number, number] = [0, 0, 0];
    switch (face) {
      case 'front': pos = [offsetX, offsetY,  0.503]; break;
      case 'back':  pos = [offsetX, offsetY, -0.503]; rot = [0, Math.PI, 0]; break;
      case 'left':  pos = [-0.503, offsetY, offsetX]; rot = [0,  Math.PI / 2, 0]; break;
      case 'right': pos = [ 0.503, offsetY, offsetX]; rot = [0, -Math.PI / 2, 0]; break;
    }
    return (
      <mesh name="stonePatch" position={pos} rotation={rot} castShadow receiveShadow>
        <RoundedBox args={[w, h, 0.01]} radius={0.005} smoothness={2}>
          <meshStandardMaterial color={patchColor} roughness={0.95} />
        </RoundedBox>
      </mesh>
    );
  };

  const renderBaseTrim = () => {
    // Vérifier si nous devons supprimer toutes les plinthes
    if (cell.propertyBundle) {
      const { mergeFlags } = cell.propertyBundle;
      if (mergeFlags.suppressBaseTrim.front && mergeFlags.suppressBaseTrim.back &&
          mergeFlags.suppressBaseTrim.left && mergeFlags.suppressBaseTrim.right) {
        return null;
      }
    }

    return exposedFaces.map((face, index) => {
      // Vérifier si cette face spécifique est supprimée
      if (cell.propertyBundle?.mergeFlags.suppressBaseTrim[face]) {
        return null;
      }

      let pos: [number, number, number] = [0, -0.46, 0];
      let rot: [number, number, number] = [0, 0, 0];
      switch (face) {
        case 'front': pos = [0, -0.46,  0.505]; break;
        case 'back':  pos = [0, -0.46, -0.505]; rot = [0, Math.PI, 0]; break;
        case 'left':  pos = [-0.505, -0.46, 0]; rot = [0,  Math.PI / 2, 0]; break;
        case 'right': pos = [ 0.505, -0.46, 0]; rot = [0, -Math.PI / 2, 0]; break;
      }
      return (
        <mesh key={`trim-${index}`} name="baseTrim" position={pos} rotation={rot} castShadow receiveShadow>
          <RoundedBox args={[1.02, 0.08, 0.02]} radius={0.01} smoothness={2}>
            <meshStandardMaterial color={trimColor} roughness={0.9} />
          </RoundedBox>
        </mesh>
      );
    });
  };

  // ── Porte ────────────────────────────────────────────────────────────────
  const createDoor = (rotation: number, key: string) => {
    const variant = Math.abs(cell.x * 7 + cell.z * 13) % 2;

    // Sur cylindre : porte plus étroite, sans radius sur le panneau, à la surface frontale
    const frameW  = isIsolated ? 0.36 : 0.54;
    const panelW  = isIsolated ? 0.28 : 0.44;
    const plankW  = isIsolated ? 0.24 : 0.40;
    const threshW = isIsolated ? 0.40 : 0.58;
    // Radius du panneau : toujours plat pour éviter tout débordement
    const panelR  = 0.012;
    const panelH  = variant === 1 ? 0.70 : 0.76;
    // Z fixe à la surface du mur + légère épaisseur
    const Z = 0.502;

    return (
      <group name="door" rotation={[0, rotation, 0]} key={key}>
        {/* Encadrement */}
        <mesh name="doorFrame" position={[0, -0.06, Z + 0.015]} castShadow receiveShadow>
          <RoundedBox args={[frameW, 0.88, 0.03]} radius={0.012} smoothness={4}>
            <meshStandardMaterial color={doorFrameColor} roughness={0.88} />
          </RoundedBox>
        </mesh>
        {/* Panneau */}
        <mesh name="doorPanel" position={[0, -0.10, Z]} castShadow receiveShadow>
          <RoundedBox args={[panelW, panelH, 0.04]} radius={panelR} smoothness={6}>
            <meshStandardMaterial color={doorColor} roughness={0.92} />
          </RoundedBox>
        </mesh>
        {/* Planches */}
        {[-0.28, -0.06, 0.16].map((yOff, i) => (
          <mesh key={`plank-${i}`} position={[0, -0.10 + yOff, Z + 0.022]} castShadow>
            <boxGeometry args={[plankW, 0.03, 0.005]} />
            <meshStandardMaterial color={varyColorBrightness(doorColor, -0.08)} roughness={0.95} />
          </mesh>
        ))}
        {/* Poignée */}
        <mesh name="doorHandle" position={[panelW * 0.3, -0.14, Z + 0.022]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.05, 8]} />
          <meshStandardMaterial color="#8a6a3a" metalness={0.55} roughness={0.35} />
        </mesh>
        <mesh name="doorHandleRosette" position={[panelW * 0.3, -0.14, Z + 0.024]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.006, 10]} />
          <meshStandardMaterial color="#7a5a2a" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Seuil */}
        <mesh name="doorThreshold" position={[0, -0.49, Z + 0.010]} castShadow receiveShadow>
          <RoundedBox args={[threshW, 0.04, 0.03]} radius={0.008} smoothness={4}>
            <meshStandardMaterial color={varyColorBrightness(baseColor, -0.18)} roughness={0.94} />
          </RoundedBox>
        </mesh>
      </group>
    );
  };

  // ── Meurtrière (tour isolée) ──────────────────────────────────────────────
  const createArrowSlit = (rotation: number, faceId: number) => (
    <group name="arrowSlit" rotation={[0, rotation, 0]} key={`arrowslit-${faceId}`}>
      <mesh name="arrowSlitOuter" position={[0, 0.1, 0.505]} castShadow receiveShadow>
        <RoundedBox args={[0.18, 0.55, 0.02]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
        </RoundedBox>
      </mesh>
      <mesh name="arrowSlitInner" position={[0, 0.1, 0.48]} castShadow receiveShadow>
        <RoundedBox args={[0.08, 0.48, 0.05]} radius={0.01} smoothness={4}>
          <meshStandardMaterial color="#0a0a0a" roughness={0.98} />
        </RoundedBox>
      </mesh>
      <mesh name="arrowSlitBorder" position={[0, 0.1, 0.51]} castShadow>
        <RoundedBox args={[0.22, 0.59, 0.01]} radius={0.03} smoothness={4}>
          <meshStandardMaterial color="#5a4a3a" roughness={0.88} />
        </RoundedBox>
      </mesh>
      <mesh name="arrowSlitLower" position={[0, -0.28, 0.505]} castShadow receiveShadow>
        <RoundedBox args={[0.12, 0.18, 0.02]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
        </RoundedBox>
      </mesh>
      <mesh name="arrowSlitLowerInner" position={[0, -0.28, 0.48]} castShadow receiveShadow>
        <RoundedBox args={[0.06, 0.12, 0.05]} radius={0.01} smoothness={4}>
          <meshStandardMaterial color="#0a0a0a" roughness={0.98} />
        </RoundedBox>
      </mesh>
    </group>
  );

  // ── Fenêtre ───────────────────────────────────────────────────────────────
  const createWindow = (rotation: number, faceId: number) => {
    const variant = (windowVariant + faceId) % 3;
    return (
      <group name="window" rotation={[0, rotation, 0]} key={`window-${faceId}`}>
        {variant === 0 && (
          <>
            <mesh name="largeWindowOuter" position={[0, 0.08, 0.505]} castShadow receiveShadow>
              <RoundedBox args={[0.72, 0.68, 0.02]} radius={0.03} smoothness={4}>
                <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
              </RoundedBox>
            </mesh>
            <mesh name="largeWindowInner" position={[0, 0.08, 0.495]} castShadow receiveShadow>
              <RoundedBox args={[0.64, 0.6, 0.01]} radius={0.02} smoothness={4}>
                <meshStandardMaterial color="#2a3a4a" roughness={0.1} metalness={0.15} transparent opacity={0.85} />
              </RoundedBox>
            </mesh>
            <mesh position={[0, 0.08, 0.51]} castShadow>
              <boxGeometry args={[0.68, 0.04, 0.01]} />
              <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
            </mesh>
            <mesh position={[0, 0.08, 0.51]} castShadow>
              <boxGeometry args={[0.04, 0.64, 0.01]} />
              <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
            </mesh>
            <mesh name="largeWindowLower" position={[0, -0.28, 0.52]} castShadow receiveShadow>
              <RoundedBox args={[0.78, 0.06, 0.08]} radius={0.02} smoothness={4}>
                <meshStandardMaterial color="#6a5a4a" roughness={0.82} />
              </RoundedBox>
            </mesh>
          </>
        )}
        {variant === 1 && (
          <>
            {([-0.22, 0.22] as number[]).map((ox, i) => (
              <group key={`sw-${i}`}>
                <mesh position={[ox, 0.08, 0.505]} castShadow receiveShadow>
                  <RoundedBox args={[0.32, 0.56, 0.02]} radius={0.03} smoothness={4}>
                    <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
                  </RoundedBox>
                </mesh>
                <mesh position={[ox, 0.08, 0.495]} castShadow receiveShadow>
                  <RoundedBox args={[0.26, 0.48, 0.01]} radius={0.02} smoothness={4}>
                    <meshStandardMaterial color="#2a3a4a" roughness={0.1} metalness={0.15} transparent opacity={0.85} />
                  </RoundedBox>
                </mesh>
                <mesh position={[ox, 0.08, 0.51]} castShadow>
                  <boxGeometry args={[0.03, 0.52, 0.01]} />
                  <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, -0.22, 0.52]} castShadow receiveShadow>
              <RoundedBox args={[0.78, 0.06, 0.08]} radius={0.02} smoothness={4}>
                <meshStandardMaterial color="#6a5a4a" roughness={0.82} />
              </RoundedBox>
            </mesh>
          </>
        )}
        {variant === 2 && (
          <>
            <mesh position={[0, 0.08, 0.505]} castShadow receiveShadow>
              <RoundedBox args={[0.58, 0.64, 0.02]} radius={0.03} smoothness={4}>
                <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
              </RoundedBox>
            </mesh>
            <mesh position={[0, 0.08, 0.495]} castShadow receiveShadow>
              <RoundedBox args={[0.5, 0.56, 0.01]} radius={0.02} smoothness={4}>
                <meshStandardMaterial color="#2a3a4a" roughness={0.1} metalness={0.15} transparent opacity={0.85} />
              </RoundedBox>
            </mesh>
            <mesh position={[0, 0.08, 0.51]} castShadow>
              <boxGeometry args={[0.54, 0.03, 0.01]} />
              <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
            </mesh>
            <mesh position={[0, 0.08, 0.51]} castShadow>
              <boxGeometry args={[0.03, 0.6, 0.01]} />
              <meshStandardMaterial color="#4a3a2a" roughness={0.88} />
            </mesh>
            {([-0.38, 0.38] as number[]).map((ox, i) => (
              <group key={`sh-${i}`}>
                <mesh position={[ox, 0.08, 0.505]} rotation={[0, ox < 0 ? -0.15 : 0.15, 0]} castShadow receiveShadow>
                  <RoundedBox args={[0.16, 0.64, 0.03]} radius={0.02} smoothness={4}>
                    <meshStandardMaterial color="#7a5a4a" roughness={0.9} />
                  </RoundedBox>
                </mesh>
                {[0.2, 0.08, -0.04, -0.16].map((yOff, j) => (
                  <mesh key={j} position={[ox, 0.08 + yOff, 0.51]} rotation={[0, ox < 0 ? -0.15 : 0.15, 0]} castShadow>
                    <boxGeometry args={[0.14, 0.02, 0.01]} />
                    <meshStandardMaterial color="#6a4a3a" roughness={0.92} />
                  </mesh>
                ))}
              </group>
            ))}
            <mesh position={[0, -0.26, 0.52]} castShadow receiveShadow>
              <RoundedBox args={[0.7, 0.06, 0.08]} radius={0.02} smoothness={4}>
                <meshStandardMaterial color="#6a5a4a" roughness={0.82} />
              </RoundedBox>
            </mesh>
          </>
        )}
      </group>
    );
  };

  // ── Helper : rendu d'une face (porte ou fenêtre/meurtrière) ──────────────
  const renderFace = (face: string, index: number, towerMode: boolean) => {
    if (face === doorFace) {
      return createDoor(rotMap[face], `door-${index}`);
    }
    const rot = rotMap[face];
    if (towerMode) return createArrowSlit(rot, index);
    return createWindow(rot, index);
  };

  // ── RENDU TOUR ISOLÉE ────────────────────────────────────────────────────
  if (isIsolated) {
    return (
      <group name="wallWithWindowCell" position={position}>
        <ShapedBox args={[1.0, 1.0, 1.0]} radii={radii} isIsolated={true}
          color={cell.color ?? '#d0baa0'} roughness={0.94} castShadow receiveShadow />

        <mesh name="decorativeBandTop" position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.52, 0.52, 0.05, 12]} />
          <meshStandardMaterial color="#9a8a70" roughness={0.9} />
        </mesh>
        <mesh name="decorativeBandBottom" position={[0, -0.35, 0]} castShadow>
          <cylinderGeometry args={[0.52, 0.52, 0.05, 12]} />
          <meshStandardMaterial color="#9a8a70" roughness={0.9} />
        </mesh>

        {exposedFaces.map((face, index) => renderFace(face, index, true))}
      </group>
    );
  }

  // ── RENDU MUR STANDARD ───────────────────────────────────────────────────
  return (
    <group name="wallWithWindowCell" position={position}>
      <ShapedBox args={[1.0, 1.0, 1.0]} radii={radii} isIsolated={false}
        color={cell.color ?? '#e0c996'} roughness={0.94} castShadow receiveShadow />

      {renderQuoins()}
      {renderStonePatches()}
      {renderBaseTrim()}

      {exposedFaces.map((face, index) => renderFace(face, index, false))}
    </group>
  );
}
