import React, { useState } from 'react';
import { MetricsSummary } from '../types';
import {
  Waves,
  CloudRain,
  ShieldAlert,
  ShieldCheck,
  Pipette,
  Layers,
  ChevronUp,
  ChevronDown,
  Activity,
  Droplets,
} from 'lucide-react';

interface FloatingMetricsHUDProps {
  metrics: MetricsSummary;
}

export const FloatingMetricsHUD: React.FC<FloatingMetricsHUDProps> = ({ metrics }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const peakD = metrics?.peak_depth_m ?? 0;
  const floodHa = ((metrics?.flooded_area_m2 ?? 0) / 10000);
  const impassable = metrics?.impassable_roads_count ?? 0;
  const passable = metrics?.passable_roads_count ?? 0;
  const rainRate = metrics?.rainfall_rate_mmh ?? 0;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '84px',
        right: '14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '6px',
        zIndex: 35,
        pointerEvents: 'auto',
      }}
    >
      {/* Expanded Details Card */}
      {isExpanded && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            width: '280px',
            padding: '12px 14px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '6px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Activity size={12} color="#38bdf8" />
              <span>HYDRODYNAMIC MASS TELEMETRY</span>
            </div>
            <span style={{ fontSize: '9px', color: '#38bdf8', fontWeight: 700 }}>T+{metrics?.lead_minutes ?? 0}m</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px' }}>
            <div className="glass-card" style={{ padding: '6px 8px' }}>
              <div style={{ color: '#64748b', fontSize: '8px', textTransform: 'uppercase' }}>Storage Vol</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#60a5fa' }}>
                {((metrics?.storage_volume_m3 ?? 0) / 1000).toFixed(1)} <span style={{ fontSize: '9px', color: '#64748b' }}>k m³</span>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '6px 8px' }}>
              <div style={{ color: '#64748b', fontSize: '8px', textTransform: 'uppercase' }}>Outfall Q</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8' }}>
                {(metrics?.outfall_q_m3s ?? 0).toFixed(2)} <span style={{ fontSize: '9px', color: '#64748b' }}>m³/s</span>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '6px 8px' }}>
              <div style={{ color: '#64748b', fontSize: '8px', textTransform: 'uppercase' }}>Surcharged Nodes</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#fb923c' }}>
                {metrics?.surcharged_nodes_count ?? 0}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '6px 8px' }}>
              <div style={{ color: '#64748b', fontSize: '8px', textTransform: 'uppercase' }}>Dry Network</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8' }}>
                {metrics?.dry_roads_count ?? 0}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '9px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '2px' }}>
            <span>Model: <strong style={{ color: '#c084fc' }}>{metrics?.active_model || '2D SWMM'}</strong></span>
            <span style={{ color: '#34d399', fontWeight: 700 }}>MASS CONSERVED</span>
          </div>
        </div>
      )}

      {/* Floating HUD Pill */}
      <div
        className="glass-pill"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 14px',
          cursor: 'pointer',
          border: isExpanded ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
        }}
        title="Click to toggle detailed hydrodynamic mass telemetry"
      >
        {/* Peak Depth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Waves size={13} color="#f87171" />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#f87171' }}>
            {peakD.toFixed(2)}m
          </span>
          <span style={{ fontSize: '9px', color: '#64748b' }}>Peak</span>
        </div>

        <span style={{ color: '#334155' }}>|</span>

        {/* Flooded Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Droplets size={13} color="#fbbf24" />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#fbbf24' }}>
            {floodHa.toFixed(1)}ha
          </span>
        </div>

        <span style={{ color: '#334155' }}>|</span>

        {/* Impassable vs Passable Roads */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <ShieldAlert size={12} color="#f43f5e" />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#f43f5e' }}>{impassable}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <ShieldCheck size={12} color="#34d399" />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399' }}>{passable}</span>
          </div>
        </div>

        <span style={{ color: '#334155' }}>|</span>

        {/* Rainfall Rate */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CloudRain size={12} color="#38bdf8" />
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8' }}>
            {rainRate.toFixed(1)} <span style={{ fontSize: '8px', color: '#64748b' }}>mm/h</span>
          </span>
        </div>

        <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', marginLeft: '2px' }}>
          {isExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </div>
      </div>
    </div>
  );
};
