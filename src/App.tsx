import { useState, useEffect } from 'react';
import { VillageGrid } from './villageGrid';
import { VoxelScene } from './components/VoxelScene';
import { ControlPanel } from './components/ControlPanel';

const GRID_HEIGHT = 10;

export function App() {
  const [, setRenderTick] = useState(0);
  const [previewCell, setPreviewCell] = useState<{ x: number; z: number } | null>(null);
  const [gridSize, setGridSize] = useState(2);
  const [showPerfMonitor, setShowPerfMonitor] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Create VillageGrid with dynamic size based on gridSize
  const [grid, setGrid] = useState(() => new VillageGrid(gridSize, GRID_HEIGHT, gridSize));

  // Recreate grid when gridSize changes
  useEffect(() => {
    setGrid(new VillageGrid(gridSize, GRID_HEIGHT, gridSize));
  }, [gridSize]);

  // Note: Terrain generation is now manual only via the "Generate Terrain" button
  // This prevents performance issues from automatic regeneration

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
        <div className="floating-buttons">
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
          <button
            type="button"
            className="floating-generate-button"
            onClick={async () => {
              if (isGenerating) return;
              setIsGenerating(true);

              // Use setTimeout to yield to browser for UI update
              await new Promise(resolve => setTimeout(resolve, 50));

              // Generate terrain in chunks to prevent UI freezing
              grid.generateTerrain(42, 2, gridSize);
              refreshScene();

              setIsGenerating(false);
            }}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Terrain'}
          </button>
        </div>
          <VoxelScene
          cells={cells}
          gridWidth={gridSize}
          gridDepth={gridSize}
          selectedHeight={0}
          onCellAction={handleCellAction}
          onPreviewMove={(x, z) => {
            // Only allow preview within the selected grid size
            if (x < gridSize && z < gridSize) {
              setPreviewCell({ x, z });
            } else {
              setPreviewCell(null);
            }
          }}
          previewCell={previewCell}
          toWorldPosition={(x, y, z) => grid.toWorldPosition(x, y, z)}
          getNextPlacementY={(x, z, minimumY) => grid.getNextPlacementY(x, z, minimumY)}
          getTopOccupiedY={(x, z) => grid.getTopOccupiedY(x, z)}
          gridSize={gridSize}
          showPerfMonitor={showPerfMonitor}
        />
      </div>
      <ControlPanel
        gridSize={gridSize}
        onGridSizeChange={setGridSize}
        showPerfMonitor={showPerfMonitor}
        onTogglePerfMonitor={setShowPerfMonitor}
      />
    </div>
  );
}
