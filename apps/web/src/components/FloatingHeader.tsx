import React, { useState } from 'react';
import { CityId, CityMetadata, LiveTelemetry, ScenarioMeta } from '../types';
import {
  MapPin,
  Radio,
  CloudRain,
  Waves,
  Maximize,
  Minimize,
  Thermometer,
  ShieldAlert,
  ChevronDown,
  Sparkles,
  Zap,
} from 'lucide-react';
import { WeatherWidget } from './WeatherWidget';

interface FloatingHeaderProps {
  activeCity: CityId;
  onCityChange: (city: CityId) => void;
  cityMeta: CityMetadata | null;
  scenarios: ScenarioMeta[];
  activeScenarioId: string;
  onScenarioChange: (id: string) => void;
  telemetry: LiveTelemetry | null;
}

export const FloatingHeader: React.FC<FloatingHeaderProps> = ({
  activeCity,
  onCityChange,
  cityMeta,
  scenarios,
  activeScenarioId,
  onScenarioChange,
  telemetry,
}) => {
  const [showWeather, setShowWeather] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const w = telemetry?.weather || {};
  const temp = w.temperature_c ?? telemetry?.temp_c ?? 28.5;

  return (
    <header
      style={{
        position: 'absolute',
        top: '14px',
        left: '14px',
        right: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'none',
        zIndex: 40,
      }}
    >
      {/* Left Capsule: Brand & City Switcher Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
        <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', padding: '4px 10px', gap: '8px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              color: '#fff',
              fontWeight: 900,
              fontSize: '11px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(2, 132, 199, 0.5)',
            }}
          >
            U
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={13} color="#38bdf8" />
            <select
              value={activeCity}
              onChange={(e) => onCityChange(e.target.value as CityId)}
              style={{
                background: 'transparent',
                color: '#f8fafc',
                border: 'none',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                outline: 'none',
                paddingRight: '4px',
              }}
            >
              <option value="MUMBAI" style={{ background: '#080d1a', color: '#f8fafc' }}>
                Mumbai MMR
              </option>
              <option value="VIJAYAWADA" style={{ background: '#080d1a', color: '#f8fafc' }}>
                Vijayawada Basin
              </option>
              <option value="DEMO" style={{ background: '#080d1a', color: '#f8fafc' }}>
                Pilot Benchmark
              </option>
            </select>
          </div>

          <span
            style={{
              fontSize: '8px',
              fontWeight: 800,
              padding: '2px 5px',
              borderRadius: '9999px',
              background: activeCity === 'DEMO' ? '#1e1b4b' : '#064e3b',
              color: activeCity === 'DEMO' ? '#c084fc' : '#34d399',
              border: activeCity === 'DEMO' ? '1px solid #7e22ce' : '1px solid #059669',
            }}
          >
            {activeCity === 'DEMO' ? 'SYNTHETIC' : 'OPERATIONAL'}
          </span>
        </div>

        {/* Center-Left Scenario Quick-Chips */}
        <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 6px' }}>
          {scenarios.map((sc) => {
            const isActive = activeScenarioId === sc.scenario_id;
            return (
              <button
                key={sc.scenario_id}
                onClick={() => onScenarioChange(sc.scenario_id)}
                className={`chip-btn ${isActive ? 'active' : ''}`}
                title={sc.display_name}
              >
                <span>{sc.scenario_id}</span>
                <span style={{ fontSize: '8px', opacity: isActive ? 1 : 0.7 }}>
                  {sc.rainfall_total_mm}mm
                </span>
              </button>
            );
          })}

          {/* Real-Time Live DWR Nowcast Chip */}
          <button
            onClick={() => onScenarioChange('REALTIME')}
            className={`chip-btn ${activeScenarioId === 'REALTIME' ? 'active' : ''}`}
            style={{
              borderColor: activeScenarioId === 'REALTIME' ? '#38bdf8' : 'rgba(56, 189, 248, 0.3)',
              background: activeScenarioId === 'REALTIME' ? 'linear-gradient(135deg, #0284c7, #0ea5e9)' : 'rgba(15, 23, 42, 0.75)',
            }}
            title="Real-Time Doppler Radar & Optical Flow Ingestion"
          >
            <Radio size={10} className="pulse" color={activeScenarioId === 'REALTIME' ? '#fff' : '#38bdf8'} />
            <span>REAL-TIME</span>
          </button>
        </div>
      </div>

      {/* Right Capsule: Live Weather & Satellite Pill, Provenance, Fullscreen */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto', position: 'relative' }}>
        {/* Weather Capsule */}
        <button
          onClick={() => setShowWeather(!showWeather)}
          className="glass-pill"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            color: '#f8fafc',
            cursor: 'pointer',
            border: showWeather ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
          }}
          title="Click to inspect real-time weather & satellite telemetry"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Thermometer size={12} color="#38bdf8" />
            <span style={{ fontSize: '11px', fontWeight: 800 }}>{temp.toFixed(1)}°C</span>
          </div>

          <span style={{ color: '#475569' }}>•</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CloudRain size={12} color="#34d399" />
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
              {telemetry?.precip_rate_mmh != null ? `${telemetry.precip_rate_mmh.toFixed(1)} mm/h` : '0.0 mm/h'}
            </span>
          </div>

          <span style={{ color: '#475569' }}>•</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Waves size={12} color="#60a5fa" />
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
              {telemetry?.tide_level_m != null ? (telemetry.tide_level_m > 0 ? `+${telemetry.tide_level_m.toFixed(1)}m` : `${telemetry.tide_level_m.toFixed(1)}m`) : '+1.4m'}
            </span>
          </div>

          <ChevronDown size={11} color="#94a3b8" />
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="glass-pill"
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 0,
          }}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
        </button>

        {/* Weather Popover */}
        {showWeather && (
          <div
            style={{
              position: 'absolute',
              top: '42px',
              right: '0px',
              zIndex: 60,
            }}
          >
            <WeatherWidget telemetry={telemetry} onClose={() => setShowWeather(false)} />
          </div>
        )}
      </div>
    </header>
  );
};
