# UFNS System Architecture Specification (v4.0.0)

**Project:** SIH26085 — Urban Flood Nowcasting System (Drainage and Rainfall Coupling)  
**Classification:** Operational Hydrological Decision Support Platform  
**Target Domains:** Mumbai Metropolitan Region (EPSG:32643), Vijayawada Basin (EPSG:32644), Synthetic Pilot (EPSG:32645)

---

## 1. Executive Summary & Design Principles

UFNS v4.0.0 employs a **polyglot high-performance architecture** specifically engineered to solve the dual challenges of heavy numerical hydrodynamic simulation and real-time streaming data ingestion:

1. **Heavy Computational Core in C++20 / OpenMP**: Evaluates 2D Saint-Venant shallow water equations and dynamic $A^*$ graph routing across 1.22 million grid cells in under 54 milliseconds (>22.5M cells/sec throughput).
2. **High-Concurrency Telemetry Ingestion in Go 1.22**: Handles continuous multi-source polling (IMD Doppler radar, NASA IMERG/SMAP, OpenWeather) and WebSocket frame broadcasts using lightweight goroutines.
3. **Model Orchestration & REST Gateway in Python (FastAPI)**: Manages inverse calibration (Nelder-Mead), Common Alerting Protocol (CAP v1.2) XML generation, and zero-copy C-ABI buffer exchange.
4. **Hardware-Accelerated Client-Side Visualization in React/Canvas**: Renders an AMOLED dark vector basemap, authenticated watermark-free CARTO tiles, and 60 FPS smooth 1-minute video playback with sub-frame keyframe interpolation.

---

## 2. Layered Architecture Diagram

```
+---------------------------------------------------------------------------------------------------+
|                                     UFNS v4.0.0 ARCHITECTURE                                      |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [ INGESTION & TELEMETRY LAYER — Go (Golang) Microservice ]                                       |
|  ├── IMD / RainViewer Doppler Radar (DWR) Reflectivity Ingestor                                   |
|  ├── NASA Earthdata (GPM IMERG 0.1° Precipitation + SMAP Soil Moisture)                           |
|  ├── OpenWeatherMap OneCall Live Telemetry Client                                                 |
|  ├── Gunnar-Farneback Dense Optical Flow Nowcasting Daemon                                        |
|  └── High-Throughput WebSocket Server (>50k concurrent client connections)                         |
|                                                                                                   |
|  [ PHYSICS & NUMERICAL SOLVER CORE — C++20 / OpenMP SIMD ]                                        |
|  ├── 2D Saint-Venant Shallow Water Equations (SWE) Finite-Volume Solver                            |
|  ├── Microtopographic Depression Storage & Inundation Accumulator                                 |
|  ├── 1D EPA-SWMM Drainage Conduit Surcharge & Manhole Overflow Coupler                            |
|  ├── Sub-Millisecond Flood-Aware A* Evacuation Router (D x V Passability)                         |
|  └── C-ABI Export Layer (`libufns_physics.dll` / `.so`)                                           |
|                                                                                                   |
|  [ ORCHESTRATION & REST API GATEWAY — Python 3.11 / FastAPI ]                                     |
|  ├── Zero-Copy C-ABI Pointer Bridge (`services/physics_bridge.py`)                                |
|  ├── Multi-City Dynamic Spatial Manager (Mumbai MMR, Vijayawada, Demo)                            |
|  ├── Nelder-Mead Inverse Parameter Calibration Engine (Manning's n, Blockage)                     |
|  ├── Common Alerting Protocol (CAP v1.2) Multi-Channel Broadcast Generator                        |
|  ├── Sponge City NbS Mitigation Simulator & Pareto Optimization Engine                            |
|  └── Versioned REST API (`/api/v1/*`)                                                             |
|                                                                                                   |
|  [ PRESENTATION & TACTICAL GIS LAYER — React 18 / TypeScript / Canvas 2D ]                        |
|  ├── Native Vector AMOLED Basemap (Zero Distortion in Metric UTM Space)                           |
|  ├── Authenticated CARTO Basemaps (Dark Matter & Voyager, Key cb1_2emq_...)                         |
|  ├── Smooth 60 FPS 1-Minute Fluid Video-Like Timeline Scrubber                                    |
|  ├── Zero-Stutter In-Memory Frame Pre-Buffering Engine (60m Horizon)                               |
|  ├── Separated Continuous Rainfall Heatmap & Doppler Radar Mosaic                                 |
|  └── Categorized Civic Infrastructure & Relief Shelter Monitoring                                 |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Mathematical & Numerical Formulation

### 3.1. 2D Shallow Water Equations (Overland Flow)
The surface inundation module solves the depth-averaged Saint-Venant equations with topographic friction:
$$\frac{\partial h}{\partial t} + \frac{\partial (hu)}{\partial x} + \frac{\partial (hv)}{\partial y} = R - I - Q_{drain}$$

Where:
- $h$: Surface water depth (m)
- $u, v$: Flow velocities in $x$ and $y$ directions (m/s)
- $R$: Radar/NWP precipitation forcing rate (m/s)
- $I$: Soil infiltration capacity via Green-Ampt / Horton formulation (m/s)
- $Q_{drain}$: 1D SWMM storm-drain inlet capture rate (m/s)

### 3.2. Vehicle Passability & Hazard Metric ($D \times V$)
Road segment passability is evaluated per minute using municipal standard B13 thresholds:
$$\text{Hazard Index} = h \times v$$
- **PASSABLE**: $h \le 0.15\text{ m}$ and $h \times v \le 0.35\text{ m}^2/\text{s}$
- **CAUTION**: $0.15\text{ m} < h \le 0.30\text{ m}$
- **IMPASSABLE**: $h > 0.30\text{ m}$ or $h \times v > 0.35\text{ m}^2/\text{s}$ (automatic emergency rerouting triggered)

---

## 4. Provenance & Multi-City Validation Matrix

| Parameter | Mumbai MMR | Vijayawada Basin | Synthetic Benchmark |
| :--- | :--- | :--- | :--- |
| **Terrain Source** | CartoDEM 30m Normalised | SRTM DEM 30m Hydro-enforced | Synthetic Inundation Basin |
| **Drainage Network** | 1,822 Junctions / 916 Conduits | 162 Junctions / 86 Conduits | 4 Junctions / 3 Conduits |
| **Road Infrastructure** | 2,000 Segments (OSM Audited) | 2,000 Segments (OSM Audited) | 85 Segments |
| **Nowcasting Feed** | Colaba S-Band DWR + OpenWeather | Machilipatnam DWR (MPT) | Synthetic Hyetograph Generator |
| **Tidal Boundary** | Apollo Bandar Tidal Surge Curve | N/A (Riverine Krishna Gauge) | Static Boundary |
