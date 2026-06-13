import type { GridCell } from '../types';
import type { CellLookup } from '../utils/cellUtils';
import { isIsolatedBlock } from '../utils/cellUtils';
import { RoofCell } from './cells/RoofCell';
import { ArchCell } from './cells/ArchCell';
import { WallWithWindowCell } from './cells/WallWithWindowCell';
import { StandardCell } from './cells/StandardCell';

interface CellMeshProps {
  cell: GridCell;
  toWorldPosition: (x: number, y: number, z: number) => [number, number, number];
  lookup: CellLookup;
}

export function CellMesh({ cell, toWorldPosition, lookup }: CellMeshProps) {
  const position = toWorldPosition(cell.x, cell.y, cell.z);
  const isIsolated = isIsolatedBlock(lookup, cell);

  if (cell.type === 'ROOF') {
    return <RoofCell cell={cell} position={position} lookup={lookup} isIsolated={isIsolated} />;
  }

  if (cell.type === 'ARCH') {
    return <ArchCell cell={cell} position={position} lookup={lookup} />;
  }

  if (cell.type === 'WALL_WINDOW') {
    return <WallWithWindowCell cell={cell} position={position} lookup={lookup} isIsolated={isIsolated} />;
  }

  return <StandardCell cell={cell} position={position} isIsolated={isIsolated} />;
}
