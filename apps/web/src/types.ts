export type CityId = 'MUMBAI' | 'VIJAYAWADA' | 'DEMO';

export interface CityMetadata {
  city_id: string;
  name: string;
  state: string;
  crs: string;
  utm_zone: string;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  dem_cells: [number, number]; // [height, width]
  resolution_m: number;
  drainage_junctions: number;
  drainage_conduits: number;
  road_nodes: number;
  road_edges: number;
  has_coastal_surge: boolean;
  has_riverine_flood: boolean;
  live_radar_station: string;
  provenance_status: string;
}

export interface ScenarioMeta {
  scenario_id: string;
  display_name: string;
  rainfall_profile_id: string;
  rainfall_total_mm: number;
  rainfall_status: string;
  drainage_condition: string;
  drainage_fingerprint: string;
  peak_depth_m: number;
  max_flooded_area_m2: number;
  mass_gate: string;
  scenario_fingerprint: string;
  dataset_status: string;
  d016_status: string;
  labels: string[];
}

export interface RoadSegment {
  road_id: string;
  name?: string;
  road_class?: string;
  length_m?: number;
  baseline_speed_kmh?: number;
  geometry: [number, number][]; // [[x, y], ...] in projected UTM metres
}

export interface RoadImpact {
  road_id: string;
  max_depth_m: number;
  classification: 'DRY' | 'LOW_IMPACT' | 'CAUTION' | 'HIGH_IMPACT' | 'IMPASSABLE';
  passability: 'PASSABLE' | 'IMPASSABLE';
  is_passable?: boolean;
  impacted_fraction?: number;
  effective_speed_kmh?: number;
}

export interface DrainagePoints {
  channels?: {
    channel_id?: string;
    waterway?: string;
    geometry: [number, number][];
  }[];
  inlets?: [number, number][];
  outfalls?: [number, number][];
  vent?: [number, number];
}

export interface CriticalAssetItem {
  asset_id: string;
  name: string;
  category: string;
  criticality_weight: number;
  critical_depth_m: number;
  failure_depth_m: number;
  service_population: number;
  grid_cell: [number, number];
  coordinates_utm: [number, number];
  connected_road_ids: string[];
  description: string;
  operational_status?: 'NORMAL' | 'ACCESS_IMPAIRED' | 'DIRECT_INUNDATION' | 'CRITICAL_FAILURE';
  site_depth_m?: number;
  access_road_depth_m?: number;
  priority_score?: number;
  recommended_action?: string;
}

export interface MetricsSummary {
  lead_minutes: number;
  rainfall_rate_mmh: number;
  peak_depth_m: number;
  flooded_area_m2: number;
  dry_roads_count: number;
  passable_roads_count: number;
  impassable_roads_count: number;
  surcharged_nodes_count: number;
  storage_volume_m3: number;
  outfall_q_m3s: number;
  active_model: string;
  dataset_source: string;
}

export interface RouteResponse {
  route_found: boolean;
  status?: string;
  mode?: string;
  total_distance_m: number;
  estimated_travel_time_min: number;
  max_encountered_depth_m: number;
  safety_status: string;
  policy_version?: string;
  baseline?: { distance_m: number; travel_time_min: number; max_depth_m: number };
  flood_aware?: { distance_m: number; travel_time_min: number; max_depth_m: number };
  difference?: { additional_distance_m: number; additional_travel_time_min: number };
  waypoints: [number, number][];
  segments: {
    road_id: string;
    name?: string;
    length_m: number;
    depth_m: number;
    passable: boolean;
    clearance_margin_m: number;
  }[];
  itinerary: string[];
  provenance_label: string;
}

export interface LiveTelemetry {
  active_city: string;
  radar_status: string;
  radar_station?: string;
  radar_frames_count?: number;
  precip_rate_mmh: number;
  precip_source?: string;
  temp_c?: number;
  humidity_pct?: number;
  condition?: string;
  wind_speed_kmh?: number;
  tide_level_m: number;
  tide_status?: string;
  river_discharge_m3s?: number;
  nwp_model?: string;
  last_updated?: string;
  weather?: {
    source?: string;
    status?: string;
    condition?: string;
    description?: string;
    icon?: string;
    temperature_c?: number;
    feels_like_c?: number;
    temp_min_c?: number;
    temp_max_c?: number;
    humidity_pct?: number;
    pressure_hpa?: number;
    wind_speed_kmh?: number;
    wind_deg?: number;
    rain_rate_mmh?: number;
    cloudiness_pct?: number;
    visibility_km?: number;
  };
  nasa_satellite?: {
    source?: string;
    status?: string;
    gpm_imerg_granule?: string;
    gpm_precip_rate_mmh?: number;
    smap_soil_moisture_m3m3?: number;
    smap_saturation_pct?: number;
  };
}

export interface LayerState {
  flood_2d: boolean;
  flood_1d: boolean;
  roads: boolean;
  passability: boolean;
  policyFilter: boolean;
  drainage: boolean;
  assets: boolean;
  tiles: boolean;
  elevation: boolean;
  rainfall: boolean;      // Continuous Rainfall Intensity Heatmap (mm/h)
  radar: boolean;         // Real-Time Doppler Weather Radar Mosaic & Stations
  vuln: boolean;
  sponge: boolean;
  risk: boolean;
}
