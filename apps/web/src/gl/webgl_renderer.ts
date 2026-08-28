/**
 * High-Performance Hardware-Accelerated WebGL Geospatial Engine.
 * 
 * Features:
 * 1. Fast GPU Raster Quad Shader for continuous flood depth fields & radar mosaics.
 * 2. Real-time GLSL threshold filtering (clip depths < user cutoff).
 * 3. Batched GPU Vector Line rendering for large road and canal networks.
 * 4. Ultra-smooth 60-120 FPS timeline scrubbing with hardware bilinear filtering.
 */

import { INUNDATION_STOPS, RADAR_DBZ_STOPS, createColormapTexture } from './color_ramps';
import { RoadSegment, RoadImpact } from '../types';

const RASTER_VS = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
uniform mat3 u_matrix;
varying vec2 v_texCoord;

void main() {
  vec3 pos = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const RASTER_FS = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_dataTexture;
uniform sampler2D u_colormapTexture;
uniform float u_minThreshold;
uniform float u_maxDepth;
uniform float u_opacity;

void main() {
  vec4 data = texture2D(u_dataTexture, v_texCoord);
  // Reconstruct depth value (normalized 0.0 to 1.0)
  float rawValue = data.r + (data.g / 255.0);
  float depthM = rawValue * u_maxDepth;

  if (depthM < u_minThreshold || rawValue <= 0.001) {
    discard;
  }

  float normalizedVal = clamp(depthM / u_maxDepth, 0.0, 1.0);
  vec4 color = texture2D(u_colormapTexture, vec2(normalizedVal, 0.5));
  gl_FragColor = vec4(color.rgb, color.a * u_opacity);
}
`;

const VECTOR_VS = `
attribute vec2 a_position;
attribute vec4 a_color;
uniform mat3 u_matrix;
varying vec4 v_color;

void main() {
  vec3 pos = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
  v_color = a_color;
}
`;

const VECTOR_FS = `
precision mediump float;
varying vec4 v_color;

void main() {
  gl_FragColor = v_color;
}
`;

export class WebGLFloodRenderer {
  private gl: WebGLRenderingContext;
  private rasterProgram!: WebGLProgram;
  private vectorProgram!: WebGLProgram;

  private quadBuffer!: WebGLBuffer;
  private vectorBuffer!: WebGLBuffer;
  private vectorColorBuffer!: WebGLBuffer;

  private dataTexture: WebGLTexture | null = null;
  private depthColormap!: WebGLTexture;
  private radarColormap!: WebGLTexture;

  private activeWidth = 0;
  private activeHeight = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) {
      throw new Error('WebGL not supported on this browser/GPU.');
    }
    this.gl = gl;
    this.initPrograms();
    this.initBuffers();
    this.initColormaps();
  }

  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const err = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${err}`);
    }
    return shader;
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram {
    const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
    const prog = this.gl.createProgram()!;
    this.gl.attachShader(prog, vs);
    this.gl.attachShader(prog, fs);
    this.gl.linkProgram(prog);
    if (!this.gl.getProgramParameter(prog, this.gl.LINK_STATUS)) {
      throw new Error(`Program link error: ${this.gl.getProgramInfoLog(prog)}`);
    }
    return prog;
  }

  private initPrograms() {
    this.rasterProgram = this.createProgram(RASTER_VS, RASTER_FS);
    this.vectorProgram = this.createProgram(VECTOR_VS, VECTOR_FS);
  }

  private initBuffers() {
    const gl = this.gl;
    // Standard Quad [-1, -1] to [1, 1]
    const quadVertices = new Float32Array([
      -1, -1,  0, 1,
       1, -1,  1, 1,
      -1,  1,  0, 0,
      -1,  1,  0, 0,
       1, -1,  1, 1,
       1,  1,  1, 0,
    ]);
    this.quadBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    this.vectorBuffer = gl.createBuffer()!;
    this.vectorColorBuffer = gl.createBuffer()!;
  }

  private initColormaps() {
    this.depthColormap = createColormapTexture(this.gl, INUNDATION_STOPS);
    this.radarColormap = createColormapTexture(this.gl, RADAR_DBZ_STOPS);
  }

  /**
   * Upload raster depth grid array (height x width) into GPU texture.
   */
  public uploadRasterGrid(gridData: Float32Array, width: number, height: number) {
    const gl = this.gl;
    this.activeWidth = width;
    this.activeHeight = height;

    // Convert Float32 depth (m) to 2-byte fixed precision (R = whole integer / 10, G = fractional remainder)
    const textureData = new Uint8Array(width * height * 4);
    for (let i = 0; i < gridData.length; i++) {
      const d = Math.max(0.0, gridData[i]);
      const norm = Math.min(2.5, d) / 2.5; // normalized to 0.0-2.5m range
      const scaled = Math.round(norm * 65535);
      textureData[i * 4 + 0] = (scaled >> 8) & 0xff; // high byte
      textureData[i * 4 + 1] = scaled & 0xff;        // low byte
      textureData[i * 4 + 2] = 0;
      textureData[i * 4 + 3] = d > 0.01 ? 255 : 0;
    }

    if (!this.dataTexture) {
      this.dataTexture = gl.createTexture();
    }
    gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, textureData);
  }

  /**
   * Render raster depth or radar field with WebGL fragment shader.
   */
  public renderRaster(
    matrix: number[],
    minThreshold = 0.05,
    maxDepth = 2.5,
    opacity = 0.85,
    isRadar = false
  ) {
    if (!this.dataTexture) return;
    const gl = this.gl;

    gl.useProgram(this.rasterProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

    const aPos = gl.getAttribLocation(this.rasterProgram, 'a_position');
    const aTex = gl.getAttribLocation(this.rasterProgram, 'a_texCoord');
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 16, 8);

    const uMat = gl.getUniformLocation(this.rasterProgram, 'u_matrix');
    const uMin = gl.getUniformLocation(this.rasterProgram, 'u_minThreshold');
    const uMax = gl.getUniformLocation(this.rasterProgram, 'u_maxDepth');
    const uOp = gl.getUniformLocation(this.rasterProgram, 'u_opacity');
    const uData = gl.getUniformLocation(this.rasterProgram, 'u_dataTexture');
    const uColor = gl.getUniformLocation(this.rasterProgram, 'u_colormapTexture');

    gl.uniformMatrix3fv(uMat, false, new Float32Array(matrix));
    gl.uniform1f(uMin, minThreshold);
    gl.uniform1f(uMax, maxDepth);
    gl.uniform1f(uOp, opacity);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
    gl.uniform1i(uData, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, isRadar ? this.radarColormap : this.depthColormap);
    gl.uniform1i(uColor, 1);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * Render vector road network with dynamic classification colors.
   */
  public renderRoads(
    roads: RoadSegment[],
    impacts: Record<string, RoadImpact>,
    matrix: number[],
    bounds: [number, number, number, number]
  ) {
    const gl = this.gl;
    const vertices: number[] = [];
    const colors: number[] = [];

    const [minX, minY, maxX, maxY] = bounds;
    const wSpan = maxX - minX || 1;
    const hSpan = maxY - minY || 1;

    for (const r of roads) {
      if (!r.geometry || r.geometry.length < 2) continue;
      const imp = impacts[r.road_id];
      const cls = imp ? imp.classification : 'DRY';

      let rCol = [0.45, 0.55, 0.65, 0.7]; // DRY
      if (cls === 'LOW_IMPACT') rCol = [0.2, 0.7, 0.9, 0.9];
      else if (cls === 'CAUTION') rCol = [0.95, 0.75, 0.1, 0.95];
      else if (cls === 'HIGH_IMPACT') rCol = [0.95, 0.35, 0.15, 0.95];
      else if (cls === 'IMPASSABLE') rCol = [0.9, 0.1, 0.2, 1.0];

      for (let i = 0; i < r.geometry.length - 1; i++) {
        const p1 = r.geometry[i];
        const p2 = r.geometry[i + 1];

        // Normalize to [-1, 1] clip space
        const x1 = ((p1[0] - minX) / wSpan) * 2 - 1;
        const y1 = ((p1[1] - minY) / hSpan) * 2 - 1;
        const x2 = ((p2[0] - minX) / wSpan) * 2 - 1;
        const y2 = ((p2[1] - minY) / hSpan) * 2 - 1;

        vertices.push(x1, y1, x2, y2);
        colors.push(...rCol, ...rCol);
      }
    }

    if (vertices.length === 0) return;

    gl.useProgram(this.vectorProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vectorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    const aPos = gl.getAttribLocation(this.vectorProgram, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vectorColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
    const aCol = gl.getAttribLocation(this.vectorProgram, 'a_color');
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, 0, 0);

    const uMat = gl.getUniformLocation(this.vectorProgram, 'u_matrix');
    gl.uniformMatrix3fv(uMat, false, new Float32Array(matrix));

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.LINES, 0, vertices.length / 2);
  }

  public clear() {
    const gl = this.gl;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.04, 0.06, 0.09, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}
