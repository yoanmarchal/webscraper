/**
 * ShapedBox – corps principal d'une cellule avec héritage de forme.
 *
 * Chaque arête verticale est arrondie ou carrée selon les radii fournis.
 * Les coins exposés (sans voisin) ont un grand radius (tour arrondie),
 * les coins joints ont un radius nul (angle droit).
 *
 * Implémentation :
 *   On assemble la section 2D (plan XZ) comme un polygone convexe :
 *   – Pour chaque coin libre  : arc de cercle de radius R (quart de disque)
 *   – Pour chaque coin joint  : angle droit (vertex unique au coin exact)
 *   Puis on extrude ce polygone sur l'axe Y avec THREE.ExtrudeGeometry.
 *   Les faces sont parfaitement plates — aucun bombement.
 */

import * as THREE from 'three';
import { useMemo } from 'react';
import type { CornerRadii } from '../utils/cellUtils';
import { getRoundedRectContourPoints } from '../utils/cellUtils';

// Nombre de segments par arc de coin arrondi (10 pour un rendu lisse sur les grands radii)
const ARC_SEGS = 10;

interface ShapedBoxProps {
  args?: [number, number, number];
  radii: CornerRadii;
  isIsolated: boolean;
  color: string;
  roughness?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  materialProps?: Record<string, unknown>;
}

/**
 * Construit la section 2D (plan XZ) pour ExtrudeGeometry à partir du
 * contour partagé (`getRoundedRectContourPoints`), utilisé aussi par
 * RoofCell pour que la flèche/le parapet épousent le même contour.
 * Le plan Three.js pour l'extrusion est XY, donc on mappe :  X→X, Z→Y.
 * Le résultat est un Shape centré sur l'origine.
 */
function buildSection(
  hw: number,  // demi-largeur  (X)
  hd: number,  // demi-profondeur (Z → Y dans le plan Shape)
  radii: CornerRadii,
): THREE.Shape {
  const points = getRoundedRectContourPoints(hw, hd, radii, ARC_SEGS);

  const shape = new THREE.Shape();
  points.forEach(([px, py], i) => {
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  });

  shape.closePath();
  return shape;
}

export function ShapedBox({
  args = [1, 1, 1],
  radii,
  isIsolated: _isIsolated, // conservé pour compatibilité d'interface, non utilisé
  color,
  roughness = 0.92,
  castShadow = true,
  receiveShadow = true,
  materialProps = {},
}: ShapedBoxProps) {
  const [w, h, d] = args;

  // ── Toujours extrusion de section polygonale avec radii par coin ──────────
  return (
    <ExtrudedBlock
      w={w} h={h} d={d}
      radii={radii}
      color={color}
      roughness={roughness}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      materialProps={materialProps}
    />
  );
}

interface ExtrudedBlockProps {
  w: number; h: number; d: number;
  radii: CornerRadii;
  color: string;
  roughness: number;
  castShadow: boolean;
  receiveShadow: boolean;
  materialProps: Record<string, unknown>;
}

function ExtrudedBlock({ w, h, d, radii, color, roughness, castShadow, receiveShadow, materialProps }: ExtrudedBlockProps) {
  const geometry = useMemo(() => {
    const hw = w / 2;
    const hd = d / 2;
  const shape = buildSection(hw, hd, radii);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: h,
      bevelEnabled: false,
    });

    // ExtrudeGeometry extrude sur Z dans le plan Shape (ici notre Y).
    // On veut que la hauteur soit sur l'axe Y de la scène.
    // Shape est dans le plan XY de Three.js → extrusion sur Z local.
    // On applique une rotation pour ramener ça correctement :
    //   plan shape XY → scène XZ, extrusion Z → scène Y
    geo.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    // Recentrer verticalement
    geo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, -h / 2, 0));

    geo.computeVertexNormals();
    return geo;
  }, [w, h, d, radii]);

  return (
    <mesh name="shapedBox" geometry={geometry} castShadow={castShadow} receiveShadow={receiveShadow}>
      <meshStandardMaterial color={color} roughness={roughness} {...materialProps} />
    </mesh>
  );
}
