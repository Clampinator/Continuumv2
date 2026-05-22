/*
Foundry Application shell for the 3D Vehicle Combat scene.
Opens as a Foundry ApplicationV2 window with a canvas for
3D environment rendering. The canvas is managed by the
TacticalSceneRenderer which draws ships, obstacles, trajectories, etc.

This is the PROJECTOR layer: it receives manifests and draws pixels.
No domain logic lives here.
*/

import { getSceneEnvironment } from '../state/scene-state-manager.js';

let _activeApp = null;
let _VehicleCombatApp = null;

/**
 * Lazily creates the VehicleCombatApp class.
 * Must be called after Foundry is ready because HandlebarsApplicationMixin
 * requires foundry.applications.api to exist.
 */
function _getAppClass() {
  if (_VehicleCombatApp) return _VehicleCombatApp;

  const Base = foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.ApplicationV2
  );

  _VehicleCombatApp = class VehicleCombatApp extends Base {
    constructor(options = {}) {
      super(options);
      this.foundryScene = options.scene;
      this.environment = options.environment;
      this.renderer = null;
      this.inputHandler = null;
      this._editMode = false;
      this._editTool = 'select';
      this._hookIds = [];
    }

    static DEFAULT_OPTIONS = {
      tag: 'div',
      classes: ['vehicle-combat'],
      window: {
        title: 'Vehicle Combat Scene',
        resizable: true,
        minimizable: true
      },
      position: {
        width: 1200,
        height: 800
      }
    };

    static PARTS = {
      canvas: {
        template: 'systems/continuum-v2/templates/vehicle-combat/scene-canvas.hbs'
      }
    };

    async _prepareContext(options) {
      const domainLabel = this.environment.domain.charAt(0).toUpperCase() + this.environment.domain.slice(1);
      return {
        domain: this.environment.domain,
        domainLabel,
        gravity: this.environment.gravity,
        atmosphereDensity: this.environment.atmosphereDensity,
        tools: this._getToolsForDomain()
      };
    }

    _onRender(context, options) {
      super._onRender(context, options);

      const canvasEl = this.element.querySelector('.vc-3d-canvas');
      if (!canvasEl) return;

      // Lazy-load renderers only when the app actually opens
      import('./tactical-scene-renderer.js').then(({ TacticalSceneRenderer }) => {
        this.renderer = new TacticalSceneRenderer(canvasEl, this.environment);
        this.renderer.initialize();
      });

      import('./input-handler.js').then(({ InputHandler }) => {
        this.inputHandler = new InputHandler(canvasEl, this.renderer, this.foundryScene, this.environment);
        this.inputHandler.initialize();
      });

      // Edit mode toggle
      const editBtn = this.element.querySelector('.vc-edit-toggle');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          this._editMode = !this._editMode;
          editBtn.classList.toggle('active', this._editMode);
          if (this.renderer) this.renderer.setEditMode(this._editMode);
        });
      }

      // Tool selection
      this.element.querySelectorAll('.vc-tool-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const toolId = btn.dataset.tool;
          this._editTool = toolId;
          if (this.inputHandler) this.inputHandler.setTool(toolId);
          this.element.querySelectorAll('.vc-tool-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      // Listen for scene updates
      const envHook = Hooks.on('vehicle-combat.environmentChanged', (scene) => {
        if (scene.id === this.foundryScene.id) {
          this.environment = getSceneEnvironment(scene);
          if (this.renderer) this.renderer.updateEnvironment(this.environment);
        }
      });

      this._hookIds = [envHook];
    }

    // Domain-specific editing tools
    _getToolsForDomain() {
      const baseTools = [
        { id: 'select', label: 'Select', icon: 'fa-mouse-pointer' },
        { id: 'pan', label: 'Pan', icon: 'fa-arrows-alt' },
        { id: 'rotate', label: 'Rotate', icon: 'fa-sync' },
        { id: 'zoom', label: 'Zoom', icon: 'fa-search-plus' }
      ];

      switch (this.environment?.domain) {
        case 'land':
          return [...baseTools,
            { id: 'add-building', label: 'Building', icon: 'fa-building' },
            { id: 'add-hill', label: 'Hill', icon: 'fa-mountain' },
            { id: 'add-wall', label: 'Wall', icon: 'fa-border-all' },
            { id: 'set-grade', label: 'Set Grade', icon: 'fa-sort-amount-up' }
          ];
        case 'air':
          return [...baseTools,
            { id: 'add-cloud', label: 'Cloud Layer', icon: 'fa-cloud' },
            { id: 'set-ceiling', label: 'Set Ceiling', icon: 'fa-arrow-up' }
          ];
        case 'water':
          return [...baseTools,
            { id: 'add-island', label: 'Island', icon: 'fa-map' },
            { id: 'add-reef', label: 'Reef', icon: 'fa-minus' },
            { id: 'set-depth', label: 'Set Depth', icon: 'fa-arrow-down' }
          ];
        case 'space':
          return [...baseTools,
            { id: 'add-planet', label: 'Planet', icon: 'fa-globe-americas' },
            { id: 'add-moon', label: 'Moon', icon: 'fa-moon' },
            { id: 'add-asteroid', label: 'Asteroid', icon: 'fa-meteor' },
            { id: 'add-station', label: 'Station', icon: 'fa-satellite' }
          ];
        default:
          return baseTools;
      }
    }

    _onClose(options) {
      if (this.renderer) this.renderer.destroy();
      if (this.inputHandler) this.inputHandler.destroy();
      for (const hookId of this._hookIds) {
        if (hookId) Hooks.off('vehicle-combat.environmentChanged', hookId);
      }
      if (_activeApp === this) _activeApp = null;
      super._onClose(options);
    }
  };

  return _VehicleCombatApp;
}

/**
 * Opens the Vehicle Combat 3D scene for a given Foundry Scene.
 * @param {Scene} scene - The Foundry scene document
 */
export function openVehicleCombatScene(scene) {
  if (_activeApp) {
    _activeApp.close();
    _activeApp = null;
  }

  const env = getSceneEnvironment(scene);
  if (env.domain === 'none') {
    ui.notifications.warn('Vehicle Combat is not enabled for this scene.');
    return;
  }

  const AppClass = _getAppClass();
  const app = new AppClass({ scene, environment: env });
  _activeApp = app;
  app.render(true);
  return app;
}