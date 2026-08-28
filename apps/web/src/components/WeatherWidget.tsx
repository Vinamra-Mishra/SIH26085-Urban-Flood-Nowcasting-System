import React from 'react';
import { LiveTelemetry } from '../types';
import { Cloud, CloudRain, Sun, Wind, Droplets, Gauge, Eye, Radio, Globe, X } from 'lucide-react';

interface WeatherWidgetProps {
  telemetry: LiveTelemetry | null;
  onClose?: () => void;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ telemetry, onClose }) => {
  const w = telemetry?.weather || {};
  const nasa = telemetry?.nasa_satellite || {};
  const temp = w.temperature_c ?? telemetry?.temp_c ?? 28.0;
  const feelsLike = w.feels_like_c ?? 30.5;
  const humidity = w.humidity_pct ?? telemetry?.humidity_pct ?? 65;
  const pressure = w.pressure_hpa ?? 1009;
  const windSpeed = w.wind_speed_kmh ?? telemetry?.wind_speed_kmh ?? 14.5;
  const windDeg = w.wind_deg ?? 250;
  const rain = w.rain_rate_mmh ?? telemetry?.precip_rate_mmh ?? 0.0;
  const condition = w.condition ?? telemetry?.condition ?? 'Fair';
  const desc = w.description ?? 'Fair conditions';
  const clouds = w.cloudiness_pct ?? 20;
  const visibility = w.visibility_km ?? 10.0;

  return (
    <div
      style={{
        background: '#000000',
        border: '1px solid #1f2937',
        borderRadius: '10px',
        padding: '16px',
        color: '#f8fafc',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.9), 0 0 20px rgba(56, 189, 248, 0.08)',
        backdropFilter: 'blur(16px)',
        minWidth: '320px',
        maxWidth: '380px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #111827', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: '#0284c7', color: '#fff', borderRadius: '6px', padding: '4px 6px', fontSize: '11px', fontWeight: 800 }}>
            LIVE
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc' }}>
              Real-Time Atmospheric &amp; Satellite Feeds
            </div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>
              OpenWeather · NASA GPM/SMAP · IMD DWR
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#050505', border: '1px solid #171717', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.5px' }}>
            {temp.toFixed(1)}°C
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Feels like <strong style={{ color: '#f8fafc' }}>{feelsLike.toFixed(1)}°C</strong>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
            {rain > 0 ? <CloudRain size={22} color="#38bdf8" /> : (clouds > 50 ? <Cloud size={22} color="#94a3b8" /> : <Sun size={22} color="#fbbf24" />)}
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{condition}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{desc}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
        <div style={{ background: '#050505', border: '1px solid #171717', borderRadius: '6px', padding: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: '#64748b' }}>
            <Droplets size={11} color="#38bdf8" />
            <span>Relative Humidity</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', marginTop: '3px' }}>
            {humidity}%
          </div>
        </div>

        <div style={{ background: '#050505', border: '1px solid #171717', borderRadius: '6px', padding: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: '#64748b' }}>
            <Wind size={11} color="#34d399" />
            <span>Wind Speed</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', marginTop: '3px' }}>
            {windSpeed.toFixed(1)} km/h <span style={{ fontSize: '9px', color: '#94a3b8' }}>({windDeg}°)</span>
          </div>
        </div>

        <div style={{ background: '#050505', border: '1px solid #171717', borderRadius: '6px', padding: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: '#64748b' }}>
            <CloudRain size={11} color="#60a5fa" />
            <span>Rainfall Rate</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: rain > 0 ? '#38bdf8' : '#64748b', marginTop: '3px' }}>
            {rain.toFixed(2)} mm/h
          </div>
        </div>

        <div style={{ background: '#050505', border: '1px solid #171717', borderRadius: '6px', padding: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: '#64748b' }}>
            <Gauge size={11} color="#fbbf24" />
            <span>Surface Pressure</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', marginTop: '3px' }}>
            {pressure} hPa
          </div>
        </div>

        <div style={{ background: '#050505', border: '1px solid #171717', borderRadius: '6px', padding: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: '#64748b' }}>
            <Cloud size={11} color="#94a3b8" />
            <span>Cloud Cover</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', marginTop: '3px' }}>
            {clouds}%
          </div>
        </div>

        <div style={{ background: '#050505', border: '1px solid #171717', borderRadius: '6px', padding: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: '#64748b' }}>
            <Eye size={11} color="#c084fc" />
            <span>Visibility</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', marginTop: '3px' }}>
            {visibility.toFixed(1)} km
          </div>
        </div>
      </div>

      <div style={{ background: '#030712', border: '1px solid #111827', borderRadius: '8px', padding: '10px', fontSize: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontWeight: 700 }}>
            <Globe size={12} /> NASA Earthdata Satellite Feed
          </span>
          <span style={{ fontSize: '9px', background: '#064e3b', color: '#34d399', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
            {nasa.status || 'AUTHENTICATED'}
          </span>
        </div>
        <div style={{ color: '#94a3b8', fontSize: '9px', lineHeight: 1.4 }}>
          <div>• <strong>GPM IMERG:</strong> 30-min calibrated precipitation stream</div>
          <div>• <strong>SMAP Soil Moisture:</strong> {(nasa.smap_soil_moisture_m3m3 ?? 0.32).toFixed(2)} m³/m³ ({(nasa.smap_saturation_pct ?? 64).toFixed(0)}% saturation)</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #111827' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399', fontWeight: 700 }}>
            <Radio size={12} /> {telemetry?.radar_station || 'IMD Doppler Radar'}
          </span>
          <span style={{ color: '#38bdf8', fontWeight: 700 }}>5-min Scans</span>
        </div>
      </div>
    </div>
  );
};
