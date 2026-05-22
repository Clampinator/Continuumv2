/*
Camera Controller - handles 3D camera state for the tactical scene.
Supports orbit, pan, and zoom via mouse drag.
Provides world-to-screen and screen-to-world coordinate conversion
for the projector layer.
*/

export class CameraController {
  constructor(canvas) {
    this.canvas = canvas;
    // Camera position in spherical coords (orbit around target)
    this.targetX = 0;
    this.targetY = 0;
    this.targetZ = 0;
    this.distance = 500;
    this.azimuth = 0.5;
    this.elevation = 0.8;
    this.fov = 60;
    this.near = 1;
    this.far = 100000;

    // 2D fallback camera state
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1.0;

    this._isDragging = false;
    this._dragButton = -1;
    this._lastX = 0;
    this._lastY = 0;

    this._bindEvents();
  }

  // Get projection and view matrices for WebGL
  getMatrix() {
    const aspect = this.canvas.width / this.canvas.height;
    const proj = _perspectiveMatrix(this.fov, aspect, this.near, this.far);
    const eye = this._eyePosition();
    const view = _lookAtMatrix(eye, [this.targetX, this.targetY, this.targetZ], [0, 1, 0]);
    return { projection: proj, view: view };
  }

  _eyePosition() {
    const x = this.targetX + this.distance * Math.cos(this.elevation) * Math.sin(this.azimuth);
    const y = this.targetY + this.distance * Math.sin(this.elevation);
    const z = this.targetZ + this.distance * Math.cos(this.elevation) * Math.cos(this.azimuth);
    return [x, y, z];
  }

  // 2D world-to-screen conversion (fallback renderer)
  worldToScreenX(wx, wy, wz, screenWidth) {
    return (wx - this.panX) * this.zoom + screenWidth / 2;
  }

  worldToScreenY(wx, wy, wz, screenHeight) {
    return (wy - this.panY) * this.zoom + screenHeight / 2;
  }

  worldToScreenScale(worldSize, screenWidth) {
    return worldSize * this.zoom;
  }

  // Screen-to-world conversion for click handling
  screenToWorld(sx, sy, width, height) {
    const wx = (sx - width / 2) / this.zoom + this.panX;
    const wy = (sy - height / 2) / this.zoom + this.panY;
    return { x: wx, y: wy, z: 0 };
  }

  _bindEvents() {
    const el = this.canvas;
    el.addEventListener('mousedown', (ev) => this._onPointerDown(ev));
    el.addEventListener('mousemove', (ev) => this._onPointerMove(ev));
    el.addEventListener('mouseup', (ev) => this._onPointerUp(ev));
    el.addEventListener('wheel', (ev) => this._onWheel(ev));
  }

  _onPointerDown(ev) {
    this._isDragging = true;
    this._dragButton = ev.button;
    this._lastX = ev.clientX;
    this._lastY = ev.clientY;
  }

  _onPointerMove(ev) {
    if (!this._isDragging) return;

    const dx = ev.clientX - this._lastX;
    const dy = ev.clientY - this._lastY;

    if (this._dragButton === 0) {
      // Left button: orbit
      this.azimuth -= dx * 0.01;
      this.elevation = Math.max(-1.5, Math.min(1.5, this.elevation + dy * 0.01));
    } else if (this._dragButton === 2) {
      // Right button: pan
      this.panX -= dx / this.zoom;
      this.panY -= dy / this.zoom;
    } else if (this._dragButton === 1) {
      // Middle button: zoom
      this.zoom *= dy > 0 ? 0.95 : 1.05;
      this.zoom = Math.max(0.1, Math.min(50, this.zoom));
    }

    this._lastX = ev.clientX;
    this._lastY = ev.clientY;
  }

  _onPointerUp() {
    this._isDragging = false;
    this._dragButton = -1;
  }

  _onWheel(ev) {
    ev.preventDefault();
    const factor = ev.deltaY > 0 ? 0.9 : 1.1;
    this.zoom *= factor;
    this.zoom = Math.max(0.1, Math.min(50, this.zoom));
  }

  destroy() {
    // Event listeners will be garbage collected with canvas
  }
}

// Minimal perspective projection matrix
function _perspectiveMatrix(fovDeg, aspect, near, far) {
  const f = 1.0 / Math.tan((fovDeg * Math.PI / 180) / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ]);
}

// Minimal lookAt matrix
function _lookAtMatrix(eye, center, up) {
  const [ex, ey, ez] = eye;
  const [cx, cy, cz] = center;
  let fx = cx - ex, fy = cy - ey, fz = cz - ez;
  let len = Math.sqrt(fx * fx + fy * fy + fz * fz);
  fx /= len; fy /= len; fz /= len;
  let sx = fy * up[2] - fz * up[1];
  let sy = fz * up[0] - fx * up[2];
  let sz = fx * up[1] - fy * up[0];
  len = Math.sqrt(sx * sx + sy * sy + sz * sz);
  sx /= len; sy /= len; sz /= len;
  const ux = sy * fz - sz * fy;
  const uy = sz * fx - sx * fz;
  const uz = sx * fy - sy * fx;
  return new Float32Array([
    sx, ux, -fx, 0,
    sy, uy, -fy, 0,
    sz, uz, -fz, 0,
    -(sx * ex + sy * ey + sz * ez),
    -(ux * ex + uy * ey + uz * ez),
    (fx * ex + fy * ey + fz * ez),
    1
  ]);
}