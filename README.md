# Urban Flood Nowcasting System (UFNS v4.0.0)

**SIH26085 — High-Resolution Urban Flood Nowcasting & Drainage Coupling**  
*Ministry of Earth Sciences (MoES) / National Centre for Medium Range Weather Forecasting (NCMRWF)*

[![Version](https://img.shields.io/badge/Release-v4.0.0-blue.svg)](https://github.com/Vinamra-Mishra/UFNS-V4/releases/tag/v4.0.0)
[![Engine](https://img.shields.io/badge/Physics_Engine-C%2B%2B20%20%2F%20OpenMP-orange.svg)](cpp_core/)
[![Streaming](https://img.shields.io/badge/Telemetry_Stream-Go%201.22%20Goroutines-cyan.svg)](services/go_stream/)
[![Basemap](https://img.shields.io/badge/Basemap-Native%20Vector%20AMOLED-success.svg)](apps/web/)
[![API](https://img.shields.io/badge/FastAPI-2.2.0-009688.svg)](apps/api/)

---

## 1. Overview

**UFNS** is an operational, high-performance decision support platform designed for high-resolution urban flood nowcasting. It dynamically couples:
1. **Real-Time Hydrometeorological Forcing**: Live Doppler Weather Radar (DWR) optical flow nowcasting, NASA Earthdata (GPM IMERG + SMAP), and OpenWeatherMap OneCall API streams.
2. **Coupled 1D/2D Hydrodynamic Physics**: 2D Saint-Venant shallow water equations with finite-volume topographic depression storage coupled to 1D EPA-SWMM drainage network surcharging and tidal backflow boundaries.
3. **Flood-Aware Evacuation Routing**: Sub-millisecond graph traversal evaluating road passability based on water depth ($h \le 0.15\text{ m}$) and velocity-depth hazard thresholds ($D \times V \le 0.35\text{ m}^2/\text{s}$).
4. **Interactive AMOLED Tactical GIS Interface**: 60 FPS client-side rendering with sub-frame 1-minute video interpolation, native vector AMOLED basemaps, authenticated CARTO Dark/Voyager tiles, and categorized civic infrastructure monitoring.

---

## 2. Polyglot System Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                 UFNS v4.0.0 HIGH-SPEED PIPELINE                                   |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [ LAYER 1: GO (Golang) — Real-Time Ingestion & Streaming Daemon ]                                |
|  • File: `services/go_stream/main.go`                                                             |
|  • Concurrently polls OpenWeatherMap, NASA IMERG/SMAP, and IMD DWR Doppler Radar mosaics.         |
|  • Computes Gunnar-Farneback optical flow advection vectors in Go.                                |
|  • High-throughput WebSocket/HTTP server broadcasting telemetry with sub-millisecond scheduling.  |
|                                                                                                   |
|  [ LAYER 2: C++20 / OpenMP — Ultra-Fast Physics & Hydrodynamic Solver Core ]                      |
|  • Files: `cpp_core/solver_2d.cpp`, `cpp_core/routing.cpp`, `cpp_core/physics_engine.cpp`           |
|  • Multi-threaded OpenMP finite-volume 2D shallow water PDE solver.                                |
|  • Evaluates 1.22M-cell depth matrix in <54 ms (>22.5M cells/second throughput).                 |
|  • Sub-millisecond A* emergency evacuation routing engine with D x V passability.                 |
|  • Exported via standard C-ABI (`libufns_physics.dll` / `.so`).                                   |
|                                                                                                   |
|  [ LAYER 3: PYTHON / FASTAPI — Model Orchestration & REST Gateway ]                              |
|  • Files: `apps/api/app.py`, `apps/api/impacts.py`, `services/physics_bridge.py`                 |
|  • Zero-copy C-ABI pointer bridge (`numpy.ctypeslib`) passing raster buffers directly.            |
|  • Handles Nelder-Mead inverse calibration, CAP v1.2 XML emergency alerts, and REST APIs.         |
|                                                                                                   |
|  [ LAYER 4: REACT 18 / TYPESCRIPT / CANVAS — Tactical GIS Dashboard ]                             |
|  • Files: `apps/web/src/App.tsx`, `apps/web/src/components/MapView.tsx`                           |
|  • Infinite-resolution UTM Vector AMOLED Basemap with anti-aliased shoreline glow.                |
|  • 60 FPS smooth 1-minute video playback with linear sub-frame keyframe interpolation.            |
|  • Zero-stutter RAM cache frame pre-buffering (60 minutes horizon).                              |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Deployment Domains & Real Datasets

| City Domain | Coordinate Reference System | Grid Matrix | Cell Resolution | Drainage Junctions | Road Segments | Key Hydrometeorological Sensors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Mumbai Metropolitan Region (MMR)** | `EPSG:32643` (UTM 43N) | $825 \times 1486$ ($1,225,950$ cells) | $30\text{ m}$ (CartoDEM) | 1,822 junctions, 916 conduits | 2,000 segments | Colaba S-band DWR, Apollo Bandar Tide Gauge |
| **Vijayawada Urban Area** | `EPSG:32644` (UTM 44N) | $606 \times 481$ ($291,486$ cells) | $30\text{ m}$ (SRTM DEM) | 162 junctions, 86 conduits | 2,000 segments | Machilipatnam DWR (MPT), Krishna River Gauge |
| **Synthetic Benchmark Pilot** | `EPSG:32645` (UTM 45N) | $134 \times 134$ ($17,956$ cells) | $30\text{ m}$ | 4 junctions, 3 conduits | 85 segments | Baseline verification test suite |

---

## 4. Key Platform Features

### 4.1. Ultra-High Performance Hydrodynamics Core
- **C++20 SIMD Solver**: Computes shallow water runoff accumulation and microtopographic depression ponding in **under 54 ms** for 1.22 million cells.
- **SWMM 1D Pipe Flow Coupling**: Simulates storm-drain conduit surcharging, manhole overflows, and coastal tide gate backpressure.

### 4.2. Doppler Radar & Ingestion Streaming (Go)
- **Multi-Source Ingestion**: Pulls live precipitation from RainViewer / IMD DWR Doppler radar, NASA GPM IMERG, and OpenWeatherMap OneCall.
- **Optical Flow Nowcaster**: Computes 0–30 minute storm velocity advection vectors with zero GC stutter.

### 4.3. Tactical AMOLED Dark GIS Interface
- **Native Vector AMOLED Basemap**: Renders directly in native UTM metric space ($1\text{m} = 1\text{m}$), eliminating Web Mercator distortion.
- **5 Basemap Styles**: `Vector AMOLED` (Default), `Dark Carto` (Authenticated, watermark-free), `Voyager` (Authenticated, high-contrast street), `Satellite` (Esri World Imagery), and `CAD Grid`.
- **Separated Layers**: Independent continuous rainfall intensity heatmap ($0 \to 100\text{ mm/h}$) and Doppler weather radar mosaic with range rings ($3\text{km}, 6\text{km}, 12\text{km}$) and rotating azimuth beam.

### 4.4. Fluid Video-Like Timeline Playback
- **Sub-Frame Linear Interpolation**: Blends 5-min/15-min model keyframes into continuous 1-minute steps at 60 FPS.
- **Zero-Stutter Pre-Buffering**: Pre-fetches upcoming 60-minute forecast frames into RAM in background batches.
- **Pulsing Red Sonar Loading Overlay**: Real-time concentric radar telemetry during city switching and simulation execution.

---

## 5. Quickstart & Installation

### Prerequisites
- **Python**: `>= 3.11`
- **Node.js**: `>= 18.0`
- **Go** (Optional for standalone streamer): `>= 1.22`
- **C++ Compiler** (Optional for native DLL build): MSVC, GCC, or Clang

### 1. Clone Repository & Setup Virtual Environment
```powershell
git clone https://github.com/Vinamra-Mishra/UFNS-V4.git
cd UFNS-V4

python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Build Frontend Dashboard
```powershell
cd apps\web
npm install
npm run build
cd ..
```

### 3. Launch Operational Server
```powershell
.\.venv\Scripts\uvicorn.exe apps.api.app:app --host 127.0.0.1 --port 8000
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser.

---

## 6. API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/version` | `GET` | API version, engine mode (`C++20` / `Vectorized SIMD`), and system health. |
| `/api/v1/city/active` | `GET` | Active city metadata, bounding box, DEM resolution, and sensor health. |
| `/api/v1/city/switch` | `POST` | Switch active city (`MUMBAI`, `VIJAYAWADA`, `DEMO`). |
| `/api/v1/scenarios` | `GET` | Available scenarios (`S1 Dry`, `S2 Mild`, `S3 Severe`, `S4 Cloudburst`). |
| `/api/v1/scenarios/{id}/frame?lead={min}` | `GET` | Depth raster, road impacts, and mass-conservation diagnostics ($0 \le \text{lead} \le 180$). |
| `/api/v1/nowcast/realtime/frame?lead={min}` | `GET` | Live radar-driven nowcast frame with optical flow advection. |
| `/api/v1/routing/calculate` | `POST` | Flood-aware $A^*$ routing with clearance and $D \times V$ passability evaluation. |
| `/api/v1/telemetry/live` | `GET` | Live Doppler radar, precipitation rate, tide level, and weather stats. |
| `/api/v1/alerts/generate` | `POST` | Common Alerting Protocol (CAP v1.2) XML/JSON emergency broadcast. |
| `/api/v1/mitigation/simulate` | `POST` | NbS sponge infrastructure retention basin sizing and benefit-cost ratio (BCR). |

---

## 7. Repositories & Remotes

- **Primary Release Repository**: [https://github.com/Vinamra-Mishra/UFNS-V4](https://github.com/Vinamra-Mishra/UFNS-V4)
- **Organization Repository**: [https://github.com/Vynex-Labs/SIH26085-Urban-Flood-Nowcasting-System](https://github.com/Vynex-Labs/SIH26085-Urban-Flood-Nowcasting-System)
- **Release Tag**: `v4.0.0`
