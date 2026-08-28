import React, { useState } from 'react';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Compass,
  Waves,
  Droplets,
  CloudRain,
  Radio,
  Navigation,
  ShieldAlert,
  Filter,
  Pipette,
  Building2,
  Mountain,
  Sprout,
  Activity,
  X,
  Check,
} from 'lucide-react';
import { LayerState, CriticalAssetItem, RoadSegment } from '../types';

interface MapControlsProps {
  layers: LayerState;
  onLayersChange: (layers: LayerState) => void;
  basemapStyle: 'vector' | 'dark' | 'voyager' | 'satellite' | 'cad';
  onBasemapChange: (style: 'vector' | 'dark' | 'voyager' | 'satellite' | 'cad') => void;
  roadsCount: number;
  criticalAssets: CriticalAssetItem[];
  selectedAssetCategory: string;
  onSelectAssetCategory: (cat: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  layers,
  onLayersChange,
  basemapStyle,
  onBasemapChange,
  roadsCount,
  criticalAssets,
  selectedAssetCategory,
  onSelectAssetCategory,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => {
  const [showLayersSheet, setShowLayersSheet] = useState<boolean>(false);

  const activeLayerCount = Object.values(layers).filter(Boolean).length;

  return (
    <div
      style={{
        position: 'absolute',
        top: '68px',
        right: '14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        zIndex: 35,
        pointerEvents: 'auto',
      }}
    >
      {/* Floating Vertical Control Stack */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          padding: '4px',
          borderRadius: '14px',
        }}
      >
        {/* Layers Sheet Toggle */}
        <button
          onClick={() => setShowLayersSheet(!showLayersSheet)}
          className="glass-btn"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: showLayersSheet ? 'rgba(2, 132, 199, 0.4)' : 'transparent',
            borderColor: showLayersSheet ? '#38bdf8' : 'transparent',
            position: 'relative',
          }}
          title="Map Layers & GIS Overlay Sheet"
        >
          <Layers size={16} color={showLayersSheet ? '#38bdf8' : '#e2e8f0'} />
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              background: '#0284c7',
              color: '#fff',
              fontSize: '8px',
              fontWeight: 800,
              width: '13px',
              height: '13px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {activeLayerCount}
          </span>
        </button>

        <div style={{ width: '20px', height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Center / Fit Catchment */}
        <button
          onClick={onResetView}
          className="glass-btn"
          style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: 'none' }}
          title="Center / Fit Catchment"
        >
          <Crosshair size={16} color="#34d399" />
        </button>

        {/* Compass / North Align */}
        <button
          onClick={onResetView}
          className="glass-btn"
          style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: 'none' }}
          title="Align North"
        >
          <Compass size={16} color="#38bdf8" />
        </button>

        <div style={{ width: '20px', height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Zoom Controls */}
        <button
          onClick={onZoomIn}
          className="glass-btn"
          style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: 'none' }}
          title="Zoom In"
        >
          <ZoomIn size={16} color="#f8fafc" />
        </button>

        <button
          onClick={onZoomOut}
          className="glass-btn"
          style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: 'none' }}
          title="Zoom Out"
        >
          <ZoomOut size={16} color="#f8fafc" />
        </button>
      </div>

      {/* Apple Maps Style Floating Layers & Basemap Popover Sheet */}
      {showLayersSheet && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            position: 'absolute',
            top: '0px',
            right: '48px',
            width: '280px',
            padding: '14px',
            borderRadius: '16px',
            zIndex: 45,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: '#f8fafc' }}>
              <Layers size={14} color="#38bdf8" />
              <span>MAP LAYERS &amp; BASEMAP</span>
            </div>
            <button
              onClick={() => setShowLayersSheet(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Basemap Segmented Pill Selector */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>
              Basemap Engine
            </div>
            <div style={{ display: 'flex', gap: '2px', background: 'rgba(10, 15, 29, 0.8)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {(['vector', 'dark', 'voyager', 'satellite', 'cad'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => onBasemapChange(b)}
                  style={{
                    flex: 1,
                    background: basemapStyle === b ? '#0284c7' : 'transparent',
                    color: basemapStyle === b ? '#fff' : '#94a3b8',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 0',
                    fontSize: '9px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {b === 'vector' ? 'Vector' : b === 'dark' ? 'Dark' : b === 'voyager' ? 'Voyager' : b === 'satellite' ? 'Sat' : 'CAD'}
                </button>
              ))}
            </div>
          </div>

          {/* Layer Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#cbd5e1' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', background: layers.flood_2d ? 'rgba(56, 189, 248, 0.12)' : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Waves size={13} color="#38bdf8" />
                <span>2D Overland Inundation</span>
              </div>
              <input
                type="checkbox"
                checked={layers.flood_2d}
                onChange={(e) => onLayersChange({ ...layers, flood_2d: e.target.checked })}
                style={{ accentColor: '#38bdf8' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', background: layers.flood_1d ? 'rgba(244, 63, 94, 0.12)' : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Droplets size={13} color="#f43f5e" />
                <span>1D Pipe Surcharging</span>
              </div>
              <input
                type="checkbox"
                checked={layers.flood_1d}
                onChange={(e) => onLayersChange({ ...layers, flood_1d: e.target.checked })}
                style={{ accentColor: '#f43f5e' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', background: layers.rainfall ? 'rgba(56, 189, 248, 0.12)' : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CloudRain size={13} color="#38bdf8" />
                <span>Rainfall Intensity Heatmap</span>
              </div>
              <input
                type="checkbox"
                checked={layers.rainfall}
                onChange={(e) => onLayersChange({ ...layers, rainfall: e.target.checked })}
                style={{ accentColor: '#38bdf8' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', background: layers.radar ? 'rgba(52, 211, 153, 0.12)' : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={13} color="#34d399" />
                <span>Doppler Weather Radar (DWR)</span>
              </div>
              <input
                type="checkbox"
                checked={layers.radar}
                onChange={(e) => onLayersChange({ ...layers, radar: e.target.checked })}
                style={{ accentColor: '#34d399' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', background: layers.passability ? 'rgba(251, 191, 36, 0.12)' : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={13} color="#fbbf24" />
                <span>Road Passability Status</span>
              </div>
              <input
                type="checkbox"
                checked={layers.passability}
                onChange={(e) => onLayersChange({ ...layers, passability: e.target.checked })}
                style={{ accentColor: '#fbbf24' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', background: layers.drainage ? 'rgba(96, 165, 250, 0.12)' : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Pipette size={13} color="#60a5fa" />
                <span>Drainage &amp; Outfalls</span>
              </div>
              <input
                type="checkbox"
                checked={layers.drainage}
                onChange={(e) => onLayersChange({ ...layers, drainage: e.target.checked })}
                style={{ accentColor: '#60a5fa' }}
              />
            </label>

            {/* Critical Assets Filter */}
            <div style={{ background: 'rgba(10, 15, 29, 0.6)', padding: '6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={13} color="#34d399" />
                  <span style={{ fontWeight: 700 }}>Civic Assets ({criticalAssets.length})</span>
                </div>
                <input
                  type="checkbox"
                  checked={layers.assets}
                  onChange={(e) => onLayersChange({ ...layers, assets: e.target.checked })}
                  style={{ accentColor: '#34d399' }}
                />
              </label>

              {layers.assets && (
                <select
                  value={selectedAssetCategory}
                  onChange={(e) => onSelectAssetCategory(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#080d1a',
                    color: '#38bdf8',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    padding: '3px 6px',
                    fontSize: '9px',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">All Categories</option>
                  <option value="HOSPITAL">Hospitals &amp; Medical</option>
                  <option value="POWER_SUBSTATION">Power Substations</option>
                  <option value="EMERGENCY_SERVICES">NDRF &amp; Fire Command</option>
                  <option value="RELIEF_SHELTER">Cyclone Shelters</option>
                  <option value="METRO_STATION">Metro &amp; Rail Transit</option>
                  <option value="WATER_TREATMENT">Water Treatment</option>
                </select>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mountain size={13} color="#fbbf24" />
                <span>DEM Elevation Contours</span>
              </div>
              <input
                type="checkbox"
                checked={layers.elevation}
                onChange={(e) => onLayersChange({ ...layers, elevation: e.target.checked })}
                style={{ accentColor: '#fbbf24' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sprout size={13} color="#10b981" />
                <span>Sponge NbS Assets</span>
              </div>
              <input
                type="checkbox"
                checked={layers.sponge}
                onChange={(e) => onLayersChange({ ...layers, sponge: e.target.checked })}
                style={{ accentColor: '#10b981' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={13} color="#c084fc" />
                <span>Spatial Risk (P90)</span>
              </div>
              <input
                type="checkbox"
                checked={layers.risk}
                onChange={(e) => onLayersChange({ ...layers, risk: e.target.checked })}
                style={{ accentColor: '#c084fc' }}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
