/**
 * CellShell – squelette commun aux cellules "murs" (StandardCell, WallWithWindowCell).
 *
 * Regroupe le corps principal (ShapedBox, piloté par `radii`) et les quoins
 * (pierres d'angle), identiques dans les deux composants. Tout le reste
 * (pierres apparentes, fenêtres/portes, plinthes, zones protégées...) reste
 * la responsabilité de l'appelant via `children` : cette logique est
 * intentionnellement spécifique à chaque type de cellule (voir AGENTS.md).
 */

import type { ReactNode } from 'react';
import type { GridCell } from '../../types';
import type { CellLookup, CornerRadii } from '../../utils/cellUtils';
import { ShapedBox } from '../ShapedBox';
import { renderQuoins } from '../../utils/cornerDecorations';

interface CellShellProps {
  name: string;
  cell: GridCell;
  position: [number, number, number];
  lookup: CellLookup;
  isIsolated: boolean;
  baseColor: string;
  radii: CornerRadii;
  roughness?: number;
  children?: ReactNode;
}

export function CellShell({
  name,
  cell,
  position,
  lookup,
  isIsolated,
  baseColor,
  radii,
  roughness = 0.94,
  children,
}: CellShellProps) {
  return (
    <group name={name} position={position}>
      {/* Corps principal : forme pilotée par radii */}
      <ShapedBox
        args={[1.0, 1.0, 1.0]}
        radii={radii}
        isIsolated={isIsolated}
        color={baseColor}
        roughness={roughness}
        castShadow
        receiveShadow
      />

      {/* Pierres d'angle : communes aux deux cell types */}
      {renderQuoins({ cell, lookup, isIsolated, baseColor, radii })}

      {children}
    </group>
  );
}
