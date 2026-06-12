import { useState } from 'react';
import { BlockType } from './types';
import { VillageGrid } from './villageGrid';
import { VoxelScene } from './components/VoxelScene';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 10;
const GRID_DEPTH = 20;

const grid = new VillageGrid(GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH);

function formatCountLabel(type: BlockType): string {
  switch (type) {
    case BlockType.Foundation:
      return 'Fondations';
    case BlockType.Wall:
      return 'Murs';
    case BlockType.WallWithWindow:
      return 'Fenêtres';
    case BlockType.Roof:
      return 'Toits';
    case BlockType.Arch:
      return 'Arches';
    default:
      return 'Vides';
  }
}

export function App() {
  const [, setRenderTick] = useState(0);
  const [selectedHeight, setSelectedHeight] = useState(0);
  const [previewCell, setPreviewCell] = useState<{ x: number; z: number } | null>(null);

  const refreshScene = () => setRenderTick((tick) => tick + 1);

  const handleCellAction = (action: 'add' | 'remove', x: number, y: number, z: number) => {
    if (action === 'add') {
      grid.addBlock(x, y, z);
    } else {
      grid.removeBlock(x, y, z);
    }

    refreshScene();
  };

  const cells = grid.getOccupiedCells();
  const counts = grid.getTypeCounts();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <p className="eyebrow">WebGlade / WebScaper</p>
        <h1>Village 3D organique, piloté par des règles simples.</h1>
        <p className="lead">
          Clique gauche pour empiler un bloc au-dessus de la colonne visée, clic droit pour retirer le bloc du sommet.
          La grille recalcule immédiatement les types visibles: fondations, murs, toits et arches.
        </p>

        <div className="control-card">
          <label htmlFor="height-range">Hauteur active</label>
          <input
            id="height-range"
            type="range"
            min={0}
            max={GRID_HEIGHT - 1}
            value={selectedHeight}
            onChange={(event) => setSelectedHeight(Number(event.target.value))}
          />
          <div className="control-row">
            <span>Niveau</span>
            <strong>Y = {selectedHeight}</strong>
          </div>
        </div>

        <div className="stats-grid">
          <div>
            <span>Blocs</span>
            <strong>{cells.length}</strong>
          </div>
          <div>
            <span>Fondations</span>
            <strong>{counts[BlockType.Foundation]}</strong>
          </div>
          <div>
            <span>Murs</span>
            <strong>{counts[BlockType.Wall]}</strong>
          </div>
          <div>
            <span>Toits</span>
            <strong>{counts[BlockType.Roof]}</strong>
          </div>
        </div>

        <div className="legend-card">
          <h2>Règles actives</h2>
          <ul>
            <li>Sol occupé: fondation.</li>
            <li>Bloc au-dessus: le bloc inférieur redevient un mur.</li>
            <li>Deux voisins horizontaux sans support: arche.</li>
            <li>Bloc en sommet de pile: toit.</li>
          </ul>
        </div>

        <div className="type-list">
          {Object.values(BlockType)
            .filter((type) => type !== BlockType.Empty)
            .map((type) => (
              <div key={type} className="type-row">
                <span>{formatCountLabel(type)}</span>
                <strong>{counts[type]}</strong>
              </div>
            ))}
        </div>

        <button
          type="button"
          className="ghost-button"
          onClick={() => {
            grid.clear();
            refreshScene();
          }}
        >
          Vider la grille
        </button>
      </aside>

      <main className="stage">
        <div className="canvas-frame">
          <VoxelScene
            cells={cells}
            gridWidth={GRID_WIDTH}
            gridDepth={GRID_DEPTH}
            selectedHeight={selectedHeight}
            onCellAction={handleCellAction}
            onPreviewMove={(x, z) => setPreviewCell({ x, z })}
            previewCell={previewCell}
            toWorldPosition={(x, y, z) => grid.toWorldPosition(x, y, z)}
            getNextPlacementY={(x, z, minimumY) => grid.getNextPlacementY(x, z, minimumY)}
            getTopOccupiedY={(x, z) => grid.getTopOccupiedY(x, z)}
          />
        </div>
      </main>
    </div>
  );
}