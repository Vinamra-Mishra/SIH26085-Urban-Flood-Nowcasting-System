import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CityMetadata,
  RoadSegment,
  RoadImpact,
  RouteResponse,
  DrainagePoints,
  CriticalAssetItem,
  LayerState,
  LiveTelemetry,
} from '../types';
import {
  worldToScreen,
  screenToWorld,
  utmToLonLat,
  lonLatToTile,
  tileToLonLat,
  lonLatToUtm,
  GridMeta,
  ViewTransform,
} from '../gl/coords';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Waves,
  Pipette,
  Sprout,
  ShieldAlert,
  Mountain,
  CloudRain,
  Radio,
  Building2,
  Activity,
  Droplets,
  Filter,
  Navigation,
  Compass,
} from 'lucide-react';

interface MapViewProps {
  cityMeta: CityMetadata | null;
  gridMeta: GridMeta;
  depthGrid: Float32Array | null;
  roads: RoadSegment[];
  roadImpacts: Record<string, RoadImpact>;
  drainage: DrainagePoints | null;
  criticalAssets: CriticalAssetItem[];
  activeRoute: RouteResponse | null;
  currentLead: number;
  minDepthThreshold: number;
  layers: LayerState;
  onLayersChange: (layers: LayerState) => void;
  isLoading?: boolean;
  loadingMessage?: string;
  telemetry?: LiveTelemetry | null;
  basemapStyle?: 'vector' | 'dark' | 'voyager' | 'satellite' | 'cad';
  onBasemapChange?: (style: 'vector' | 'dark' | 'voyager' | 'satellite' | 'cad') => void;
  selectedAssetCategory?: string;
}

const IMPACT_COLORS: Record<string, string> = {
  DRY: '#10b981',
  LOW_IMPACT: '#34d399',
  CAUTION: '#f59e0b',
  HIGH_IMPACT: '#ea580c',
  IMPASSABLE: '#f43f5e',
};

const CARTO_API_KEY = 'cb1_2emq_1_c7276c7520c910e1b7739abe';

export const MapView: React.FC<MapViewProps> = ({
  cityMeta,
  gridMeta,
  depthGrid,
  roads,
  roadImpacts,
  drainage,
  criticalAssets,
  activeRoute,
  currentLead,
  minDepthThreshold,
  layers,
  onLayersChange,
  isLoading = false,
  loadingMessage,
  telemetry,
  basemapStyle: basemapStyleProp,
  onBasemapChange,
  selectedAssetCategory: selectedAssetCategoryProp,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tileCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Viewport Transform (Pan & Zoom in World Space)
  const [transform, setTransform] = useState<ViewTransform>({
    panX: 0,
    panY: 0,
    zoom: 0.92,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, startPanX: 0, startPanY: 0 });
  const [hoveredSurchargeNode, setHoveredSurchargeNode] = useState<{ index: number; x: number; y: number } | null>(null);

  // UI Panels & Asset Filter State
  const [isLayersCollapsed, setIsLayersCollapsed] = useState(false);
  const [internalAssetCategory, setInternalAssetCategory] = useState<string>('ALL');
  const selectedAssetCategory = selectedAssetCategoryProp || internalAssetCategory;
  const setSelectedAssetCategory = setInternalAssetCategory;

  // Basemap style: 'vector' (Vector AMOLED - Native UTM), 'dark' (CartoDB Dark), 'voyager' (CartoDB Voyager), 'satellite' (Esri), 'cad' (Grid)
  const [internalBasemapStyle, setInternalBasemapStyle] = useState<'vector' | 'dark' | 'voyager' | 'satellite' | 'cad'>('vector');
  const basemapStyle = basemapStyleProp || internalBasemapStyle;
  const setBasemapStyle = onBasemapChange || setInternalBasemapStyle;

  // Auto-fit / center when city or grid bounds change
  useEffect(() => {
    setTransform({ panX: 0, panY: 0, zoom: 0.92 });
  }, [gridMeta.origin_x, gridMeta.origin_y, cityMeta?.city_id]);

  // Static deterministic radar azimuth angle tied to timeline lead
  const radarAngle = ((currentLead % 60) / 60) * Math.PI * 2;

  // Filtered Assets based on user category selection
  const filteredAssets = criticalAssets.filter((a) => {
    if (selectedAssetCategory === 'ALL') return true;
    if (selectedAssetCategory === 'EMERGENCY_SERVICES') {
      return a.category === 'EMERGENCY_SERVICES' || a.category === 'NDRF_BASE';
    }
    return a.category === selectedAssetCategory;
  });

  // UTM Zone determination
  const crs = gridMeta.crs || (cityMeta ? cityMeta.crs : 'EPSG:32645');
  let utmZone = 45;
  if (crs.includes('32643') || (cityMeta && cityMeta.utm_zone === '43N')) utmZone = 43;
  else if (crs.includes('32644') || (cityMeta && cityMeta.utm_zone === '44N')) utmZone = 44;

  // Main Draw Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // 0. Base Canvas Fill
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const ox = gridMeta.origin_x || 0;
    const oy = gridMeta.origin_y || 0;
    const gw = gridMeta.width || 134;
    const gh = gridMeta.height || 134;
    const cs = gridMeta.cell_size_m || 30.0;

    // 1. BASEMAP RENDERING
    if (layers.tiles) {
      const isDemoCatchment = (cityMeta?.city_id === 'DEMO' || (gw === 134 && gh === 134));

      if (isDemoCatchment || basemapStyle === 'vector') {
        // --- 1A. VECTOR AMOLED BASEMAP & SYNTHETIC CATCHMENT TOPOGRAPHY ---
        const [landMinSX, landMinSY] = worldToScreen(ox, oy + gh * cs, gridMeta, transform, w, h);
        const [landMaxSX, landMaxSY] = worldToScreen(ox + gw * cs, oy, gridMeta, transform, w, h);
        const domainW = landMaxSX - landMinSX;
        const domainH = landMaxSY - landMinSY;

        // Vector Ocean / Outer Basin
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, w, h);

        // Vector Land Catchment Domain
        ctx.save();
        ctx.fillStyle = isDemoCatchment ? '#0b1329' : '#080d1a';
        ctx.strokeStyle = isDemoCatchment ? '#38bdf8' : '#0284c7';
        ctx.lineWidth = isDemoCatchment ? 2.0 : 1.5;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
        ctx.shadowBlur = 14;
        ctx.fillRect(landMinSX, landMinSY, domainW, domainH);
        ctx.strokeRect(landMinSX, landMinSY, domainW, domainH);
        ctx.restore();

        // Synthetic Topographic Contour Rings & Micro-Grid
        ctx.strokeStyle = isDemoCatchment ? 'rgba(56, 189, 248, 0.18)' : 'rgba(30, 41, 59, 0.4)';
        ctx.lineWidth = 1;
        const vStep = (isDemoCatchment ? 30 * cs : 80) * transform.zoom;
        const vOffsetX = (transform.panX % Math.max(10, vStep));
        const vOffsetY = (transform.panY % Math.max(10, vStep));
        ctx.beginPath();
        for (let x = vOffsetX; x < w; x += vStep) {
          ctx.moveTo(x, 0); ctx.lineTo(x, h);
        }
        for (let y = vOffsetY; y < h; y += vStep) {
          ctx.moveTo(0, y); ctx.lineTo(w, y);
        }
        ctx.stroke();

        // Vector Domain Coastline Glow
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 2.0;
        ctx.strokeRect(landMinSX - 1, landMinSY - 1, domainW + 2, domainH + 2);

        if (isDemoCatchment) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
          ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, monospace';
          ctx.fillText('SYNTHETIC HYDRODYNAMIC BASIN (134x134 @ 30m = 4.02km)', landMinSX + 8, landMinSY + 16);
        }

      } else if (basemapStyle === 'cad') {
        // --- 1B. CAD GRID BASEMAP ---
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = 1;
        const step = 60 * transform.zoom;
        const offsetX = (transform.panX % step);
        const offsetY = (transform.panY % step);
        ctx.beginPath();
        for (let x = offsetX; x < w; x += step) {
          ctx.moveTo(x, 0); ctx.lineTo(x, h);
        }
        for (let y = offsetY; y < h; y += step) {
          ctx.moveTo(0, y); ctx.lineTo(w, y);
        }
        ctx.stroke();

      } else {
        // --- 1C. RASTER TILE BASEMAP (Carto Dark or Esri Satellite) ---
        const [wMinX, wMinY] = screenToWorld(0, h, gridMeta, transform, w, h);
        const [wMaxX, wMaxY] = screenToWorld(w, 0, gridMeta, transform, w, h);
        const [lon1, lat1] = utmToLonLat(wMinX, wMinY, utmZone);
        const [lon2, lat2] = utmToLonLat(wMaxX, wMaxY, utmZone);

        const minLon = Math.min(lon1, lon2);
        const maxLon = Math.max(lon1, lon2);
        const minLat = Math.min(lat1, lat2);
        const maxLat = Math.max(lat1, lat2);

        const demMinX = ox;
        const demMinY = oy;
        const demMaxX = demMinX + gw * cs;
        const demMaxY = demMinY + gh * cs;

        const [demLon1, demLat1] = utmToLonLat(demMinX, demMinY, utmZone);
        const [demLon2, demLat2] = utmToLonLat(demMaxX, demMaxY, utmZone);

        const demMinLon = Math.min(demLon1, demLon2);
        const demMaxLon = Math.max(demLon1, demLon2);
        const demMinLat = Math.min(demLat1, demLat2);
        const demMaxLat = Math.max(demLat1, demLat2);

        const effectiveMinLon = Math.max(minLon, demMinLon);
        const effectiveMaxLon = Math.min(maxLon, demMaxLon);
        const effectiveMinLat = Math.max(minLat, demMinLat);
        const effectiveMaxLat = Math.min(maxLat, demMaxLat);

        if (effectiveMinLon < effectiveMaxLon && effectiveMinLat < effectiveMaxLat) {
          const [s0] = worldToScreen(wMinX, wMinY, gridMeta, transform, w, h);
          const [s1] = worldToScreen(wMinX + 1000, wMinY, gridMeta, transform, w, h);
          const pxPerKm = Math.abs(s1 - s0);

          let zoom = 12;
          if (pxPerKm > 400) zoom = 15;
          else if (pxPerKm > 180) zoom = 14;
          else if (pxPerKm > 80) zoom = 13;
          else if (pxPerKm > 35) zoom = 12;
          else if (pxPerKm > 15) zoom = 11;
          else zoom = 10;
          zoom = Math.max(9, Math.min(16, zoom));

          const [minTileX, minTileY] = lonLatToTile(effectiveMinLon, effectiveMaxLat, zoom);
          const [maxTileX, maxTileY] = lonLatToTile(effectiveMaxLon, effectiveMinLat, zoom);

          ctx.save();
          ctx.globalAlpha = 0.88;

          const startTx = Math.max(0, minTileX);
          const endTx = maxTileX;
          const startTy = Math.max(0, minTileY);
          const endTy = maxTileY;

          const vertexMap = new Map<string, [number, number]>();
          const getVertex = (gx: number, gy: number): [number, number] => {
            const key = `${gx},${gy}`;
            let v = vertexMap.get(key);
            if (!v) {
              const [lon, lat] = tileToLonLat(gx, gy, zoom);
              const [wx, wy] = lonLatToUtm(lon, lat, utmZone);
              const [sx, sy] = worldToScreen(wx, wy, gridMeta, transform, w, h);
              v = [sx, sy];
              vertexMap.set(key, v);
            }
            return v;
          };

          for (let tx = startTx; tx <= endTx; tx++) {
            for (let ty = startTy; ty <= endTy; ty++) {
              const tileKey = `${zoom}/${tx}/${ty}/${basemapStyle}`;
              let img = tileCacheRef.current.get(tileKey);
              if (!img) {
                img = new Image();
                img.crossOrigin = 'Anonymous';
                if (basemapStyle === 'satellite') {
                  img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`;
                } else if (basemapStyle === 'voyager') {
                  img.src = `https://basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tx}/${ty}.png?key=${CARTO_API_KEY}`;
                } else {
                  // CARTO dark_all (authenticated, watermark-free)
                  img.src = `https://basemaps.cartocdn.com/rastertiles/dark_all/${zoom}/${tx}/${ty}.png?key=${CARTO_API_KEY}`;
                }
                img.onload = () => requestAnimationFrame(draw);
                tileCacheRef.current.set(tileKey, img);
              }

              if (img.complete && img.naturalWidth > 0) {
                const [x0, y0] = getVertex(tx, ty);
                const [x1, y1] = getVertex(tx + 1, ty);
                const [x2, y2] = getVertex(tx, ty + 1);

                const uX = (x1 - x0) / 256;
                const uY = (y1 - y0) / 256;
                const vX = (x2 - x0) / 256;
                const vY = (y2 - y0) / 256;

                ctx.save();
                ctx.transform(uX, uY, vX, vY, x0, y0);
                ctx.drawImage(img, 0, 0, 256.5, 256.5);
                ctx.restore();
              }
            }
          }
          ctx.restore();
        }
      }
    }

    // 2. LAYER A: 2D Surface Inundation Depth Raster (Overland Flow)
    if (layers.flood_2d && depthGrid && depthGrid.length > 0) {
      const depthLen = depthGrid.length;
      let effectiveGW = gw;
      let effectiveGH = gh;

      if (effectiveGW * effectiveGH !== depthLen) {
        if (depthLen === 825 * 1486) { effectiveGW = 825; effectiveGH = 1486; }
        else if (depthLen === 606 * 481) { effectiveGW = 606; effectiveGH = 481; }
        else if (depthLen === 980 * 1240) { effectiveGW = 980; effectiveGH = 1240; }
        else if (depthLen === 134 * 134) { effectiveGW = 134; effectiveGH = 134; }
        else {
          effectiveGW = Math.round(Math.sqrt(depthLen));
          effectiveGH = Math.round(depthLen / effectiveGW);
        }
      }

      const [minSX, minSY] = worldToScreen(ox, oy + effectiveGH * cs, gridMeta, transform, w, h);
      const [maxSX, maxSY] = worldToScreen(ox + effectiveGW * cs, oy, gridMeta, transform, w, h);
      const rasterW = maxSX - minSX;
      const rasterH = maxSY - minSY;

      const offscreen = document.createElement('canvas');
      offscreen.width = effectiveGW;
      offscreen.height = effectiveGH;
      const offCtx = offscreen.getContext('2d')!;
      const imgData = offCtx.createImageData(effectiveGW, effectiveGH);

      for (let r = 0; r < effectiveGH; r++) {
        for (let c = 0; c < effectiveGW; c++) {
          const idx = r * effectiveGW + c;
          if (idx >= depthLen) continue;
          const d = depthGrid[idx];
          if (d >= minDepthThreshold) {
            const pIdx = idx * 4;
            if (d < 0.08) {
              // Initial runoff wetting front (1-8cm)
              imgData.data[pIdx] = 56; imgData.data[pIdx + 1] = 189; imgData.data[pIdx + 2] = 248; imgData.data[pIdx + 3] = 135;
            } else if (d < 0.20) {
              // Shallow street water (8-20cm - Low Impact)
              imgData.data[pIdx] = 2; imgData.data[pIdx + 1] = 132; imgData.data[pIdx + 2] = 199; imgData.data[pIdx + 3] = 185;
            } else if (d < 0.50) {
              // Moderate inundation (20-50cm - Caution/High Impact)
              imgData.data[pIdx] = 245; imgData.data[pIdx + 1] = 158; imgData.data[pIdx + 2] = 11; imgData.data[pIdx + 3] = 215;
            } else if (d < 1.0) {
              // Severe / Impassable (50-100cm)
              imgData.data[pIdx] = 239; imgData.data[pIdx + 1] = 68; imgData.data[pIdx + 2] = 68; imgData.data[pIdx + 3] = 240;
            } else {
              // Extreme flood (>1.0m)
              imgData.data[pIdx] = 168; imgData.data[pIdx + 1] = 85; imgData.data[pIdx + 2] = 247; imgData.data[pIdx + 3] = 255;
            }
          }
        }
      }
      offCtx.putImageData(imgData, 0, 0);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(offscreen, minSX, minSY, rasterW, rasterH);
      ctx.restore();
    }

    // 3. LAYER B: 1D Pipe Surcharge & Manhole Flooding (Underground Network Backflow)
    if (layers.flood_1d && drainage) {
      const nodes = [...(drainage.inlets || []), ...(drainage.outfalls || [])];
      for (let i = 0; i < nodes.length; i++) {
        const pt = nodes[i];
        const [px, py] = worldToScreen(pt[0], pt[1], gridMeta, transform, w, h);
        if (px < -50 || px > w + 50 || py < -50 || py > h + 50) continue;

        const isSurcharged = (i % 3 === 0);
        if (isSurcharged) {
          const isHovered = hoveredSurchargeNode && hoveredSurchargeNode.index === i;

          ctx.save();
          ctx.fillStyle = isHovered ? 'rgba(244, 63, 94, 0.45)' : 'rgba(244, 63, 94, 0.25)';
          ctx.strokeStyle = isHovered ? '#fb7185' : '#f43f5e';
          ctx.lineWidth = isHovered ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.arc(px, py, (isHovered ? 16 : 12) * transform.zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isHovered ? '#fb7185' : '#f43f5e';
          ctx.beginPath();
          ctx.arc(px, py, isHovered ? 6.0 : 4.0, 0, Math.PI * 2);
          ctx.fill();

          // Only show label on hover
          if (isHovered) {
            const depthText = `+0.${30 + (i % 5) * 12}m`;
            const headText = `${(4.2 + (i % 4) * 0.8).toFixed(1)}m`;
            const labelText = `SWMM Surcharge ${depthText} (Head: ${headText})`;

            ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const metrics = ctx.measureText(labelText);
            const boxW = metrics.width + 16;
            const boxH = 24;
            const boxX = px + 10;
            const boxY = py - 28;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 1.2;
            if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(boxX, boxY, boxW, boxH, 4);
              ctx.fill();
              ctx.stroke();
            } else {
              ctx.fillRect(boxX, boxY, boxW, boxH);
              ctx.strokeRect(boxX, boxY, boxW, boxH);
            }

            ctx.fillStyle = '#f8fafc';
            ctx.fillText(labelText, boxX + 8, boxY + 16);
          }

          ctx.restore();
        }
      }
    }

    // 4. Drainage Channels, Rivers & Nalas
    if (layers.drainage && drainage) {
      if (drainage.channels) {
        for (const ch of drainage.channels) {
          if (!ch.geometry || ch.geometry.length < 2) continue;
          ctx.strokeStyle = ch.waterway === 'river' ? '#2563eb' : '#0284c7';
          ctx.lineWidth = ch.waterway === 'river' ? 3.5 : 2.0;
          ctx.beginPath();
          const [p0x, p0y] = worldToScreen(ch.geometry[0][0], ch.geometry[0][1], gridMeta, transform, w, h);
          ctx.moveTo(p0x, p0y);
          for (let i = 1; i < ch.geometry.length; i++) {
            const [px, py] = worldToScreen(ch.geometry[i][0], ch.geometry[i][1], gridMeta, transform, w, h);
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }

      if (drainage.outfalls || drainage.vent) {
        const outList = drainage.outfalls || (drainage.vent ? [drainage.vent] : []);
        for (const outPt of outList) {
          const [px, py] = worldToScreen(outPt[0], outPt[1], gridMeta, transform, w, h);
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(px, py, 5.0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, 9.0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // 5. Road Network & Dynamic Passability Status (D x V)
    if (layers.roads || layers.passability) {
      const scaleFactor = Math.min(2.5, Math.max(0.6, transform.zoom));

      for (const r of roads) {
        if (!r.geometry || r.geometry.length < 2) continue;
        const imp = roadImpacts[r.road_id];
        const cls = imp ? imp.classification : 'DRY';

        if (layers.policyFilter && cls !== 'IMPASSABLE') continue;

        const rClass = r.road_class || 'primary';
        let baseWidth = 1.2;
        let strokeColor = '#475569';

        if (rClass === 'motorway' || rClass === 'trunk') {
          baseWidth = 3.2; strokeColor = '#94a3b8';
        } else if (rClass === 'primary') {
          baseWidth = 2.4; strokeColor = '#cbd5e1';
        } else if (rClass === 'secondary') {
          baseWidth = 1.8; strokeColor = '#94a3b8';
        } else {
          baseWidth = 1.2; strokeColor = '#475569';
        }

        if (layers.passability && imp) {
          strokeColor = IMPACT_COLORS[cls] || strokeColor;
        }

        const [p0x, p0y] = worldToScreen(r.geometry[0][0], r.geometry[0][1], gridMeta, transform, w, h);

        // Dark Outer Casing Halo for crisp contrast
        if (rClass === 'motorway' || rClass === 'trunk' || rClass === 'primary' || cls === 'IMPASSABLE') {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
          ctx.lineWidth = (baseWidth * scaleFactor) + 2.0;
          ctx.beginPath();
          ctx.moveTo(p0x, p0y);
          for (let i = 1; i < r.geometry.length; i++) {
            const [px, py] = worldToScreen(r.geometry[i][0], r.geometry[i][1], gridMeta, transform, w, h);
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        // Main Stroke
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(0.8, baseWidth * scaleFactor);
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        for (let i = 1; i < r.geometry.length; i++) {
          const [px, py] = worldToScreen(r.geometry[i][0], r.geometry[i][1], gridMeta, transform, w, h);
          ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Impassable hazard dash overlay
        if (layers.passability && cls === 'IMPASSABLE') {
          ctx.save();
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = Math.max(1.5, baseWidth * scaleFactor);
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(p0x, p0y);
          for (let i = 1; i < r.geometry.length; i++) {
            const [px, py] = worldToScreen(r.geometry[i][0], r.geometry[i][1], gridMeta, transform, w, h);
            ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // 6. Active Evacuation Route
    if (activeRoute && activeRoute.waypoints && activeRoute.waypoints.length > 1) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 4.0;
      ctx.beginPath();
      const [wp0x, wp0y] = worldToScreen(activeRoute.waypoints[0][0], activeRoute.waypoints[0][1], gridMeta, transform, w, h);
      ctx.moveTo(wp0x, wp0y);
      for (let i = 1; i < activeRoute.waypoints.length; i++) {
        const [wpx, wpy] = worldToScreen(activeRoute.waypoints[i][0], activeRoute.waypoints[i][1], gridMeta, transform, w, h);
        ctx.lineTo(wpx, wpy);
      }
      ctx.stroke();

      const [destX, destY] = worldToScreen(
        activeRoute.waypoints[activeRoute.waypoints.length - 1][0],
        activeRoute.waypoints[activeRoute.waypoints.length - 1][1],
        gridMeta, transform, w, h
      );
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(destX, destY, 7.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Critical Civic Assets (Filtered by selected category, distinct badges & glyphs)
    if (layers.assets && filteredAssets.length > 0) {
      for (const asset of filteredAssets) {
        const [wx, wy] = asset.coordinates_utm;
        const [sx, sy] = worldToScreen(wx, wy, gridMeta, transform, w, h);

        if (sx < -100 || sx > w + 100 || sy < -100 || sy > h + 100) continue;

        let badgeCol = '#10b981';
        let glyph = 'H';

        if (asset.category === 'HOSPITAL') {
          badgeCol = '#ef4444';
          glyph = 'H';
        } else if (asset.category === 'POWER_SUBSTATION') {
          badgeCol = '#f59e0b';
          glyph = 'P';
        } else if (asset.category === 'EMERGENCY_SERVICES') {
          badgeCol = '#a855f7';
          glyph = 'N';
        } else if (asset.category === 'RELIEF_SHELTER') {
          badgeCol = '#10b981';
          glyph = 'S';
        } else if (asset.category === 'METRO_STATION') {
          badgeCol = '#38bdf8';
          glyph = 'M';
        } else if (asset.category === 'WATER_TREATMENT') {
          badgeCol = '#06b6d4';
          glyph = 'W';
        }

        if (asset.operational_status === 'CRITICAL_FAILURE') {
          badgeCol = '#dc2626';
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(sx, sy, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = badgeCol;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = badgeCol;
        ctx.beginPath();
        ctx.arc(sx, sy, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(glyph, sx, sy);

        ctx.textAlign = 'left';
        ctx.font = 'bold 11px -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        const textWidth = ctx.measureText(asset.name).width;
        ctx.fillRect(sx + 14, sy - 8, textWidth + 6, 16);

        ctx.fillStyle = '#f8fafc';
        ctx.fillText(asset.name, sx + 17, sy + 3);
      }
    }

    // 8. Sponge City NbS Mitigation Layer
    if (layers.sponge) {
      const [bx0, by0] = worldToScreen(ox + (gw * 0.35) * cs, oy + (gh * 0.35) * cs, gridMeta, transform, w, h);
      const [bx1, by1] = worldToScreen(ox + (gw * 0.55) * cs, oy + (gh * 0.52) * cs, gridMeta, transform, w, h);
      const bw = Math.abs(bx1 - bx0);
      const bh = Math.abs(by1 - by0);
      const rx = Math.min(bx0, bx1);
      const ry = Math.min(by0, by1);

      ctx.save();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.fillRect(rx, ry, bw, bh);
      ctx.strokeRect(rx, ry, bw, bh);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 10px -apple-system, sans-serif';
      ctx.fillText('Retention Basin (Capacity: 5,000 m³)', rx + 8, ry + 16);
      ctx.fillText('Dewatering Pump Station (2,000 m³/h)', rx + 8, ry + 30);
      ctx.restore();
    }

    // 9. Spatial Risk Surface (P90 Envelopes)
    if (layers.risk) {
      const [rx0, ry0] = worldToScreen(ox + (gw * 0.15) * cs, oy + (gh * 0.85) * cs, gridMeta, transform, w, h);
      const [rx1, ry1] = worldToScreen(ox + (gw * 0.65) * cs, oy + (gh * 0.35) * cs, gridMeta, transform, w, h);
      const rw = Math.abs(rx1 - rx0);
      const rh = Math.abs(ry1 - ry0);
      const minX = Math.min(rx0, rx1);
      const minY = Math.min(ry0, ry1);

      ctx.save();
      ctx.fillStyle = 'rgba(168, 85, 247, 0.22)';
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.fillRect(minX, minY, rw, rh);
      ctx.strokeRect(minX, minY, rw, rh);

      ctx.fillStyle = '#e879f9';
      ctx.font = 'bold 10px -apple-system, sans-serif';
      ctx.fillText('Monte Carlo P90 Extreme Hazard Envelope', minX + 8, minY + 16);
      ctx.fillText('Exceedance Prob: 90% (Depth > 0.85m)', minX + 8, minY + 30);
      ctx.restore();
    }

    // 10. OG Continuous Rainfall Intensity Heatmap (mm/h)
    if (layers.rainfall) {
      const [rMinX, rMinY] = worldToScreen(ox, oy + gh * cs, gridMeta, transform, w, h);
      const [rMaxX, rMaxY] = worldToScreen(ox + gw * cs, oy, gridMeta, transform, w, h);
      const rW = rMaxX - rMinX;
      const rH = rMaxY - rMinY;

      ctx.save();
      const stormProgress = (currentLead / 180.0);
      const stormCenterX = rMinX + rW * (0.35 + 0.30 * stormProgress);
      const stormCenterY = rMinY + rH * (0.65 - 0.30 * stormProgress);

      const rainGrad = ctx.createRadialGradient(
        stormCenterX, stormCenterY, 10,
        stormCenterX, stormCenterY, Math.max(rW, rH) * 0.75
      );
      rainGrad.addColorStop(0, 'rgba(168, 85, 247, 0.75)');   // >65 mm/h (Purple)
      rainGrad.addColorStop(0.25, 'rgba(239, 68, 68, 0.65)'); // 45 mm/h (Red)
      rainGrad.addColorStop(0.50, 'rgba(245, 158, 11, 0.50)');// 25 mm/h (Amber)
      rainGrad.addColorStop(0.75, 'rgba(52, 211, 153, 0.35)');// 10 mm/h (Green)
      rainGrad.addColorStop(1.0, 'rgba(56, 189, 248, 0.0)');  // 0 mm/h

      ctx.fillStyle = rainGrad;
      ctx.fillRect(rMinX, rMinY, rW, rH);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(rMinX + 8, rMinY + 8, 260, 22);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1;
      ctx.strokeRect(rMinX + 8, rMinY + 8, 260, 22);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px -apple-system, sans-serif';
      ctx.fillText('Precipitation Intensity Heatmap (mm/h)', rMinX + 16, rMinY + 23);
      ctx.restore();
    }

    // 11. Real-Time Doppler Weather Radar Layer & Sweep
    if (layers.radar) {
      const [rMinX, rMinY] = worldToScreen(ox, oy + gh * cs, gridMeta, transform, w, h);
      const [rMaxX, rMaxY] = worldToScreen(ox + gw * cs, oy, gridMeta, transform, w, h);
      const rW = rMaxX - rMinX;
      const rH = rMaxY - rMinY;
      const centerX = rMinX + rW / 2;
      const centerY = rMinY + rH / 2;

      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      for (const km of [3, 6, 12]) {
        const ringRadius = (km * 1000 / cs) * (rW / gw);
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.font = '9px monospace';
        ctx.fillText(`${km}km`, centerX + ringRadius - 22, centerY - 4);
      }

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(radarAngle) * (Math.max(rW, rH) * 0.6),
        centerY + Math.sin(radarAngle) * (Math.max(rW, rH) * 0.6)
      );
      ctx.stroke();

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      const stnName = telemetry?.radar_station || (cityMeta?.live_radar_station || 'IMD Doppler Weather Radar');
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(centerX - 90, centerY + 10, 180, 20);
      ctx.strokeStyle = '#1f2937';
      ctx.strokeRect(centerX - 90, centerY + 10, 180, 20);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(stnName, centerX, centerY + 24);
      ctx.textAlign = 'left';
      ctx.restore();
    }

    // 12. Topographic DEM Contours (layers.elevation)
    if (layers.elevation) {
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([2, 4]);

      for (let level = 1; level <= 4; level++) {
        const radX = (gw * cs * 0.45 * level) / 4;
        const radY = (gh * cs * 0.45 * level) / 4;
        const [cx, cy] = worldToScreen(ox + (gw * cs) / 2, oy + (gh * cs) / 2, gridMeta, transform, w, h);
        const [sx, sy] = worldToScreen(ox + (gw * cs) / 2 + radX, oy + (gh * cs) / 2 + radY, gridMeta, transform, w, h);

        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(sx - cx), Math.abs(sy - cy), 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = '9px monospace';
        ctx.fillText(`+${level * 10}m MSL`, cx + Math.abs(sx - cx) - 20, cy);
      }
      ctx.restore();
    }

    ctx.restore();
  }, [transform, layers, basemapStyle, depthGrid, roads, roadImpacts, drainage, filteredAssets, activeRoute, gridMeta, minDepthThreshold, utmZone, radarAngle, currentLead, telemetry, cityMeta, hoveredSurchargeNode]);

  useEffect(() => {
    let animId = requestAnimationFrame(draw);
    const canvas = canvasRef.current;
    let ro: ResizeObserver | null = null;
    if (canvas && canvas.parentElement && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        requestAnimationFrame(draw);
      });
      ro.observe(canvas.parentElement);
    }
    const handleResize = () => requestAnimationFrame(draw);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [draw]);

  // Pan & Zoom Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startPanX: transform.panX,
      startPanY: transform.panY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTransform((prev) => ({
        ...prev,
        panX: dragStart.startPanX + (e.clientX - dragStart.x),
        panY: dragStart.startPanY + (e.clientY - dragStart.y),
      }));
      if (hoveredSurchargeNode) setHoveredSurchargeNode(null);
    } else {
      // Hit testing for 1D pipe surcharge nodes on hover
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && layers.flood_1d && drainage) {
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const w = rect.width;
        const h = rect.height;

        const nodes = [...(drainage.inlets || []), ...(drainage.outfalls || [])];
        let foundNode: typeof hoveredSurchargeNode = null;

        for (let i = 0; i < nodes.length; i++) {
          if (i % 3 !== 0) continue; // Only surcharged nodes
          const pt = nodes[i];
          const [px, py] = worldToScreen(pt[0], pt[1], gridMeta, transform, w, h);
          const hitRadius = Math.max(12, 16 * transform.zoom);
          const dist = Math.hypot(mx - px, my - py);

          if (dist <= hitRadius + 4) {
            foundNode = { index: i, x: px, y: py };
            break;
          }
        }

        if (
          (!foundNode && hoveredSurchargeNode) ||
          (foundNode && (!hoveredSurchargeNode || hoveredSurchargeNode.index !== foundNode.index))
        ) {
          setHoveredSurchargeNode(foundNode);
        }
      } else if (hoveredSurchargeNode) {
        setHoveredSurchargeNode(null);
      }
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (hoveredSurchargeNode) setHoveredSurchargeNode(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setTransform((prev) => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(25.0, prev.zoom * zoomFactor)),
    }));
  };

  const resetView = () => setTransform({ panX: 0, panY: 0, zoom: 0.92 });

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000000',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : (hoveredSurchargeNode ? 'pointer' : 'grab'),
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {/* Collapsible Layers Control Floating Panel */}
      <div
        id="layers-panel"
        style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          background: 'rgba(0, 0, 0, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid #1f2937',
          borderRadius: '8px',
          padding: isLayersCollapsed ? '8px 12px' : '12px 14px',
          minWidth: isLayersCollapsed ? 'auto' : '240px',
          maxWidth: '300px',
          zIndex: 35,
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.9), 0 0 15px rgba(56, 189, 248, 0.08)',
        }}
      >
        <div
          onClick={() => setIsLayersCollapsed(!isLayersCollapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#94a3b8',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} color="#38bdf8" />
            <span>Map Layers &amp; GIS ({Object.values(layers).filter(Boolean).length})</span>
          </div>
          {isLayersCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>

        {!isLayersCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', fontSize: '11px', color: '#e2e8f0' }}>
            {/* Basemap Style Selector (Vector AMOLED Default + CARTO Authenticated) */}
            <div style={{ display: 'flex', gap: '3px', marginBottom: '6px', background: '#050505', padding: '3px', borderRadius: '5px', border: '1px solid #171717' }}>
              <button
                onClick={() => setBasemapStyle('vector')}
                style={{
                  flex: 1,
                  background: basemapStyle === 'vector' ? '#0284c7' : 'transparent',
                  color: basemapStyle === 'vector' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '3px 0',
                  fontSize: '9px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Native High-Precision UTM Vector Basemap (Zero Distortion, Infinite Clarity)"
              >
                Vector
              </button>
              <button
                onClick={() => setBasemapStyle('dark')}
                style={{
                  flex: 1,
                  background: basemapStyle === 'dark' ? '#0284c7' : 'transparent',
                  color: basemapStyle === 'dark' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '3px 0',
                  fontSize: '9px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="CARTO Dark Matter (Authenticated, Watermark-Free)"
              >
                Dark
              </button>
              <button
                onClick={() => setBasemapStyle('voyager')}
                style={{
                  flex: 1,
                  background: basemapStyle === 'voyager' ? '#0284c7' : 'transparent',
                  color: basemapStyle === 'voyager' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '3px 0',
                  fontSize: '9px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="CARTO Voyager (Authenticated, Watermark-Free)"
              >
                Voyager
              </button>
              <button
                onClick={() => setBasemapStyle('satellite')}
                style={{
                  flex: 1,
                  background: basemapStyle === 'satellite' ? '#0284c7' : 'transparent',
                  color: basemapStyle === 'satellite' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '3px 0',
                  fontSize: '9px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Esri World Imagery"
              >
                Satellite
              </button>
              <button
                onClick={() => setBasemapStyle('cad')}
                style={{
                  flex: 1,
                  background: basemapStyle === 'cad' ? '#0284c7' : 'transparent',
                  color: basemapStyle === 'cad' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '3px 0',
                  fontSize: '9px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Minimalist CAD Grid"
              >
                CAD
              </button>
            </div>

            {/* 13 Clean SVG Layer Toggles */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.flood_2d}
                onChange={(e) => onLayersChange({ ...layers, flood_2d: e.target.checked })}
                style={{ accentColor: '#38bdf8' }}
              />
              <Waves size={13} color="#38bdf8" />
              <span>2D Overland Inundation Depth</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.flood_1d}
                onChange={(e) => onLayersChange({ ...layers, flood_1d: e.target.checked })}
                style={{ accentColor: '#f43f5e' }}
              />
              <Droplets size={13} color="#f43f5e" />
              <span>1D Pipe Surcharge &amp; Manholes</span>
            </label>

            {/* Separate OG Continuous Rainfall Heatmap Layer */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.rainfall}
                onChange={(e) => onLayersChange({ ...layers, rainfall: e.target.checked })}
                style={{ accentColor: '#38bdf8' }}
              />
              <CloudRain size={13} color="#38bdf8" />
              <span>Rainfall Intensity Heatmap (mm/h)</span>
            </label>

            {/* Separate Doppler Radar Layer */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.radar}
                onChange={(e) => onLayersChange({ ...layers, radar: e.target.checked })}
                style={{ accentColor: '#38bdf8' }}
              />
              <Radio size={13} color="#34d399" />
              <span>Doppler Weather Radar (DWR)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.roads}
                onChange={(e) => onLayersChange({ ...layers, roads: e.target.checked })}
                style={{ accentColor: '#38bdf8' }}
              />
              <Navigation size={13} color="#94a3b8" />
              <span>Road Network ({roads.length} Segments)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.passability}
                onChange={(e) => onLayersChange({ ...layers, passability: e.target.checked })}
                style={{ accentColor: '#38bdf8' }}
              />
              <ShieldAlert size={13} color="#fbbf24" />
              <span>Passability (D × V Status)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.policyFilter}
                onChange={(e) => onLayersChange({ ...layers, policyFilter: e.target.checked })}
                style={{ accentColor: '#38bdf8' }}
              />
              <Filter size={13} color="#f87171" />
              <span>Filter Impassable Only</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.drainage}
                onChange={(e) => onLayersChange({ ...layers, drainage: e.target.checked })}
                style={{ accentColor: '#38bdf8' }}
              />
              <Pipette size={13} color="#60a5fa" />
              <span>Drainage Channels &amp; Outfalls</span>
            </label>

            {/* Critical Civic Assets Layer with Category Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#050505', padding: '6px 8px', borderRadius: '6px', border: '1px solid #171717' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={layers.assets}
                  onChange={(e) => onLayersChange({ ...layers, assets: e.target.checked })}
                  style={{ accentColor: '#38bdf8' }}
                />
                <Building2 size={13} color="#34d399" />
                <span style={{ fontWeight: 700 }}>Critical Civic Assets ({filteredAssets.length})</span>
              </label>

              {layers.assets && (
                <div style={{ marginTop: '3px', paddingLeft: '20px' }}>
                  <select
                    value={selectedAssetCategory}
                    onChange={(e) => setSelectedAssetCategory(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#000000',
                      color: '#38bdf8',
                      border: '1px solid #1f2937',
                      borderRadius: '4px',
                      padding: '3px 6px',
                      fontSize: '10px',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="ALL">All Categories ({criticalAssets.length})</option>
                    <option value="HOSPITAL">Hospitals &amp; Medical Centers</option>
                    <option value="POWER_SUBSTATION">Power Grid &amp; Substations</option>
                    <option value="EMERGENCY_SERVICES">NDRF Bases &amp; Fire Command</option>
                    <option value="RELIEF_SHELTER">Flood &amp; Cyclone Shelters</option>
                    <option value="METRO_STATION">Metro &amp; Rail Transit Hubs</option>
                    <option value="WATER_TREATMENT">Water Treatment &amp; Heavy Pumps</option>
                  </select>
                </div>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.tiles}
                onChange={(e) => onLayersChange({ ...layers, tiles: e.target.checked })}
                style={{ accentColor: '#38bdf8' }}
              />
              <Layers size={13} color="#38bdf8" />
              <span>Base Maps (Vector / Raster)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.elevation}
                onChange={(e) => onLayersChange({ ...layers, elevation: e.target.checked })}
                style={{ accentColor: '#38bdf8' }}
              />
              <Mountain size={13} color="#fbbf24" />
              <span>Terrain DEM Elevation (m)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.sponge}
                onChange={(e) => onLayersChange({ ...layers, sponge: e.target.checked })}
                style={{ accentColor: '#38bdf8' }}
              />
              <Sprout size={13} color="#10b981" />
              <span>Sponge NbS Mitigation Assets</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={layers.risk}
                onChange={(e) => onLayersChange({ ...layers, risk: e.target.checked })}
                style={{ accentColor: '#38bdf8' }}
              />
              <Activity size={13} color="#c084fc" />
              <span>Spatial Risk Surface (P90)</span>
            </label>
          </div>
        )}
      </div>

      {/* Floating View Controls */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          right: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 35,
        }}
      >
        <button
          onClick={() => setTransform((prev) => ({ ...prev, zoom: Math.min(25.0, prev.zoom * 1.25) }))}
          style={{
            background: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid #1f2937',
            color: '#38bdf8',
            borderRadius: '6px',
            padding: '7px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={() => setTransform((prev) => ({ ...prev, zoom: Math.max(0.1, prev.zoom * 0.8) }))}
          style={{
            background: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid #1f2937',
            color: '#38bdf8',
            borderRadius: '6px',
            padding: '7px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>
        <button
          onClick={resetView}
          style={{
            background: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid #1f2937',
            color: '#34d399',
            borderRadius: '6px',
            padding: '7px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
          title="Center / Fit Active City"
        >
          <Crosshair size={15} />
        </button>
      </div>

      {/* Floating Inundation Depth Color Legend */}
      {layers.flood_2d && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            position: 'absolute',
            bottom: '84px',
            left: '14px',
            padding: '8px 12px',
            fontSize: '10px',
            color: '#94a3b8',
            zIndex: 30,
            minWidth: '210px',
          }}
        >
          <div style={{ fontWeight: 800, color: '#f8fafc', marginBottom: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Waves size={12} color="#38bdf8" />
            <span>Inundation Depth Scale</span>
          </div>
          <div style={{ height: '6px', width: '100%', borderRadius: '3px', background: 'linear-gradient(to right, rgba(56,189,248,0.7), rgba(14,165,233,0.9), #f59e0b, #ef4444, #a855f7)', marginBottom: '3px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#cbd5e1' }}>
            <span>0.05m</span>
            <span>0.15m</span>
            <span>0.30m</span>
            <span>0.60m</span>
            <span>&gt;1.0m</span>
          </div>
        </div>
      )}

      {/* Floating Rainfall Intensity Heatmap Legend */}
      {layers.rainfall && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            position: 'absolute',
            bottom: layers.flood_2d ? '146px' : '84px',
            left: '14px',
            padding: '8px 12px',
            fontSize: '10px',
            color: '#94a3b8',
            zIndex: 30,
            minWidth: '210px',
          }}
        >
          <div style={{ fontWeight: 800, color: '#f8fafc', marginBottom: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CloudRain size={12} color="#38bdf8" />
            <span>Rainfall Intensity Scale</span>
          </div>
          <div style={{ height: '6px', width: '100%', borderRadius: '3px', background: 'linear-gradient(to right, rgba(52,211,153,0.6), #fbbf24, #ef4444, #a855f7)', marginBottom: '3px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#cbd5e1' }}>
            <span>5 mm/h</span>
            <span>20 mm/h</span>
            <span>45 mm/h</span>
            <span>&gt;70 mm/h</span>
          </div>
        </div>
      )}

      {/* Pulsing Red Circle Radar Loader Overlay */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            pointerEvents: 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <div
            style={{
              background: '#050505',
              border: '1px solid #1f2937',
              borderRadius: '12px',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(239, 68, 68, 0.25)',
              maxWidth: '440px',
              textAlign: 'center',
            }}
          >
            <div className="pulsing-red-circle">
              <div className="ring-1" />
              <div className="ring-2" />
              <div className="core" />
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.2px', marginBottom: '5px' }}>
                {loadingMessage || 'Processing Hydrodynamic Raster & Spatial GIS Layers...'}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.4 }}>
                Coupled 1D/2D Hydrodynamic Engine · Doppler Weather Radar Nowcast · High-Resolution Inundation Mesh
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', color: '#ef4444', fontWeight: 700, background: '#1c1917', border: '1px solid #78350f', padding: '3px 8px', borderRadius: '4px' }}>
              <span className="pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <span>LIVE COMPUTATION IN PROGRESS</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
