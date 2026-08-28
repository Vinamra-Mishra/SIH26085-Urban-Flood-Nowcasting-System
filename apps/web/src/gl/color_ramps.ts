/**
 * GPU Colormaps and Palette Texture Generation for WebGL Shaders.
 */

export interface ColorStop {
  val: number; // 0.0 to 1.0
  r: number;
  g: number;
  b: number;
  a: number;
}

// Inundation Depth Palette (0m -> 2m+)
export const INUNDATION_STOPS: ColorStop[] = [
  { val: 0.00, r: 0,   g: 0,   b: 0,   a: 0.0 },   // Dry (<0.02m)
  { val: 0.05, r: 24,  g: 144, b: 255, a: 0.55 },  // Shallow puddle (0.05m)
  { val: 0.15, r: 0,   g: 210, b: 255, a: 0.75 },  // Ankle depth (0.15m)
  { val: 0.30, r: 250, g: 173, b: 20,  a: 0.85 },  // Wheel/Knee depth (0.30m)
  { val: 0.60, r: 245, g: 34,  b: 45,   a: 0.92 },  // Waist depth (0.60m)
  { val: 1.00, r: 114, g: 9,   b: 183, a: 0.98 },  // Deep / Severe (>1.0m)
];

// Doppler Radar Reflectivity Palette (dBZ)
export const RADAR_DBZ_STOPS: ColorStop[] = [
  { val: 0.00, r: 0,   g: 0,   b: 0,   a: 0.0 },
  { val: 0.15, r: 4,   g: 233, b: 255, a: 0.4 },  // Light rain
  { val: 0.35, r: 0,   g: 153, b: 0,   a: 0.65 }, // Moderate rain
  { val: 0.60, r: 255, g: 255, b: 0,   a: 0.8 },  // Heavy rain
  { val: 0.80, r: 255, g: 102, b: 0,   a: 0.9 },  // Torrential
  { val: 1.00, r: 255, g: 0,   b: 255, a: 0.95 }, // Extreme / Hail
];

export function createColormapTexture(gl: WebGLRenderingContext, stops: ColorStop[]): WebGLTexture {
  const width = 256;
  const data = new Uint8Array(width * 4);

  for (let i = 0; i < width; i++) {
    const t = i / (width - 1);
    // Find enclosing stops
    let low = stops[0];
    let high = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s].val && t <= stops[s + 1].val) {
        low = stops[s];
        high = stops[s + 1];
        break;
      }
    }
    const range = high.val - low.val;
    const factor = range > 0 ? (t - low.val) / range : 0;

    data[i * 4 + 0] = Math.round(low.r + (high.r - low.r) * factor);
    data[i * 4 + 1] = Math.round(low.g + (high.g - low.g) * factor);
    data[i * 4 + 2] = Math.round(low.b + (high.b - low.b) * factor);
    data[i * 4 + 3] = Math.round((low.a + (high.a - low.a) * factor) * 255);
  }

  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

  return texture;
}
