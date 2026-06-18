export enum BlockType {
  Empty = 'EMPTY',
  Foundation = 'FOUNDATION',
  Wall = 'WALL',
  WallWithWindow = 'WALL_WINDOW',
  Roof = 'ROOF',
  Arch = 'ARCH',
}

export enum DecorationStyle {
  Standard = 'STANDARD',
}

export type Corner = 'backLeft' | 'backRight' | 'frontLeft' | 'frontRight';
export type Face = 'front' | 'back' | 'left' | 'right';

export interface MergeFlags {
  mergeWithNeighbors: boolean;
}

export interface PropertyBundle {
  color: string;
  decorationStyle: DecorationStyle;
  mergeFlags: MergeFlags;
}

export interface GridCell {
  x: number;
  y: number;
  z: number;
  isOccupied: boolean;
  type: BlockType;
  color?: string;
  placementOrder: number;
  propertyBundle?: PropertyBundle;
}

export interface CellCoordinate {
  x: number;
  y: number;
  z: number;
}
