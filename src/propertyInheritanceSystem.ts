import { type GridCell, type CellCoordinate, DecorationStyle, type Corner, type Face, type MergeFlags, type PropertyBundle } from './types';
import { getBuildingId, getPaletteByIndex, type ColorPalette } from './colorPalettes';

export class PropertyInheritanceSystem {
  private readonly grid: GridCell[][][];
  private readonly sizeX: number;
  private readonly sizeZ: number;

  constructor(grid: GridCell[][][], sizeX: number, sizeZ: number) {
    this.grid = grid;
    this.sizeX = sizeX;
    this.sizeZ = sizeZ;
  }

  public computePropertyBundle(cell: GridCell): PropertyBundle {
    // Vérifier si c'est une colonne de tour
    const isTowerColumn = this.isTowerColumn(cell.x, cell.z);

    // Calculer le style décoratif
    const decorationStyle = this.computeDecorationStyle(cell, isTowerColumn);

    // Calculer la couleur
    const color = this.computeColor(cell, isTowerColumn, decorationStyle);

    // Calculer les flags de fusion
    const mergeFlags = this.computeMergeFlags(cell, decorationStyle);

    return {
      color,
      decorationStyle,
      mergeFlags
    };
  }

  private isTowerColumn(x: number, z: number): boolean {
    // Une colonne est une tour si elle a au moins un étage isolé horizontalement
    for (let y = 0; y < this.grid[x].length; y++) {
      const cell = this.grid[x][y][z];
      if (!cell.isOccupied) continue;

      const hasHorizontalNeighbors = this.getHorizontalNeighbors(x, y, z).length > 0;
      if (!hasHorizontalNeighbors) {
        return true;
      }
    }
    return false;
  }

  private computeDecorationStyle(cell: GridCell, isTowerColumn: boolean): DecorationStyle {
    // Les colonnes de tour ont toujours le style TOWER
    if (isTowerColumn) {
      return DecorationStyle.TOWER;
    }

    // Si pas de voisins, utiliser STONE par défaut
    const neighbors = this.getAdjacentNeighbors(cell);
    if (neighbors.length === 0) {
      return DecorationStyle.STONE;
    }

    // Trouver le voisin avec le poids d'héritage le plus élevé
    const neighborsWithWeights = neighbors.map(neighbor => ({
      neighbor,
      weight: this.computeInheritanceWeight(cell, neighbor)
    }));

    // Trouver le poids maximum
    const maxWeight = Math.max(...neighborsWithWeights.map(n => n.weight));

    // Trouver tous les voisins avec le poids maximum
    const topCandidates = neighborsWithWeights.filter(n => n.weight === maxWeight);

    // Si un seul candidat, utiliser son style
    if (topCandidates.length === 1) {
      return topCandidates[0].neighbor.propertyBundle?.decorationStyle ?? DecorationStyle.STONE;
    }

    // En cas d'égalité, utiliser le plus ancien (placementOrder le plus bas)
    const oldestCandidate = topCandidates.reduce((oldest, current) =>
      current.neighbor.placementOrder < oldest.neighbor.placementOrder ? current : oldest
    );

    return oldestCandidate.neighbor.propertyBundle?.decorationStyle ?? DecorationStyle.STONE;
  }

  private computeColor(cell: GridCell, isTowerColumn: boolean, decorationStyle: DecorationStyle): string {
    // Pour les tours, utiliser la couleur de palette du bâtiment
    if (isTowerColumn) {
      const buildingId = getBuildingId(cell.x, cell.z, this.sizeX);
      const palette = getPaletteByIndex(buildingId);
      return this.applyDeterministicColorVariation(palette.primary, cell);
    }

    // Si tous les voisins partagent le même buildingId, utiliser directement la couleur de palette
    const neighbors = this.getAdjacentNeighbors(cell);
    const buildingId = getBuildingId(cell.x, cell.z, this.sizeX);

    if (neighbors.length > 0) {
      const allSameBuilding = neighbors.every(neighbor =>
        getBuildingId(neighbor.x, neighbor.z, this.sizeX) === buildingId
      );

      if (allSameBuilding) {
        const palette = getPaletteByIndex(buildingId);
        let baseColor: string;

        // Choisir la couleur en fonction du style
        switch (decorationStyle) {
          case DecorationStyle.PLAIN:
            baseColor = palette.primary;
            break;
          case DecorationStyle.STONE:
            baseColor = palette.accent;
            break;
          case DecorationStyle.TOWER:
            baseColor = palette.primary;
            break;
        }

        return this.applyDeterministicColorVariation(baseColor, cell);
      }
    }

    // Calculer la couleur interpolée à partir des voisins
    if (neighbors.length === 0) {
      // Pas de voisins - utiliser la couleur de palette par défaut
      const palette = getPaletteByIndex(buildingId);
      return this.applyDeterministicColorVariation(palette.primary, cell);
    }

    if (neighbors.length === 1) {
      // Un seul parent - utiliser sa couleur directement
      const parentColor = neighbors[0].propertyBundle?.color ?? this.getDefaultColorForBuilding(buildingId);
      return this.applyDeterministicColorVariation(parentColor, cell);
    }

    // Plusieurs parents - interpolation pondérée
    const neighborsWithWeights = neighbors.map(neighbor => ({
      neighbor,
      weight: this.computeInheritanceWeight(cell, neighbor)
    }));

    // Normaliser les poids
    const totalWeight = neighborsWithWeights.reduce((sum, n) => sum + n.weight, 0);
    if (totalWeight === 0) {
      return this.applyDeterministicColorVariation(this.getDefaultColorForBuilding(buildingId), cell);
    }

    // Calculer la couleur interpolée dans l'espace RGB
    let r = 0, g = 0, b = 0;
    for (const { neighbor, weight } of neighborsWithWeights) {
      const normalizedWeight = weight / totalWeight;
      const neighborColor = neighbor.propertyBundle?.color ?? this.getDefaultColorForBuilding(buildingId);

      // Extraire les composantes RGB
      const rgb = this.hexToRgb(neighborColor);
      r += rgb.r * normalizedWeight;
      g += rgb.g * normalizedWeight;
      b += rgb.b * normalizedWeight;
    }

    // Convertir en hexadécimal
    const interpolatedColor = this.rgbToHex(Math.round(r), Math.round(g), Math.round(b));
    return this.applyDeterministicColorVariation(interpolatedColor, cell);
  }

  private computeMergeFlags(cell: GridCell, decorationStyle: DecorationStyle): MergeFlags {
    // Pour les tours, tout supprimer
    if (decorationStyle === DecorationStyle.TOWER) {
      return {
        suppressCornice: true,
        suppressQuoin: {
          backLeft: true,
          backRight: true,
          frontLeft: true,
          frontRight: true
        },
        suppressBaseTrim: {
          front: true,
          back: true,
          left: true,
          right: true
        }
      };
    }

    const neighbors = this.getAdjacentNeighbors(cell);
    const buildingId = getBuildingId(cell.x, cell.z, this.sizeX);

    // Calculer suppressCornice
    const hasSameBuildingAndStyleNeighbor = neighbors.some(neighbor =>
      getBuildingId(neighbor.x, neighbor.z, this.sizeX) === buildingId &&
      neighbor.propertyBundle?.decorationStyle === decorationStyle
    );

    // Calculer suppressQuoin pour chaque coin
    const suppressQuoin: Record<Corner, boolean> = {
      backLeft: this.shouldSuppressQuoin(cell, 'backLeft', buildingId),
      backRight: this.shouldSuppressQuoin(cell, 'backRight', buildingId),
      frontLeft: this.shouldSuppressQuoin(cell, 'frontLeft', buildingId),
      frontRight: this.shouldSuppressQuoin(cell, 'frontRight', buildingId)
    };

    // Calculer suppressBaseTrim pour chaque face
    const suppressBaseTrim: Record<Face, boolean> = {
      front: this.shouldSuppressBaseTrim(cell, 'front', buildingId),
      back: this.shouldSuppressBaseTrim(cell, 'back', buildingId),
      left: this.shouldSuppressBaseTrim(cell, 'left', buildingId),
      right: this.shouldSuppressBaseTrim(cell, 'right', buildingId)
    };

    return {
      suppressCornice: hasSameBuildingAndStyleNeighbor,
      suppressQuoin,
      suppressBaseTrim
    };
  }

  private shouldSuppressQuoin(cell: GridCell, corner: Corner, buildingId: number): boolean {
    // Déterminer quels voisins sont adjacents à ce coin
    const [dx1, dz1, dx2, dz2] = this.getCornerNeighborOffsets(corner);

    const neighbor1 = this.getNeighborCell(cell.x + dx1, cell.y, cell.z + dz1);
    const neighbor2 = this.getNeighborCell(cell.x + dx2, cell.y, cell.z + dz2);

    // Les deux voisins doivent exister et partager le même buildingId
    return neighbor1?.isOccupied === true &&
           neighbor2?.isOccupied === true &&
           getBuildingId(neighbor1.x, neighbor1.z, this.sizeX) === buildingId &&
           getBuildingId(neighbor2.x, neighbor2.z, this.sizeX) === buildingId;
  }

  private getCornerNeighborOffsets(corner: Corner): [number, number, number, number] {
    switch (corner) {
      case 'backLeft': return [-1, 0, 0, 1]; // gauche et arrière
      case 'backRight': return [1, 0, 0, 1]; // droite et arrière
      case 'frontLeft': return [-1, 0, 0, -1]; // gauche et avant
      case 'frontRight': return [1, 0, 0, -1]; // droite et avant
    }
  }

  private shouldSuppressBaseTrim(cell: GridCell, face: Face, buildingId: number): boolean {
    // Déterminer le voisin adjacent à cette face
    const [dx, dz] = this.getFaceNeighborOffset(face);
    const neighbor = this.getNeighborCell(cell.x + dx, cell.y, cell.z + dz);

    // Le voisin doit exister et partager le même buildingId
    return neighbor?.isOccupied === true &&
           getBuildingId(neighbor.x, neighbor.z, this.sizeX) === buildingId;
  }

  private getFaceNeighborOffset(face: Face): [number, number] {
    switch (face) {
      case 'front': return [0, -1];
      case 'back': return [0, 1];
      case 'left': return [-1, 0];
      case 'right': return [1, 0];
    }
  }

  private computeInheritanceWeight(cell: GridCell, neighbor: GridCell): number {
    // Age bonus - plus le placementOrder est bas (ancien), plus le bonus est élevé
    const ageBonus = neighbor.placementOrder >= 0 ?
      1 / (neighbor.placementOrder + 1) : 0;

    // Adjacency bonus - nombre de faces partagées (toujours 1 pour les voisins horizontaux)
    const adjacencyBonus = 1;

    return ageBonus + adjacencyBonus;
  }

  private getAdjacentNeighbors(cell: GridCell): GridCell[] {
    const neighbors: GridCell[] = [];
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1] // gauche, droite, avant, arrière
    ];

    for (const [dx, dz] of directions) {
      const neighbor = this.getNeighborCell(cell.x + dx, cell.y, cell.z + dz);
      if (neighbor?.isOccupied && neighbor.placementOrder >= 0) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  private getHorizontalNeighbors(x: number, y: number, z: number): GridCell[] {
    const neighbors: GridCell[] = [];
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1] // gauche, droite, avant, arrière
    ];

    for (const [dx, dz] of directions) {
      const neighbor = this.getNeighborCell(x + dx, y, z + dz);
      if (neighbor?.isOccupied) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  private getNeighborCell(x: number, y: number, z: number): GridCell | null {
    if (x < 0 || x >= this.sizeX || y < 0 || y >= this.grid[x].length || z < 0 || z >= this.grid[x][y].length) {
      return null;
    }
    return this.grid[x][y][z];
  }

  private getDefaultColorForBuilding(buildingId: number): string {
    const palette = getPaletteByIndex(buildingId);
    return palette.primary;
  }

  private applyDeterministicColorVariation(baseColor: string, cell: GridCell): string {
    // Calculer une variation déterministe basée sur les coordonnées
    const seed = this.getDeterministicColorSeed(cell.x, cell.y, cell.z);
    const variation = this.seedToVariation(seed);

    // Appliquer la variation à la couleur de base
    return this.applyColorVariation(baseColor, variation);
  }

  private getDeterministicColorSeed(x: number, y: number, z: number): number {
    // Utiliser un mélange simple des coordonnées pour créer une graine déterministe
    return (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  }

  private seedToVariation(seed: number): number {
    // Convertir la graine en une variation entre -0.05 et 0.05
    // Utiliser une fonction simple pour obtenir un nombre "aléatoire" déterministe
    const normalized = (seed & 0xFFFFFF) / 0xFFFFFF; // 0-1
    return (normalized - 0.5) * 0.1; // -0.05 à 0.05
  }

  private applyColorVariation(baseColor: string, variation: number): string {
    const rgb = this.hexToRgb(baseColor);

    // Appliquer la variation à chaque composante
    const r = Math.min(255, Math.max(0, rgb.r + (variation * 255)));
    const g = Math.min(255, Math.max(0, rgb.g + (variation * 255)));
    const b = Math.min(255, Math.max(0, rgb.b + (variation * 255)));

    return this.rgbToHex(r, g, b);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    // Retirer le # si présent
    hex = hex.replace('#', '');

    // Convertir les valeurs hexadécimales en décimal
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
}
