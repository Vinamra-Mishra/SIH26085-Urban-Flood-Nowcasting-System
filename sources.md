# 📚 Data Sources, APIs & Engineering Standards Registry

**Urban Flood Nowcasting System (UFNS)**  
*Comprehensive Documentation of All External Datasets, Live Environmental APIs, Satellite Basemaps, Topographic Models, and Engineering Specifications.*

---

## 📑 Table of Contents
1. [Live Doppler Radar (DWR) & Precipitation Nowcasting](#1-live-doppler-radar-dwr--precipitation-nowcasting)
2. [High-Resolution Satellite Basemaps & GIS Layers](#2-high-resolution-satellite-basemaps--gis-layers)
3. [Numerical Weather Prediction (NWP) & Multi-Model Ensembles](#3-numerical-weather-prediction-nwp--multi-model-ensembles)
4. [Digital Elevation Models (DEM) & Topography](#4-digital-elevation-models-dem--topography)
5. [Urban Road Networks & Infrastructure Routing](#5-urban-road-networks--infrastructure-routing)
6. [Stormwater Drainage, Catchbasins & Hydraulic Networks](#6-stormwater-drainage-catchbasins--hydraulic-networks)
7. [Hydrometric River Discharge & Coastal Tide Telemetry](#7-hydrometric-river-discharge--coastal-tide-telemetry)
8. [Critical Civic Infrastructure & Vulnerability Registries](#8-critical-civic-infrastructure--vulnerability-registries)
9. [IDF Rainfall Curves & Meteorological Design Standards](#9-idf-rainfall-curves--meteorological-design-standards)
10. [Standardized Emergency Alerting Protocols (CAP v1.2)](#10-standardized-emergency-alerting-protocols-cap-v12)
11. [Master API & Dataset Summary Table](#11-master-api--dataset-summary-table)

---

## 1. Live Doppler Radar (DWR) & Precipitation Nowcasting

### Primary Live Radar Feed: RainViewer Weather Radar Mosaic
* **Provider / Operator**: RainViewer (Aggregating national Doppler radar networks worldwide, including the India Meteorological Department - IMD).
* **Coverage**: Ingests ~1,200 global Doppler Weather Radars (DWR) — including IMD stations across Mumbai (Colaba & Veravali), Chennai, Machilipatnam, Kolkata, and Visakhapatnam.
* **Update Cadence**: 5–10 minute scans; delivers historical 2-hour radar loops and 30-minute extrapolated nowcasts.
* **Data Format**: Reflectivity ($Z$ in $\text{dBZ}$) raster XYZ PNG tiles (256×256 px).
* **API Endpoints**:
  * **Radar Index**: `https://api.rainviewer.com/public/weather-maps.json`
  * **XYZ Radar Tile URL**: `https://tilecache.rainviewer.com/v2/radar/{timestamp}/256/{z}/{x}/{y}/2/1_1.png`
* **Z-R Marshall-Palmer Relationship Applied**:
  $$Z = a \cdot R^b \quad \text{where } a = 200, \; b = 1.6 \implies R = \left(\frac{10^{\frac{Z}{10}}}{200}\right)^{\frac{1}{1.6}} \text{ (mm/h)}$$
* **Integration Module**: [`services/nowcast/advection.py`](file:///c:/Users/vkmuk/OneDrive/Documents/Project/SIH%202026/services/nowcast/advection.py), [`services/nowcast/providers/rainviewer.py`](file:///c:/Users/vkmuk/OneDrive/Documents/Project/SIH%202026/services/nowcast/providers/rainviewer.py).

---

## 2. High-Resolution Satellite Basemaps & GIS Layers

### A. Optical HD Aerial Satellite Imagery: Esri World Imagery
* **Provider**: Environmental Systems Research Institute (Esri) / ArcGIS Online.
* **Resolution**: Sub-meter (15 cm – 1 m in urban centres).
* **Tile Standard**: Spherical Web Mercator (`EPSG:3857`), 256×256 px tiles.
* **Endpoint URL**:
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
* **Licensing**: Free for non-commercial web maps and developer evaluation.

### B. High-Contrast Night Mode: CartoDB Dark Matter
* **Provider**: CARTO / OpenStreetMap contributors.
* **Endpoint URL**:
  `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png`
* **Purpose**: High-contrast dark vector/raster basemap optimized for rendering dynamic water depth heatmaps and flood hazard polygons.

---

## 3. Numerical Weather Prediction (NWP) & Multi-Model Ensembles

### Primary NWP Provider: Open-Meteo & NCMRWF Multi-Model Fusion
* **Operating Agency**: Open-Meteo API / NCMRWF / ECMWF / NOAA / DWD.
* **Models Ingested**:
  * **ECMWF IFS (9 km)**: European Centre for Medium-Range Weather Forecasts high-resolution global model.
  * **NOAA GFS (13 km)**: Global Forecast System (NCEP/NOAA).
  * **DWD ICON (7 km)**: German Weather Service non-hydrostatic global model.
  * **NCUM (NCMRWF Unified Model)**: Ministry of Earth Sciences (MoES), India.
* **Forecast Horizons**: 0–168 hours (hourly cadence).
* **Variables Extracted**: Total precipitation ($\text{mm}$), convective precipitation rate ($\text{mm/h}$), Convective Available Potential Energy (CAPE, $\text{J/kg}$), volumetric soil moisture ($0\text{–}7\text{ cm}$, $7\text{–}28\text{ cm}$), surface air temperature ($2\text{ m}$), wind speed and direction ($10\text{ m}$).
* **API Endpoints**:
  * **Deterministic Forecast**: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=precipitation,rain,showers,cape,soil_moisture_0_to_7cm`
  * **Ensemble Spread**: `https://ensemble-api.open-meteo.com/v1/ensemble?latitude={lat}&longitude={lon}&hourly=precipitation`
* **Integration Module**: [`services/nwp/engine.py`](file:///c:/Users/vkmuk/OneDrive/Documents/Project/SIH%202026/services/nwp/engine.py), [`apps/api/nwp_api.py`](file:///c:/Users/vkmuk/OneDrive/Documents/Project/SIH%202026/apps/api/nwp_api.py).

---

## 4. Digital Elevation Models (DEM) & Topography

### A. Copernicus GLO-30 Digital Surface Model
* **Provider**: European Space Agency (ESA) & European Union Copernicus Programme (Distributed via AWS Open Data Registry).
* **Spatial Resolution**: $30\text{ m}$ ($\approx 1\text{ arc-second}$) global coverage; vertical accuracy $< 2\text{ m}$ in urban terrain.
* **Vertical Datum**: EGM2008 Geoid.
* **Coordinate Systems**: Reprojected from `WGS84 (EPSG:4326)` into metric Universal Transverse Mercator:
  * **Mumbai**: `WGS 84 / UTM Zone 43N (EPSG:32643)`
  * **Vijayawada**: `WGS 84 / UTM Zone 44N (EPSG:32644)`
  * **Kolkata Pilot**: `WGS 84 / UTM Zone 45N (EPSG:32645)`

### B. ISRO CartoDEM (Cartosat-1 DSM)
* **Provider**: National Remote Sensing Centre (NRSC) / Indian Space Research Organisation (ISRO) via Bhuvan Geo-Portal.
* **Specifications**: High-resolution Indian regional terrain model derived from Cartosat-1 stereo-pairs ($10\text{ m} / 30\text{ m}$ resolution).
* **Application in UFNS**: Micro-topography flow routing, natural depression storage identification, and surface overland accumulation in the 2D Landlab solver.

---

## 5. Urban Road Networks & Infrastructure Routing

### Primary Network Source: OpenStreetMap (OSM) via Geofabrik & Overpass
* **Provider**: OpenStreetMap Contributors & Geofabrik Regional Extract Service.
* **Extraction Portal**: `https://download.geofabrik.de/asia/india.html` & `https://overpass-api.de/api/interpreter`
* **Extracted Schema & Attributes**:
  * Road classes: `motorway`, `trunk`, `primary`, `secondary`, `tertiary`, `residential`, `service`.
  * Physical parameters: Segment length ($\text{m}$), lane count, surface type, baseline design speed ($\text{km/h}$), bridge/tunnel flags.
  * Extent: **2,000+ real road segments for Mumbai**, **3,715 nodes for Vijayawada**.
* **Vehicle Inundation Safety Standards (IRC:SP:42 & NDMA Guidelines)**:
  * **Passable**: Depth $d < 0.15\text{ m}$ (Safe for low-clearance sedans and small vehicles).
  * **Cautionary**: $0.15\text{ m} \le d < 0.30\text{ m}$ (Passable only for high-clearance SUVs, buses, and heavy rescue vehicles).
  * **Impassable**: $d \ge 0.30\text{ m}$ (Submerged; engine stall, hydroplaning, and vehicle buoyancy risk).
* **Integration Module**: [`services/routing/engine.py`](file:///c:/Users/vkmuk/OneDrive/Documents/Project/SIH%202026/services/routing/engine.py), [`apps/api/routes_api.py`](file:///c:/Users/vkmuk/OneDrive/Documents/Project/SIH%202026/apps/api/routes_api.py).

---

## 6. Stormwater Drainage, Catchbasins & Hydraulic Networks

### Data Sources & Hydraulic Model Specifications
* **Geometry Sources**: Municipal Stormwater Management Department GIS layers + OSM stormwater node features (`manhole`, `inlet`, `drain`, `culvert`, `ditch`).
* **1D Pipe Network Solver**: **EPA-SWMM 5.2 (Storm Water Management Model)**.
  * Solves 1D Saint-Venant equations for dynamic pipe routing, pressurized surcharging, and culvert backwater effects.
* **2D Overland Flow Solver**: **Landlab 2D Dynamic Wave Hydrodynamic Solver**.
  * Solves 2D shallow water conservation equations across the raster elevation grid.
* **1D-2D Coupling Mechanism**:
  * Inflow capture: Orifice and weir rating equations mapping 2D surface overland head into 1D SWMM catchbasin nodes.
  * Drainage-to-Surface (D2S) Spill: When hydraulic grade line (HGL) exceeds manhole rim elevation, surcharged volume returns to 2D overland flow cells.

---

## 7. Hydrometric River Discharge & Coastal Tide Telemetry

### A. Coastal Tide Stations & Sea Surface Level
* **Providers**: 
  * **INCOIS (Indian National Centre for Ocean Information Services)** Tide Gauge Network.
  * **IOC (Intergovernmental Oceanographic Commission)** Sea Level Station Monitoring Facility (`http://www.ioc-sealevelmonitoring.org/`).
* **Active Tide Stations**:
  * **Mumbai**: Apollo Bunder (Gateway of India) & Princess Dock ($18.92^\circ\text{ N}, 72.84^\circ\text{ E}$).
  * **East Coast**: Machilipatnam / Visakhapatnam ($16.18^\circ\text{ N}, 81.14^\circ\text{ E}$).
* **Variables**: Astronomical tide height ($\text{m}$ CD/MSL), storm surge residual ($\text{m}$).

### B. Global Flood Awareness System (GloFAS) River Inflow
* **Provider**: Copernicus Emergency Management Service (Copernicus EMS / GloFAS) & Open-Meteo Flood API.
* **Endpoint URL**:
  `https://flood-api.open-meteo.com/v1/flood?latitude={lat}&longitude={lon}&daily=river_discharge,river_discharge_mean`
* **Variables**: Upstream river discharge ($Q\text{ in }\text{m}^3/\text{s}$), 10-year and 50-year return period exceedance probabilities.

---

## 8. Critical Civic Infrastructure & Vulnerability Registries

### Facility Data Registry: Municipal Corporation & OpenStreetMap Public Assets
* **Mumbai Municipal Facilities**:
  * **Hospitals**: KEM Hospital Parel, Sion Lokmanya Tilak Hospital, Bombay Hospital.
  * **Power Substations**: Dharavi 220kV Grid Hub, BKC 110kV Substation, Tata Power Trombay Receiving Station.
  * **Rail / Metro Termini**: CSMT (Chhatrapati Shivaji Maharaj Terminus), Dadar Western/Central Junction, Kurla Junction.
  * **Pumping Stations**: Love Grove Outfall Pumping Station (Worli), Cleveland Bunder Pumping Station.
  * **Emergency Response**: Byculla Mumbai Fire Brigade HQ, Bandra SDRF Rescue Depot.
* **Vijayawada Municipal Facilities**:
  * **Hospitals**: New Government General Hospital (GGH), Rainbow Emergency Care.
  * **Power Substations**: Gunadala 220kV Substation, Auto Nagar 132kV Feeder Hub.
  * **Hydraulic Control**: Prakasam Barrage Dam & Irrigation Control Room (Krishna River).
  * **Transit**: Vijayawada Junction (BZA) Central Station, Pandit Nehru Bus Station (PNBS).
  * **Disaster Response**: Auto Nagar Andhra Pradesh SDRF Logistics Station.
* **Vulnerability Framework**: Evaluates depth exposure, facility weight, access road passability, and generates prioritized emergency deployment queues.

---

## 9. IDF Rainfall Curves & Meteorological Design Standards

### Intensity-Duration-Frequency (IDF) Relationships
* **Sources**: 
  * Central Water Commission (CWC) Design Flood Estimation Manuals for Indian Catchments.
  * India Meteorological Department (IMD) Local IDF Curves (Sherly et al., 2015; Subbarayan et al., 2017).
* **General IDF Formulation**:
  $$I(t, T) = \frac{K \cdot T^m}{(t + b)^n}$$
  * Where $I = \text{Rainfall intensity (mm/h)}$, $T = \text{Return period (years)}$, $t = \text{Duration (hours)}$, and $K, m, b, n$ are catchment-specific empirical parameters.
* **Scenario Profiles Implemented**:
  * **S1 (Normal Rainfall)**: $20\text{ mm} / 3\text{h}$ ($\approx 1\text{-in-}1\text{ year}$ baseline).
  * **S2 (Heavy Rainfall)**: $45\text{ mm} / 3\text{h}$ ($\approx 1\text{-in-}5\text{ year}$ monsoon storm).
  * **S3 (Extreme Rainfall)**: $90\text{ mm} / 3\text{h}$ ($\approx 1\text{-in-}25\text{ year}$ cloudburst).
  * **S4 (Extreme Rainfall + Blocked Drainage)**: $90\text{ mm} / 3\text{h}$ with $50\%\text{–}100\%$ hydraulic blockage at critical culvert outfalls.

---

## 10. Standardized Emergency Alerting Protocols (CAP v1.2)

### Protocol Standard: OASIS Common Alerting Protocol (CAP) Version 1.2
* **Governing Body**: OASIS Emergency Management Technical Committee / ITU-T Recommendation X.1303.
* **National Implementation**: National Disaster Management Authority (NDMA) Sachet National Emergency Portal.
* **XML Namespace**: `urn:oasis:names:tc:emergency:cap:1.2`
* **Alert Classifications & Severity Matrix**:
  * `RED` — **EXTREME** ($d \ge 0.50\text{ m}$ or $\ge 3$ impassable arterial corridors): Emergency Inundation Warning.
  * `ORANGE` — **SEVERE** ($d \ge 0.30\text{ m}$ or $\ge 1$ impassable road): Urban Flood Warning.
  * `AMBER` — **MODERATE** ($d \ge 0.15\text{ m}$ or $\ge 2$ caution roads): Urban Flood Watch.
  * `GREEN` — **MINOR** ($d \ge 0.05\text{ m}$): Urban Ponding Advisory.
* **Integration Module**: [`services/alerting/screening.py`](file:///c:/Users/vkmuk/OneDrive/Documents/Project/SIH%202026/services/alerting/screening.py), [`apps/api/alerts_api.py`](file:///c:/Users/vkmuk/OneDrive/Documents/Project/SIH%202026/apps/api/alerts_api.py).

---

## 11. Master API & Dataset Summary Table

| Category | Source / Provider | Protocol / Format | Update Cadence | Key Parameters & Variables | Usage in UFNS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Doppler Radar** | RainViewer / IMD Network | REST / PNG XYZ Tiles | 5–10 min | Reflectivity ($Z$ in $\text{dBZ}$), timestamped loops | Optical flow advection & 0–30 min nowcasting |
| **Satellite Basemap** | Esri World Imagery | XYZ Web Mercator (`EPSG:3857`) | Continuous / Static | High-resolution aerial optical RGB rasters | Underlay map canvas for urban spatial context |
| **GIS Basemap** | CartoDB Dark Matter | XYZ Web Mercator (`EPSG:3857`) | Continuous / Static | High-contrast dark vector/raster tiles | Visualization of flood depths & risk contours |
| **NWP Ensembles** | Open-Meteo (ECMWF, GFS, ICON, NCUM) | REST / JSON | Hourly | Precipitation, Convective rain, CAPE, Soil moisture | Radar-NWP blending (Phase D) for 1–6h horizons |
| **DEM Elevation** | Copernicus GLO-30 / CartoDEM | Cloud-Optimized GeoTIFF | 30m grid | Metric surface elevation ($Z$ in metres, EGM2008) | 2D hydrodynamic flood wave solver (Landlab) |
| **Road Network** | OpenStreetMap / Geofabrik | OSM XML / GeoJSON | Daily / Static | Road hierarchy, lanes, speed, geometry | Flood passability rating & evacuation routing |
| **Drainage Network** | Municipal GIS & OSM Stormwater | SWMM `.inp` / GeoJSON | Static / Surveyed | Conduits, diameters, invert elevations, catchbasins | 1D pipe flow & manhole surcharge modeling |
| **Tide Telemetry** | INCOIS / IOC Sea Level Facility | REST / XML | 5–15 min | Water level ($\text{m}$ CD/MSL), tidal residuals | Coastal boundary conditions for outfall gates |
| **River Discharge** | Copernicus GloFAS / Open-Meteo Flood | REST / JSON | Daily / 6h | River discharge ($Q\text{ in }\text{m}^3/\text{s}$), return period | Fluvial upstream boundary conditions |
| **Critical Assets** | Municipal Corporation Facility Registry | GeoJSON / REST | Static / Surveyed | Hospitals, power substations, transit hubs, coords | Vulnerability scoring & priority rescue queue |
| **Standard Alerts** | OASIS CAP v1.2 / NDMA Sachet | XML / JSON | Event-driven | Severity, Urgency, Certainty, Geofence Polygon | Automated public & emergency responder alerts |

---

*Registry maintained by the Urban Flood Nowcasting System (UFNS) Core Architecture Team.*
