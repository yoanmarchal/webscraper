export enum BlockType {
  Empty = 'EMPTY',
  Foundation = 'FOUNDATION',
  Wall = 'WALL',
  WallWithWindow = 'WALL_WINDOW',
  Roof = 'ROOF',
  Arch = 'ARCH',
}

export interface GridCell {
  x: number;
  y: number;
  z: number;
  isOccupied: boolean;
  type: BlockType;
  color?: string;
}

export interface CellCoordinate {
  x: number;
  y: number;
  z: number;
}