/**
 * ShapedBox – corps principal d'une cellule avec héritage de forme.
 *
 * ISOLÉ   → cylindre plein (section circulaire, vraie tour ronde)
 * GROUPÉ  → boîte à faces PLATES dont chaque arête verticale est arrondie
 *            ou carrée selon qu'elle est exposée ou jointe à un voisin.
 *
 * Implémentation du cas groupé :
 *   On assemble la section 2D (plan XZ) comme un polygone convexe :
 *   – Pour chaque coin libre  : arc de cercle de radius R (quart de disque)
 *   – Pour chaque coin joint  : angle droit (vertex unique au coin exact)
 *   Puis on extrude ce polygone sur l'axe Y avec THREE.ExtrudeGeometry.
 *   Les faces sont parfaitement plates — aucun bombement.
 */

import * as THREE from 'three';
import { useMemo } from 'react';
import type { CornerRadii } from '../utils/cellUtils';

// Radius utilisé pour les coins libres dans le cas groupé
const EDGE_R = 0.15;
// Nombre de segments par arc de coin arrondi
const ARC_SEGS = 6;

interface ShapedBoxProps {
  args?: [number, number, number];
  radii: CornerRadii;
  isIsolated: boolean;
  color: string;
  roughness?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  materialProps?: Record<string, unknown>;
  edgeRadius?: number; // Radius personnalisé pour les arrondis des coins
}

/**
 * Construit la section 2D (plan XZ) pour ExtrudeGeometry.
 * Le plan Three.js pour l'extrusion est XY, donc on mappe :  X→X, Z→Y.
 * Le résultat est un Shape centré sur l'origine.
 */
function buildSection(
  hw: number,  // demi-largeur  (X)
  hd: number,  // demi-profondeur (Z → Y dans le plan Shape)
  radii: CornerRadii,
  edgeRadius: number = EDGE_R,
): THREE.Shape {
  // Coins dans l'ordre anti-horaire (vue du dessus, Y positif vers haut de l'écran)
  // (−X,−Z) → (+X,−Z) → (+X,+Z) → (−X,+Z)
  const corners: Array<{
    cx: number;   // centre du coin en X
    cy: number;   // centre du coin en Z (→Y dans shape)
    r: number;    // radius demandé
    startAngle: number;  // angle de départ de l'arc (rad)
  }> = [
    { cx: -hw + edgeRadius, cy: -hd + edgeRadius, r: radii.backLeft,   startAngle: Math.PI },
    { cx:  hw - edgeRadius, cy: -hd + edgeRadius, r: radii.backRight,  startAngle: Math.PI * 1.5 },
    { cx:  hw - edgeRadius, cy:  hd - edgeRadius, r: radii.frontRight, startAngle: 0 },
    { cx: -hw + edgeRadius, cy:  hd - edgeRadius, r: radii.frontLeft,  startAngle: Math.PI * 0.5 },
  ];

  const shape = new THREE.Shape();
  let first = true;

  for (const c of corners) {
    const isRound = c.r > 0.01;

    if (isRound) {
      // Arc de quart de cercle
      const pts = arcPoints(c.cx, c.cy, edgeRadius, c.startAngle, c.startAngle + Math.PI / 2, ARC_SEGS);
      for (const [px, py] of pts) {
        if (first) { shape.moveTo(px, py); first = false; }
        else        { shape.lineTo(px, py); }
      }
    } else {
      // Angle droit : on va directement au coin exact
      const cornerX = c.cx + Math.cos(c.startAngle + Math.PI / 4) * edgeRadius * Math.SQRT2;
      const cornerY = c.cy + Math.sin(c.startAngle + Math.PI / 4) * edgeRadius * Math.SQRT2;
      if (first) { shape.moveTo(cornerX, cornerY); first = false; }
      else        { shape.lineTo(cornerX, cornerY); }
    }
  }

  shape.closePath();
  return shape;
}

/** Points d'un arc (anti-horaire) */
function arcPoints(
  cx: number, cy: number, r: number,
  startAngle: number, endAngle: number,
  segs: number,
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= segs; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / segs);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

export function ShapedBox({
  args = [1, 1, 1],
  radii,
  isIsolated,
  color,
  roughness = 0.92,
  castShadow = true,
  receiveShadow = true,
  materialProps = {},
  edgeRadius = EDGE_R,
}: ShapedBoxProps) {
  const [w, h, d] = args;
  const mat = <meshStandardMaterial color={color} roughness={roughness} {...materialProps} />;

  // ── CAS ISOLÉ : cylindre circulaire ──────────────────────────────────────
  if (isIsolated) {
    const r = w / 2;
    return (
      <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
        <cylinderGeometry args={[r, r, h, 24]} />
        {mat}
      </mesh>
    );
  }

  // ── CAS GROUPÉ : extrusion de section polygonale ──────────────────────────
  return (
    <ExtrudedBlock
      w={w} h={h} d={d}
      radii={radii}
      color={color}
      roughness={roughness}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      materialProps={materialProps}
      edgeRadius={edgeRadius}
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
  edgeRadius: number;
}

function ExtrudedBlock({ w, h, d, radii, color, roughness, castShadow, receiveShadow, materialProps, edgeRadius }: ExtrudedBlockProps) {
  const geometry = useMemo(() => {
    const hw = w / 2;
    const hd = d / 2;
  const shape = buildSection(hw, hd, radii, edgeRadius);

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
  }, [w, h, d, radii, edgeRadius]);

  return (
    <mesh geometry={geometry} castShadow={castShadow} receiveShadow={receiveShadow}>
      <meshStandardMaterial color={color} roughness={roughness} {...materialProps} />
    </mesh>
  );
}
