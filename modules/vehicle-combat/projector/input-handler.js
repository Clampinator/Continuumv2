/*
Input Handler - translates canvas mouse/keyboard events into
editing actions and vehicle interactions.
When in edit mode, clicks place/edit obstacles.
When in play mode, clicks select vehicles and show info.
Routes all input through to the appropriate state mutation
via the Kernel (never writes state directly).
*/

import { addObstacle, removeObstacle } from '../state/obstacle-manager.js';
import { addGravitySource } from '../state/gravity-source-manager.js';
import { emitAddObstacle, emitRemoveObstacle } from '../bridge/combat-socket.js';

export class InputHandler {
  constructor(canvas, renderer, scene, environment) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.scene = scene;
    this.environment = environment;
    this.currentTool = 'select';
    this._obstacleCounter = 0;
    this._bindings = [];
  }

  initialize() {
    this._bindEvents();
  }

  setTool(toolId) {
    this.currentTool = toolId;
    // Change cursor based on tool
    const cursors = {
      select: 'default',
      pan: 'grab',
      rotate: 'crosshair',
      zoom: 'zoom-in',
      'add-building': 'crosshair',
      'add-hill': 'crosshair',
      'add-wall': 'crosshair',
      'add-planet': 'crosshair',
      'add-moon': 'crosshair',
      'add-asteroid': 'crosshair',
      'add-station': 'crosshair',
      'add-cloud': 'crosshair',
      'add-island': 'crosshair',
      'add-reef': 'crosshair',
      'set-grade': 'crosshair',
      'set-ceiling': 'crosshair',
      'set-depth': 'crosshair'
    };
    this.canvas.style.cursor = cursors[toolId] ?? 'default';
  }

  _bindEvents() {
    const onClick = (ev) => this._onClick(ev);
    const onMove = (ev) => this._onMouseMove(ev);

    this.canvas.addEventListener('click', onClick);
    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());

    this._bindings.push(
      { type: 'click', fn: onClick },
      { type: 'mousemove', fn: onMove }
    );
  }

  _onClick(ev) {
    if (!this.renderer.editMode) return;

    const rect = this.canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const world = this.renderer.screenToWorld(sx, sy);

    const tool = this.currentTool;

    // Obstacle placement tools
    if (tool.startsWith('add-')) {
      this._placeObstacle(tool, world);
      return;
    }

    // Right-click to remove
    if (ev.button === 2) {
      this._removeNearestObstacle(world);
    }
  }

  _onMouseMove(ev) {
    // Update cursor coordinates in status bar
    const rect = this.canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const world = this.renderer.screenToWorld(sx, sy);

    const coordsEl = document.getElementById('vc-cursor-coords');
    if (coordsEl) {
      coordsEl.textContent = `X: ${Math.round(world.x)} Y: ${Math.round(world.y)} Z: ${Math.round(world.z)}`;
    }
  }

  // Place an obstacle based on the current tool
  _placeObstacle(tool, worldPos) {
    const id = `obs_${Date.now()}_${this._obstacleCounter++}`;
    const domain = this.environment.domain;

    const OBSTACLE_MAP = {
      'add-building': { type: 'building', name: 'Building', size: 30 },
      'add-hill':     { type: 'hill', name: 'Hill', size: 60 },
      'add-wall':     { type: 'wall', name: 'Wall', size: 20 },
      'add-planet':   { type: 'planet', name: 'Planet', size: 100 },
      'add-moon':     { type: 'moon', name: 'Moon', size: 40 },
      'add-asteroid': { type: 'asteroid', name: 'Asteroid', size: 15 },
      'add-station':  { type: 'station', name: 'Station', size: 25 },
      'add-cloud':    { type: 'cloud', name: 'Cloud', size: 80 },
      'add-island':   { type: 'island', name: 'Island', size: 50 },
      'add-reef':     { type: 'reef', name: 'Reef', size: 30 }
    };

    const template = OBSTACLE_MAP[tool];
    if (!template) return;

    const obstacleData = {
      id,
      type: template.type,
      name: `${template.name} ${this._obstacleCounter}`,
      position: { x: worldPos.x, y: worldPos.y, z: worldPos.z ?? 0 },
      size: template.size
    };

    // Gravity sources are special: planets/moons affect physics
    if (template.type === 'planet' || template.type === 'moon') {
      const mass = template.type === 'planet' ? 100 : 10;
      addGravitySource(this.scene.id, {
        id,
        name: obstacleData.name,
        position: obstacleData.position,
        mass,
        radius: template.size
      });
    }

    // Also add as visual obstacle
    addObstacle(this.scene.id, obstacleData);

    // Broadcast to other clients
    emitAddObstacle(this.scene.id, obstacleData);
  }

  _removeNearestObstacle(worldPos) {
    const obstacles = this.environment.obstacles ?? [];
    let nearestId = null;
    let nearestDist = Infinity;

    for (const obs of obstacles) {
      const dx = obs.position.x - worldPos.x;
      const dy = obs.position.y - worldPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const threshold = (obs.size ?? 20) * 1.5;

      if (dist < threshold && dist < nearestDist) {
        nearestDist = dist;
        nearestId = obs.id;
      }
    }

    if (nearestId) {
      removeObstacle(this.scene.id, nearestId);
      emitRemoveObstacle(this.scene.id, nearestId);
    }
  }

  destroy() {
    for (const binding of this._bindings) {
      this.canvas.removeEventListener(binding.type, binding.fn);
    }
    this._bindings = [];
  }
}