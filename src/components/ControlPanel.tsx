import { useState } from 'react';

interface ControlPanelProps {
  gridSize: number;
  onGridSizeChange: (size: number) => void;
  noiseScale: number;
  onNoiseScaleChange: (scale: number) => void;
  generationSeed: number;
  onGenerationSeedChange: (seed: number) => void;
  showPerfMonitor: boolean;
  onTogglePerfMonitor: (show: boolean) => void;
}

export function ControlPanel({
  gridSize,
  onGridSizeChange,
  noiseScale,
  onNoiseScaleChange,
  generationSeed,
  onGenerationSeedChange,
  showPerfMonitor,
  onTogglePerfMonitor,
}: ControlPanelProps) {
  const [isPanelVisible, setIsPanelVisible] = useState(true);

  if (!isPanelVisible) {
    return null;
  }

  return (
    <div className="control-panel">
      <div className="panel-container">
        <h3>Voxel Control Panel</h3>

        <div className="control-group">
          <h4>Voxel Settings</h4>
          <div className="control-item">
            <label>Grid Size: {gridSize}x{gridSize}</label>
            <input
              type="range"
              min="2"
              max="5"
              step="1"
              value={gridSize}
              onChange={(e) => onGridSizeChange(parseInt(e.target.value))}
            />
            <small>Controls grid dimensions (2x2, 3x3, etc.)</small>
          </div>

          <div className="control-item">
            <label>Noise Scale: {noiseScale.toFixed(1)}</label>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={noiseScale}
              onChange={(e) => onNoiseScaleChange(parseFloat(e.target.value))}
            />
            <small>Adjust before generating terrain</small>
          </div>

          <div className="control-item">
            <label>Generation Seed: {generationSeed}</label>
            <input
              type="range"
              min="0"
              max="1000"
              step="1"
              value={generationSeed}
              onChange={(e) => onGenerationSeedChange(parseInt(e.target.value))}
            />
            <small>Change pattern before generating</small>
          </div>
        </div>

        <div className="control-group">
          <h4>Performance</h4>
          <div className="control-item">
            <label>
              <input
                type="checkbox"
                checked={showPerfMonitor}
                onChange={(e) => onTogglePerfMonitor(e.target.checked)}
              />
              Show Performance Monitor
            </label>
          </div>
        </div>

        <div className="control-group">
          <button onClick={() => setIsPanelVisible(false)}>Hide Panel</button>
        </div>
      </div>
    </div>
  );
}
