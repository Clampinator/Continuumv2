/*
Tactical Scene Renderer - manages the WebGL 3D canvas for the
vehicle combat environment. Handles camera, lighting, star field,
and delegates domain-specific rendering to sub-renderers.

This is a PROJECTOR: it receives environment data and draws pixels.
No domain logic or state writes.
*/

import { ShipModelRenderer } from './ship-model-renderer.js';
import { ObstacleRenderer } from './obstacle-renderer.js';
import { GridRenderer } from './grid-renderer.js';
import { CameraController } from './camera-controller.js';

export class TacticalSceneRenderer {
  constructor(canvas, environment) {
    this.canvas = canvas;
    this.ctx = null;
    this.environment = environment;
    this.editMode = false;
    this.cameraController = null;
    this.shipRenderer = null;
    this.obstacleRenderer = null;
    this.gridRenderer = null;
    this._animFrame = null;
    this._gl = null;
  }

  // Initialize WebGL context and sub-renderers
  initialize() {
    this._gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
    if (!this._gl) {
      // Fallback: use 2D canvas for basic wireframe rendering
      this.ctx = this.canvas.getContext('2d');
      this._initFallback();
      return;
    }
    this._initWebGL();
  }

  _initWebGL() {
    const gl = this._gl;
    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Compile basic shader programs
    this._shaderProgram = this._createShaderProgram(gl, VERTEX_SRC, FRAGMENT_SRC);

    // Initialize sub-renderers
    this.cameraController = new CameraController(this.canvas);
    this.shipRenderer = new ShipModelRenderer(gl, this._shaderProgram);
    this.obstacleRenderer = new ObstacleRenderer(gl, this._shaderProgram);
    this.gridRenderer = new GridRenderer(gl, this._shaderProgram);

    this._startRenderLoop();
  }

  // Fallback 2D canvas renderer when WebGL is not available
  _initFallback() {
    this.cameraController = new CameraController(this.canvas);
    this._startRenderLoop();
  }

  _startRenderLoop() {
    const loop = () => {
      this._render();
      this._animFrame = requestAnimationFrame(loop);
    };
    this._animFrame = requestAnimationFrame(loop);
  }

  _render() {
    if (this._gl) {
      this._renderGL();
    } else {
      this._render2D();
    }
  }

  _renderGL() {
    const gl = this._gl;
    if (!gl) return;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const cam = this.cameraController.getMatrix();
    gl.uniformMatrix4fv(gl.getUniformLocation(this._shaderProgram, 'uProjection'), false, cam.projection);
    gl.uniformMatrix4fv(gl.getUniformLocation(this._shaderProgram, 'uView'), false, cam.view);

    // Render domain grid
    this.gridRenderer.render(this.environment, cam);

    // Render obstacles
    this.obstacleRenderer.render(this.environment.obstacles ?? [], this.environment.domain, cam);

    // Render vehicles
    const vehicles = this.environment.vehicles ?? {};
    for (const [id, vData] of Object.entries(vehicles)) {
      this.shipRenderer.render(vData, cam);
    }
  }

  // 2D wireframe fallback
  _render2D() {
    const ctx = this.ctx;
    if (!ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const cam = this.cameraController;

    // Draw domain grid
    this._drawGrid2D(ctx, w, h, cam);

    // Draw obstacles
    this._drawObstacles2D(ctx, w, h, cam);

    // Draw vehicles
    const vehicles = this.environment.vehicles ?? {};
    for (const [id, vData] of Object.entries(vehicles)) {
      this._drawVehicle2D(ctx, vData, w, h, cam);
    }

    // Draw status
    ctx.fillStyle = '#888888';
    ctx.font = '12px monospace';
    ctx.fillText(`Domain: ${this.environment.domain} | Vehicles: ${Object.keys(vehicles).length}`, 10, h - 10);
  }

  _drawGrid2D(ctx, w, h, cam) {
    const gridColor = this.environment.domain === 'space' ? '#111122' : '#112211';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;

    // Simple orthographic grid
    const gridSize = 50;
    for (let x = -500; x <= 500; x += gridSize) {
      const sx = cam.worldToScreenX(x, 0, 0, w);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();
    }
    for (let y = -500; y <= 500; y += gridSize) {
      const sy = cam.worldToScreenY(0, y, 0, h);
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();
    }
  }

  _drawObstacles2D(ctx, w, h, cam) {
    const obstacles = this.environment.obstacles ?? [];
    for (const obs of obstacles) {
      const sx = cam.worldToScreenX(obs.position.x, obs.position.y, obs.position.z, w);
      const sy = cam.worldToScreenY(obs.position.x, obs.position.y, obs.position.z, h);
      const sr = cam.worldToScreenScale(obs.size ?? 20, w);

      const color = _obstacleColor(this.environment.domain, obs.type);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;

      if (obs.type === 'planet' || obs.type === 'moon') {
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillRect(sx - sr / 2, sy - sr / 2, sr, sr);
      }

      ctx.fillStyle = '#aaaaaa';
      ctx.font = '10px monospace';
      ctx.fillText(obs.name ?? obs.type ?? '?', sx + sr / 2 + 4, sy);
    }
  }

  _drawVehicle2D(ctx, vData, w, h, cam) {
    const pos = vData.position ?? { x: 0, y: 0, z: 0 };
    const sx = cam.worldToScreenX(pos.x, pos.y, pos.z, w);
    const sy = cam.worldToScreenY(pos.x, pos.y, pos.z, h);

    // Ship triangle
    const size = 12;
    ctx.fillStyle = '#00e5ff';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(sx, sy - size);
    ctx.lineTo(sx - size * 0.7, sy + size * 0.5);
    ctx.lineTo(sx + size * 0.7, sy + size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Velocity vector
    if (vData.velocity) {
      const vel = vData.velocity;
      const velScale = 0.5;
      const ex = sx + vel.x * velScale;
      const ey = sy + vel.y * velScale;
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Create a basic WebGL shader program
  _createShaderProgram(gl, vertSrc, fragSrc) {
    const vert = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vert, vertSrc);
    gl.compileShader(vert);

    const frag = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(frag, fragSrc);
    gl.compileShader(frag);

    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    return prog;
  }

  setEditMode(enabled) {
    this.editMode = enabled;
  }

  updateEnvironment(env) {
    this.environment = env;
  }

  // Get camera world position for coordinate display
  screenToWorld(sx, sy) {
    if (this.cameraController) {
      return this.cameraController.screenToWorld(sx, sy, this.canvas.width, this.canvas.height);
    }
    return { x: 0, y: 0, z: 0 };
  }

  destroy() {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    if (this._gl) {
      this._gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }
}

function _obstacleColor(domain, type) {
  const colors = {
    space: { planet: '#4488ff', moon: '#aaaaaa', asteroid: '#886644', station: '#ffaa00' },
    land: { building: '#555555', hill: '#227722', wall: '#888888' },
    air: { cloud: '#cccccc' },
    water: { island: '#227722', reef: '#448844' }
  };
  return colors[domain]?.[type] ?? '#888888';
}

// Minimal WebGL shaders for 3D projection
const VERTEX_SRC = `
  attribute vec3 aPosition;
  attribute vec4 aColor;
  uniform mat4 uProjection;
  uniform mat4 uView;
  varying vec4 vColor;
  void main() {
    gl_Position = uProjection * uView * vec4(aPosition, 1.0);
    vColor = aColor;
  }
`;

const FRAGMENT_SRC = `
  precision mediump float;
  varying vec4 vColor;
  void main() {
    gl_FragColor = vColor;
  }
`;