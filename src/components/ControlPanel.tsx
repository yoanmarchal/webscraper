import { useState } from 'react';

interface ControlPanelProps {
  gridSize: number;
  onGridSizeChange: (size: number) => void;
  showPerfMonitor: boolean;
  onTogglePerfMonitor: (show: boolean) => void;
}

export function ControlPanel({
  gridSize,
  onGridSizeChange,
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
