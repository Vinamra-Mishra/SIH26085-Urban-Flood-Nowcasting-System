# Urban Flood Nowcasting System (Drainage and Rainfall Coupling)

**Problem ID:** 26085  
**Category:** Software  
**Theme:** Disaster Management  
**Difficulty Rating:** 9.2 / 10 (Extreme / Expert Level)  
**Organization:** Ministry of Earth Sciences (MoES)  
**Department:** National Centre for Medium Range Weather Forecasting (NCMRWF)  
**Recommended Stack:** PyTorch / TensorFlow, GDAL / Rasterio, Xarray, NetCDF4 / cfgrib, GeoPandas, PostGIS, Landlab, PySWMM / EPA-SWMM, FastAPI, Leaflet / Mapbox  

---

## 1. Executive Summary & Problem Scope

Urban flooding in major Indian metros like Mumbai, Delhi, and Chennai has become an annual crisis. Traditional Numerical Weather Prediction (NWP) models fall short because knowing how much rain will fall does not automatically translate into knowing where the streets will flood. Urban flooding is a hyper-local phenomenon dictated by microtopography, concrete imperviousness, and heavily strained, invisible drainage networks. Currently, municipal bodies lack real-time, street-level predictive systems. Consequently, cities are caught off guard by rapid water accumulation, leading to severe traffic gridlocks, economic disruption, and loss of life.

The challenge is to design a high-resolution, real-time **Urban Flood Nowcasting System (0 - 3 hour lead time)** capable of predicting street-level inundation before it happens. Participants must move away from isolated weather models and instead build a coupled framework. This system must fuse real-time rainfall nowcasts with high-resolution Digital Elevation Models (DEM) and a graph-based mathematical model of the city’s underground drainage network. By mapping how water flows, accumulates, and surcharges across concrete surfaces and drainage nodes, the solution should pinpoint exactly which streets or intersections will flood.

---

## 2. Core Technical Architecture & Requirements

### A. High-Volume Meteorological Ingestion & Rainfall Nowcasting (0 - 3h Window)
- Ingest high-volume Doppler Weather Radar (DWR) data, satellite precipitation products (INSAT-3D/3DR, GPM IMERG), and gridded numerical weather prediction datasets (GRIB2, NetCDF4, HDF5).
- Ultra-low-latency extrapolation and advection nowcasting to generate 5–15 minute interval forward rainfall intensity fields.

### B. 2D Surface Hydrology & Overland Terrain Routing
- High-resolution Digital Elevation Model (DEM) ingestion, sink conditioning, and surface slope calculation.
- 2D 2-way hydrodynamic/diffusive wave overland routing capturing runoff generation, depression storage, and infiltration/imperviousness fractions.

### C. 1D Subsurface Drainage Network Modeling (Hydraulic Coupling)
- Represent the city's stormwater drain network as a directed graph (nodes as manholes/inlets, edges as pipes/canals).
- Hydrodynamic 1D conduit routing (Saint-Venant equations / EPA-SWMM).
- Dual-drainage bidirectional coupling: surface runoff interception at inlet nodes, hydraulic surcharge calculation, and street backflow emergence during network capacity exceedance.

### D. Street-Level Inundation Projection & Dynamic GIS Dashboard
- Real-time 0–3 hour forward-looking inundation hazard mapping with depth estimations (in centimeters).
- Interactive web-based GIS interface for municipal authorities, disaster managers, and citizens to visualize flooded road segments, surcharge nodes, and severity levels.

### E. Flood-Aware Emergency Routing & Alerting API
- Dynamic graph routing algorithm penalizing or blocking flooded road segments based on vehicle wading depths.
- Safe evacuation and alternative route calculation for emergency responders, transit, and commuters.
- Automated instant alert generation and exportable GeoJSON/CAP (Common Alerting Protocol) feeds.

---

## 3. Repository Architecture & Implementation Matrix

The repository implements a production-grade, modular, fully verified microservice & modular monolith architecture across 12 milestones (M1–M12):

1. **`services/rainfall/` & `services/nowcast/`**:
   - Ingestion pipelines for radar/satellite/NWP raster data.
   - Optical flow / persistence nowcasting engines generating spatio-temporal rainfall grids.
2. **`services/hydrology/` & `services/hydraulics/`**:
   - 2D surface terrain overland routing (Landlab diffusive / overland flow).
   - 1D storm drain network engine (PySWMM / EPA-SWMM integration) with node surcharge tracking.
3. **`services/simulation/` & `services/projection/`**:
   - Bidirectional overland-drainage coupling (`CoupledFloodModel`) conserving mass and momentum.
   - Fast forward projection engine (0–180 minutes).
4. **`services/routing/` & `services/alerting/`**:
   - Road network exposure mapping, depth thresholding, and flood-aware A* / Dijkstra shortest-path routing.
   - Dynamic threshold alerts, hazard categorization, and dispatch feeds.
5. **`apps/api/` & `apps/web/`**:
   - FastAPI REST API exposing `/api/v1/scenarios`, `/api/v1/projections`, `/api/v1/routing`, `/api/v1/alerts`, and real pilot metrics.
   - Interactive Leaflet-powered GIS dashboard with scenario playback, live projection slider, drainage graph inspector, and interactive flood routing.
