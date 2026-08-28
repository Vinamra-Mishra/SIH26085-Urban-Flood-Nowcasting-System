/**
 * Mathematical Coordinate Transformation & Projection Engine.
 * 
 * Supports:
 * 1. UTM (Zone 43N/44N/45N) <-> WGS84 Geodetic (Lon, Lat)
 * 2. WGS84 Geodetic <-> Web Mercator XYZ Map Tiles
 * 3. Projected Metres <-> Canvas Viewport Screen Pixels
 */

export interface GridMeta {
  origin_x: number;
  origin_y: number;
  width: number;
  height: number;
  cell_size_m: number;
  crs?: string;
}

export interface ViewTransform {
  panX: number;
  panY: number;
  zoom: number;
}

export function utmToLonLat(easting: number, northing: number, zone = 43, north = true): [number, number] {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const b = a * (1 - f);
  const e = Math.sqrt((a * a - b * b) / (a * a));
  const e0sq = (e * e) / (1 - e * e);
  const k0 = 0.9996;

  const x = easting - 500000.0;
  const y = north ? northing : northing - 10000000.0;

  const m = y / k0;
  const mu = m / (a * (1 - (e * e) / 4 - (3 * e ** 4) / 64 - (5 * e ** 6) / 256));

  const e1 = (1 - Math.sqrt(1 - e * e)) / (1 + Math.sqrt(1 - e * e));
  const j1 = (3 * e1) / 2 - (27 * e1 ** 3) / 32;
  const j2 = (21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32;
  const j3 = (151 * e1 ** 3) / 96;
  const j4 = (1097 * e1 ** 4) / 512;

  const fp = mu + j1 * Math.sin(2 * mu) + j2 * Math.sin(4 * mu) + j3 * Math.sin(6 * mu) + j4 * Math.sin(8 * mu);

  const c1 = e0sq * Math.cos(fp) ** 2;
  const t1 = Math.tan(fp) ** 2;
  const r1 = (a * (1 - e * e)) / Math.pow(1 - e * e * Math.sin(fp) ** 2, 1.5);
  const n1 = a / Math.sqrt(1 - e * e * Math.sin(fp) ** 2);

  const d = x / (n1 * k0);

  const q1 = (n1 * Math.tan(fp)) / r1;
  const q2 = (d * d) / 2;
  const q3 = ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * e0sq) * d ** 4) / 24;
  const q4 = ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * e0sq - 3 * c1 * c1) * d ** 6) / 720;
  const latRad = fp - q1 * (q2 - q3 + q4);

  const q5 = d;
  const q6 = ((1 + 2 * t1 + c1) * d ** 3) / 6;
  const q7 = ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * e0sq + 24 * t1 * t1) * d ** 5) / 120;
  const lonRad = (q5 - q6 + q7) / Math.cos(fp);

  const lonOrigin = (zone - 1) * 6 - 180 + 3;
  const lat = latRad * (180 / Math.PI);
  const lon = lonOrigin + lonRad * (180 / Math.PI);
  return [lon, lat];
}

export function lonLatToUtm(lon: number, lat: number, zone = 43): [number, number] {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const e = Math.sqrt(2 * f - f * f);
  const k0 = 0.9996;
  const lon0 = (zone - 1) * 6 - 180 + 3;
  const latRad = (lat * Math.PI) / 180;
  const lonRad = ((lon - lon0) * Math.PI) / 180;

  const n = a / Math.sqrt(1 - e * e * Math.sin(latRad) ** 2);
  const t = Math.tan(latRad) ** 2;
  const c = (e * e / (1 - e * e)) * Math.cos(latRad) ** 2;
  const a_term = Math.cos(latRad) * lonRad;

  const m = a * ((1 - (e * e) / 4 - (3 * e ** 4) / 64 - (5 * e ** 6) / 256) * latRad - ((3 * e * e) / 8 + (3 * e ** 4) / 32 + (45 * e ** 6) / 1024) * Math.sin(2 * latRad) + ((15 * e ** 4) / 256 + (45 * e ** 6) / 1024) * Math.sin(4 * latRad) - ((35 * e ** 6) / 3072) * Math.sin(6 * latRad));

  const easting = 500000 + k0 * n * (a_term + ((1 - t + c) * a_term ** 3) / 6 + ((5 - 18 * t + t * t + 72 * c - 58 * (e * e / (1 - e * e))) * a_term ** 5) / 120);
  const northing = k0 * (m + n * Math.tan(latRad) * ((a_term ** 2) / 2 + ((5 - t + 9 * c + 4 * c * c) * a_term ** 4) / 24 + ((61 - 58 * t + t * t + 600 * c - 330 * (e * e / (1 - e * e))) * a_term ** 6) / 720));
  return [easting, northing];
}

export function lonLatToTile(lon: number, lat: number, zoom: number): [number, number] {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));
  return [x, y];
}

export function tileToLonLat(x: number, y: number, zoom: number): [number, number] {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  const lon = (x / Math.pow(2, zoom)) * 360 - 180;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return [lon, lat];
}

export function worldToScreen(
  wx: number,
  wy: number,
  gm: GridMeta,
  transform: ViewTransform,
  canvasWidth: number,
  canvasHeight: number
): [number, number, number] {
  const ox = gm.origin_x || 0;
  const oy = gm.origin_y || 0;
  const gw = gm.width * (gm.cell_size_m || 30);
  const gh = gm.height * (gm.cell_size_m || 30);

  const scale = Math.min(canvasWidth / (gw || 1), canvasHeight / (gh || 1)) * transform.zoom;
  const cx = canvasWidth / 2 + transform.panX;
  const cy = canvasHeight / 2 + transform.panY;

  const sx = cx + (wx - (ox + gw / 2)) * scale;
  const sy = cy - (wy - (oy + gh / 2)) * scale; // Y inverted in screen space
  return [sx, sy, scale];
}

export function screenToWorld(
  sx: number,
  sy: number,
  gm: GridMeta,
  transform: ViewTransform,
  canvasWidth: number,
  canvasHeight: number
): [number, number] {
  const ox = gm.origin_x || 0;
  const oy = gm.origin_y || 0;
  const gw = gm.width * (gm.cell_size_m || 30);
  const gh = gm.height * (gm.cell_size_m || 30);

  const scale = Math.min(canvasWidth / (gw || 1), canvasHeight / (gh || 1)) * transform.zoom;
  const cx = canvasWidth / 2 + transform.panX;
  const cy = canvasHeight / 2 + transform.panY;

  const wx = (sx - cx) / scale + (ox + gw / 2);
  const wy = -(sy - cy) / scale + (oy + gh / 2);
  return [wx, wy];
}
