import { BlockType, type CellCoordinate, type GridCell } from './types';
import { type ColorPalette, getBuildingId, getPaletteByIndex, randomColorVariation } from './colorPalettes';

export class VillageGrid {
  private readonly sizeX: number;
  private readonly sizeY: number;
  private readonly sizeZ: number;
  private readonly grid: GridCell[][][];
  private readonly buildingPalettes: Map<number, ColorPalette> = new Map();

  constructor(sizeX: number, sizeY: number, sizeZ: number) {
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.sizeZ = sizeZ;
    this.grid = this.createEmptyGrid();
  }

  public addBlock(x: number, y: number, z: number): void {
    if (!this.isValidCoordinate(x, y, z)) {
      return;
    }

    this.grid[x][y][z].isOccupied = true;
    this.recomputeProceduralLogic();
  }

  public addBlockInColumn(x: number, z: number, minimumY = 0): number | null {
    if (!this.isValidCoordinate(x, minimumY, z)) {
      return null;
    }

    let targetY = minimumY;

    for (let y = minimumY; y < this.sizeY; y += 1) {
      if (!this.grid[x][y][z].isOccupied) {
        targetY = y;
        break;
      }

      targetY = y + 1;
    }

    if (!this.isValidCoordinate(x, targetY, z)) {
      return null;
    }

    this.grid[x][targetY][z].isOccupied = true;
    this.recomputeProceduralLogic();
    return targetY;
  }

  public removeBlock(x: number, y: number, z: number): void {
    if (!this.isValidCoordinate(x, y, z)) {
      return;
    }

    this.grid[x][y][z].isOccupied = false;
    this.grid[x][y][z].type = BlockType.Empty;
    this.grid[x][y][z].color = undefined;
    this.recomputeProceduralLogic();
  }

  public removeTopBlockInColumn(x: number, z: number): number | null {
    if (!this.isValidCoordinate(x, 0, z)) {
      return null;
    }

    for (let y = this.sizeY - 1; y >= 0; y -= 1) {
      const cell = this.grid[x][y][z];
      if (!cell.isOccupied) {
        continue;
      }

      this.removeBlock(x, y, z);
      return y;
    }

    return null;
  }

  public getTopOccupiedY(x: number, z: number): number | null {
    if (!this.isValidCoordinate(x, 0, z)) {
      return null;
    }

    for (let y = this.sizeY - 1; y >= 0; y -= 1) {
      if (this.grid[x][y][z].isOccupied) {
        return y;
      }
    }

    return null;
  }

  public getNextPlacementY(x: number, z: number, minimumY = 0): number | null {
    if (!this.isValidCoordinate(x, minimumY, z)) {
      return null;
    }

    const topY = this.getTopOccupiedY(x, z);
    const targetY = topY === null ? minimumY : topY + 1;

    if (!this.isValidCoordinate(x, targetY, z)) {
      return null;
    }

    return targetY;
  }

  public clear(): void {
    for (let x = 0; x < this.sizeX; x += 1) {
      for (let y = 0; y < this.sizeY; y += 1) {
        for (let z = 0; z < this.sizeZ; z += 1) {
          this.grid[x][y][z].isOccupied = false;
          this.grid[x][y][z].type = BlockType.Empty;
          this.grid[x][y][z].color = undefined;
        }
      }
    }
  }

  public getGrid(): GridCell[][][] {
    return this.grid;
  }

  public getCell({ x, y, z }: CellCoordinate): GridCell | null {
    if (!this.isValidCoordinate(x, y, z)) {
      return null;
    }

    return this.grid[x][y][z];
  }

  public getOccupiedCells(): GridCell[] {
    const cells: GridCell[] = [];

    for (let x = 0; x < this.sizeX; x += 1) {
      for (let y = 0; y < this.sizeY; y += 1) {
        for (let z = 0; z < this.sizeZ; z += 1) {
          const cell = this.grid[x][y][z];
          if (cell.isOccupied) {
            cells.push(cell);
          }
        }
      }
    }

    return cells;
  }

  public getTypeCounts(): Record<BlockType, number> {
    const counts: Record<BlockType, number> = {
      [BlockType.Empty]: 0,
      [BlockType.Foundation]: 0,
      [BlockType.Wall]: 0,
      [BlockType.WallWithWindow]: 0,
      [BlockType.Roof]: 0,
      [BlockType.Arch]: 0,
    };

    for (const cell of this.getOccupiedCells()) {
      counts[cell.type] += 1;
    }

    return counts;
  }

  public toWorldPosition(x: number, y: number, z: number): [number, number, number] {
    return [x - this.sizeX / 2 + 0.5, y + 0.5, z - this.sizeZ / 2 + 0.5];
  }

  public fromWorldPosition(worldX: number, worldZ: number): { x: number; z: number } {
    return {
      x: Math.floor(worldX + this.sizeX / 2),
      z: Math.floor(worldZ + this.sizeZ / 2),
    };
  }

  private createEmptyGrid(): GridCell[][][] {
    const grid: GridCell[][][] = [];

    for (let x = 0; x < this.sizeX; x += 1) {
      grid[x] = [];
      for (let y = 0; y < this.sizeY; y += 1) {
        grid[x][y] = [];
        for (let z = 0; z < this.sizeZ; z += 1) {
          grid[x][y][z] = { x, y, z, isOccupied: false, type: BlockType.Empty };
        }
      }
    }

    return grid;
  }

  private recomputeProceduralLogic(): void {
    for (let x = 0; x < this.sizeX; x += 1) {
      for (let y = 0; y < this.sizeY; y += 1) {
        for (let z = 0; z < this.sizeZ; z += 1) {
          const cell = this.grid[x][y][z];

          if (!cell.isOccupied) {
            cell.type = BlockType.Empty;
            cell.color = undefined;
            continue;
          }

          const cellBelow = this.getNeighborCell(x, y - 1, z);
          const cellAbove = this.getNeighborCell(x, y + 1, z);
          const cellLeft = this.getNeighborCell(x - 1, y, z);
          const cellRight = this.getNeighborCell(x + 1, y, z);
          const cellFront = this.getNeighborCell(x, y, z - 1);
          const cellBack = this.getNeighborCell(x, y, z + 1);

          const horizontalNeighbors = [cellLeft, cellRight, cellFront, cellBack].filter(
            (neighbor): neighbor is GridCell => neighbor !== null && neighbor.isOccupied,
          );

          const horizontalNeighborCount = horizontalNeighbors.length;

          const oppositePairs = [
            cellLeft?.isOccupied && cellRight?.isOccupied ? 1 : 0,
            cellFront?.isOccupied && cellBack?.isOccupied ? 1 : 0,
          ].reduce((sum, value) => sum + value, 0);

          const isTopMost = !cellAbove?.isOccupied;
          const hasSupportBelow = cellBelow?.isOccupied ?? false;

          if (y === 0) {
            cell.type = BlockType.Foundation;
          } else if (hasSupportBelow && isTopMost && horizontalNeighbors.length === 2 && oppositePairs === 1) {
            cell.type = BlockType.Arch;
          } else if (isTopMost && hasSupportBelow && horizontalNeighbors.length === 0) {
            cell.type = BlockType.Roof;
          } else if (
            isTopMost &&
            hasSupportBelow &&
            horizontalNeighborCount >= 1 &&
            horizontalNeighborCount <= 2 &&
            oppositePairs === 0
          ) {
            cell.type = BlockType.WallWithWindow;
          } else if (hasSupportBelow) {
            cell.type = BlockType.Wall;
          } else {
            cell.type = BlockType.Wall;
          }

          cell.color = this.getColorForCell(cell);
        }
      }
    }
  }

  private getBuildingPalette(x: number, z: number): ColorPalette {
    const buildingId = getBuildingId(x, z, this.sizeX);
    
    if (!this.buildingPalettes.has(buildingId)) {
      this.buildingPalettes.set(buildingId, getPaletteByIndex(buildingId));
    }
    
    return this.buildingPalettes.get(buildingId)!;
  }

  private getColorForCell(cell: GridCell): string {
    const palette = this.getBuildingPalette(cell.x, cell.z);
    let baseColor: string;

    switch (cell.type) {
      case BlockType.Foundation:
        baseColor = palette.foundation;
        break;
      case BlockType.Wall:
        baseColor = palette.primary;
        break;
      case BlockType.WallWithWindow:
        baseColor = palette.accent;
        break;
      case BlockType.Roof:
        baseColor = palette.roof;
        break;
      case BlockType.Arch:
        baseColor = palette.primary;
        break;
      default:
        baseColor = '#b8b8b8';
    }

    // Ajouter une légère variation aléatoire pour éviter l'uniformité
    return randomColorVariation(baseColor, 0.06);
  }

  private getNeighborCell(x: number, y: number, z: number): GridCell | null {
    if (!this.isValidCoordinate(x, y, z)) {
      return null;
    }

    return this.grid[x][y][z];
  }

  private isValidCoordinate(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.sizeX && y >= 0 && y < this.sizeY && z >= 0 && z < this.sizeZ;
  }
}