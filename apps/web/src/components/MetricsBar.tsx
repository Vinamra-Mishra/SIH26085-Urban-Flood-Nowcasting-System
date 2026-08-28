import React from 'react';
import { MetricsSummary } from '../types';

interface MetricsBarProps {
  metrics: MetricsSummary;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ metrics }) => {
  return (
    <div
      id="metrics-strip"
      style={{
        background: '#000000',
        borderTop: '1px solid #171717',
        padding: '6px 14px',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        alignItems: 'center',
        zIndex: 40,
      }}
    >
      <div className="metric-card" style={{ background: '#050505', border: '1px solid #171717', borderRadius: '5px', padding: '5px 9px', minWidth: '85px' }}>
        <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Lead Time</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', fontVariantNumeric: 'tabular-nums' }}>
          T+{metrics?.lead_minutes ?? 0}m
        </div>
      </div>

      <div className="metric-card" style={{ background: '#050505', border: '1px solid #171717', borderRadius: '5px', padding: '5px 9px', minWidth: '95px' }}>
        <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Rainfall Rate</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>
          {(metrics?.rainfall_rate_mmh ?? 0).toFixed(1)} <span style={{ fontSize: '9px', color: '#64748b' }}>mm/h</span>
        </div>
      </div>

      <div className="metric-card" style={{ background: '#050505', border: '1px solid #171717', borderRadius: '5px', padding: '5px 9px', minWidth: '90px' }}>
        <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Peak Depth</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#f87171', fontVariantNumeric: 'tabular-nums' }}>
          {(metrics?.peak_depth_m ?? 0).toFixed(2)} <span style={{ fontSize: '9px', color: '#64748b' }}>m</span>
        </div>
      </div>

      <div className="metric-card" style={{ background: '#050505', border: '1px solid #171717', borderRadius: '5px', padding: '5px 9px', minWidth: '105px' }}>
        <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Flooded Area</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', fontVariantNumeric: 'tabular-nums' }}>
          {((metrics?.flooded_area_m2 ?? 0) / 10000).toFixed(1)} <span style={{ fontSize: '9px', color: '#64748b' }}>ha</span>
        </div>
      </div>

      <div className="metric-card" style={{ background: '#050505', border: '1px solid #171717', borderRadius: '5px', padding: '5px 9px', minWidth: '85px' }}>
        <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Dry Roads</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
          {metrics?.dry_roads_count ?? 0}
        </div>
      </div>

      <div className="metric-card" style={{ background: '#050505', border: '1px solid #171717', borderRadius: '5px', padding: '5px 9px', minWidth: '85px' }}>
        <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Passable</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>
          {metrics?.passable_roads_count ?? 0}
        </div>
      </div>

      <div className="metric-card" style={{ background: '#050505', border: '1px solid #171717', borderRadius: '5px', padding: '5px 9px', minWidth: '95px' }}>
        <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Impassable</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#f43f5e', fontVariantNumeric: 'tabular-nums' }}>
          {metrics?.impassable_roads_count ?? 0}
        </div>
      </div>

      <div className="metric-card" style={{ background: '#050505', border: '1px solid #171717', borderRadius: '5px', padding: '5px 9px', minWidth: '90px' }}>
        <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Surcharged</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fb923c', fontVariantNumeric: 'tabular-nums' }}>
          {metrics?.surcharged_nodes_count ?? 0}
        </div>
      </div>

      <div className="metric-card" style={{ background: '#050505', border: '1px solid #171717', borderRadius: '5px', padding: '5px 9px', minWidth: '100px' }}>
        <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Storage Vol</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', fontVariantNumeric: 'tabular-nums' }}>
          {((metrics?.storage_volume_m3 ?? 0) / 1000).toFixed(1)} <span style={{ fontSize: '9px', color: '#64748b' }}>k m³</span>
        </div>
      </div>

      <div className="metric-card" style={{ background: '#050505', border: '1px solid #171717', borderRadius: '5px', padding: '5px 9px', minWidth: '95px' }}>
        <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Outfall Q</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', fontVariantNumeric: 'tabular-nums' }}>
          {(metrics?.outfall_q_m3s ?? 0).toFixed(2)} <span style={{ fontSize: '9px', color: '#64748b' }}>m³/s</span>
        </div>
      </div>

      <div className="metric-card" style={{ background: '#050505', border: '1px solid #171717', borderRadius: '5px', padding: '5px 9px', minWidth: '125px' }}>
        <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Active Model</div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc', whiteSpace: 'nowrap' }}>
          {metrics?.active_model || 'Hydrodynamic (2D)'}
        </div>
      </div>

      <div className="metric-card" style={{ background: '#050505', border: '1px solid #171717', borderRadius: '5px', padding: '5px 9px', minWidth: '135px' }}>
        <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Dataset Source</div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#34d399', whiteSpace: 'nowrap' }}>
          {metrics?.dataset_source || 'REAL_OBSERVED'}
        </div>
      </div>
    </div>
  );
};
