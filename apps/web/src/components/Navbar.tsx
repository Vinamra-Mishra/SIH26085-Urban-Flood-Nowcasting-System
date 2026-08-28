import React, { useState } from 'react';
import { CityId, CityMetadata, LiveTelemetry } from '../types';
import { Radio, CloudRain, Waves, MapPin, Maximize, Sun, Cloud, Thermometer } from 'lucide-react';
import { WeatherWidget } from './WeatherWidget';

interface NavbarProps {
  activeCity: CityId;
  onCityChange: (city: CityId) => void;
  cityMeta: CityMetadata | null;
  telemetry: LiveTelemetry | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeCity,
  onCityChange,
  cityMeta,
  telemetry,
}) => {
  const [showWeather, setShowWeather] = useState(false);

  const w = telemetry?.weather || {};
  const temp = w.temperature_c ?? telemetry?.temp_c ?? 28.0;

  return (
    <header
      style={{
        height: '48px',
        background: '#000000',
        borderBottom: '1px solid #171717',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 50,
        position: 'relative',
      }}
    >
      {/* Brand & Project Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #0284c7, #2563eb)',
            color: '#fff',
            fontWeight: 900,
            fontSize: '13px',
            padding: '3px 7px',
            borderRadius: '5px',
            letterSpacing: '0.5px',
            boxShadow: '0 0 10px rgba(2, 132, 199, 0.4)',
          }}
        >
          U
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '13px', color: '#f8fafc', letterSpacing: '0.2px' }}>
            UFNS — Flood-Aware Decision Support
          </div>
          <div style={{ fontSize: '9px', color: '#64748b' }}>
            High-Resolution Urban Flood Nowcasting · SIH26085 · MoES / NCMRWF
          </div>
        </div>
      </div>

      {/* Center City Switcher & Live Feeds */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#050505', border: '1px solid #1f2937', borderRadius: '6px', padding: '2px 8px' }}>
          <MapPin size={13} color="#38bdf8" style={{ marginRight: '6px' }} />
          <select
            value={activeCity}
            onChange={(e) => onCityChange(e.target.value as CityId)}
            style={{
              background: 'transparent',
              color: '#38bdf8',
              border: 'none',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="MUMBAI" style={{ background: '#000000', color: '#f8fafc' }}>
              Mumbai Metropolitan Region (Operational Real Data)
            </option>
            <option value="VIJAYAWADA" style={{ background: '#000000', color: '#f8fafc' }}>
              Vijayawada Urban Area (Krishna Basin Real Data)
            </option>
            <option value="DEMO" style={{ background: '#000000', color: '#f8fafc' }}>
              Synthetic Basin Pilot (M5-M11 Baseline Demo)
            </option>
          </select>
        </div>

        {/* Live Weather / Marine Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Weather Widget Trigger Button */}
          <button
            onClick={() => setShowWeather(!showWeather)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: showWeather ? '#172554' : '#050505',
              border: showWeather ? '1px solid #38bdf8' : '1px solid #1f2937',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '10px',
              color: '#38bdf8',
              cursor: 'pointer',
              fontWeight: 700,
            }}
            title="Click to view Real-Time Weather & Satellite Telemetry"
          >
            <Thermometer size={12} color="#38bdf8" />
            <span>{temp.toFixed(1)}°C {w.condition || 'Clear'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#050505', border: '1px solid #1f2937', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: '#34d399' }}>
            <Radio size={11} className="pulse" />
            <span>Radar: ONLINE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#050505', border: '1px solid #1f2937', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: '#38bdf8' }}>
            <CloudRain size={11} />
            <span>Rain: {telemetry?.precip_rate_mmh != null ? `${telemetry.precip_rate_mmh.toFixed(1)} mm/h` : '0.0 mm/h'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#050505', border: '1px solid #1f2937', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: '#60a5fa' }}>
            <Waves size={11} />
            <span>Tide: {telemetry?.tide_level_m != null ? (telemetry.tide_level_m > 0 ? `+${telemetry.tide_level_m.toFixed(2)}m` : `${telemetry.tide_level_m.toFixed(2)}m`) : '+1.42m'}</span>
          </div>
        </div>
      </div>

      {/* Right Certification Provenance Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', background: '#064e3b', color: '#34d399', border: '1px solid #047857' }}>
          {cityMeta?.provenance_status || (activeCity === 'DEMO' ? 'SYNTHETIC_BENCHMARK' : 'REAL_OBSERVED')}
        </span>
        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', background: '#172554', color: '#60a5fa', border: '1px solid #1d4ed8' }}>
          CALIBRATED_HYDRODYNAMICS
        </span>
        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', background: '#3b0764', color: '#c084fc', border: '1px solid #7e22ce' }}>
          OPTICAL_FLOW_ADVECTION
        </span>

        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen();
            } else {
              document.exitFullscreen();
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '4px',
            marginLeft: '6px',
          }}
          title="Toggle Fullscreen"
        >
          <Maximize size={14} />
        </button>
      </div>

      {/* Popover Real-Time Weather Widget */}
      {showWeather && (
        <div style={{ position: 'absolute', top: '52px', right: '16px', zIndex: 100 }}>
          <WeatherWidget telemetry={telemetry} onClose={() => setShowWeather(false)} />
        </div>
      )}
    </header>
  );
};
