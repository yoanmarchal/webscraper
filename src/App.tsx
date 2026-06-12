import { useState } from 'react';
import { VillageGrid } from './villageGrid';
import { VoxelScene } from './components/VoxelScene';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 10;
const GRID_DEPTH = 20;

const grid = new VillageGrid(GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH);

export function App() {
  const [, setRenderTick] = useState(0);
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

  return (
    <div className="app-shell compact-shell">
      <div className="canvas-frame">
        <button
          type="button"
          className="floating-clear-button"
          onClick={() => {
            grid.clear();
            refreshScene();
          }}
        >
          Clear
        </button>
        <VoxelScene
          cells={cells}
          gridWidth={GRID_WIDTH}
          gridDepth={GRID_DEPTH}
          selectedHeight={0}
          onCellAction={handleCellAction}
          onPreviewMove={(x, z) => setPreviewCell({ x, z })}
          previewCell={previewCell}
          toWorldPosition={(x, y, z) => grid.toWorldPosition(x, y, z)}
          getNextPlacementY={(x, z, minimumY) => grid.getNextPlacementY(x, z, minimumY)}
          getTopOccupiedY={(x, z) => grid.getTopOccupiedY(x, z)}
        />
      </div>
    </div>
  );
}