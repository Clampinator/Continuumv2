/**
 * DUMB RENDERER: YET RENDERER
 * Renders The Yet nodes as SVG elements on the span graph.
 *
 * Yets are floating future events that stalk the NOW node.
 * They exhibit three visual states:
 *   LOCKED  (hasAge || hasDate): Outlined ghost, fixed on at least one axis. No drift animation.
 *   DRIFTING (!hasAge && !hasDate): Outlined + dashed ghost, Brownian motion via CSS. Floats ahead of NOW.
 *   VIOLATED (age-locked and NOW has passed their age): Red shake + particle burst. Full fill.
 *
 * This renderer is a dumb pipe: it receives manifest data and draws pixels.
 * All position and violation logic is computed by the Kernel (yet-physics.js)
 * and projected by the manifest generator.
 */

const svgNS = 'http://www.w3.org/2000/svg';

// Particle configs for violated Yets (8 directions, varied distances)
const PARTICLE_CONFIGS = [
  { angle: 0, dist: 18 },
  { angle: 45, dist: 14 },
  { angle: 90, dist: 20 },
  { angle: 135, dist: 13 },
  { angle: 180, dist: 19 },
  { angle: 225, dist: 15 },
  { angle: 270, dist: 17 },
  { angle: 315, dist: 12 }
];

export class YetRenderer {
  constructor(viewport, parentGroup) {
    this.viewport = viewport;
    this.group = this._createYetGroup(parentGroup);
  }

  /**
   * Renders Yet nodes from the manifest.
   * Wipes and redraws every frame (dumb pipe, no incremental updates).
   *
   * @param {Object} manifest - RenderManifest with yetNodes array
   */
  render(manifest) {
    if (!this.group) return;
    // Clear previous frame
    this.group.innerHTML = '';

    const yetNodes = manifest?.yetNodes;
    if (!yetNodes || yetNodes.length === 0) return;

    yetNodes.forEach(yet => {
      if (!Number.isFinite(yet.x) || !Number.isFinite(yet.y)) return;

      // PARTICLES (rendered first so they sit behind the node)
      if (yet.isViolated) {
        this._renderParticles(yet);
      }

      // YET NODE CIRCLE
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', yet.x);
      circle.setAttribute('cy', yet.y);
      circle.setAttribute('r', '6');
      circle.classList.add('graph-node-yet');
      circle.setAttribute('data-yet-id', yet.id);
      circle.setAttribute('data-yet-desc', yet.description || '');
      circle.style.cursor = yet.isDragging ? 'grabbing' : 'grab';

      // Lock state determines animation class
      if (yet.hasAge || yet.hasDate) {
        circle.classList.add('graph-node-yet-locked');
      } else {
        circle.classList.add('graph-node-yet-drifting');
      }

      // Violation overrides with shake + glow
      if (yet.isViolated) {
        circle.classList.add('graph-node-yet-violated');
        // Shake params pre-computed by Kernel (computeYetShakeParams)
        if (yet.shakeAmplitude != null) {
          circle.style.setProperty('--yet-shake-amp', yet.shakeAmplitude);
        }
        if (yet.shakeDuration != null) {
          circle.style.setProperty('--yet-shake-dur', yet.shakeDuration);
        }
      }

      this.group.appendChild(circle);
    });
  }

  /**
   * Renders particle circles for a violated Yet.
   * Particles burst outward in 8 directions with CSS animation.
   */
  _renderParticles(yet) {
    const durOffset = yet.particleDurationOffset || 0;
    PARTICLE_CONFIGS.forEach((cfg, i) => {
      const rad = (cfg.angle * Math.PI) / 180;
      const tx = Math.cos(rad) * cfg.dist;
      const ty = Math.sin(rad) * cfg.dist;
      const dur = 0.55 + (i % 3) * 0.15;
      const delay = (i / PARTICLE_CONFIGS.length) * 0.45;
      const r = i % 2 === 0 ? 2 : 1.5;
      const col = i % 3 === 0 ? '#ff2222' : i % 3 === 1 ? '#ff9f43' : '#ffdd00';

      const p = document.createElementNS(svgNS, 'circle');
      p.classList.add('graph-yet-particle');
      p.setAttribute('cx', yet.x);
      p.setAttribute('cy', yet.y);
      p.setAttribute('r', r);
      p.setAttribute('fill', col);
      p.style.setProperty('--tx', `${tx}px`);
      p.style.setProperty('--ty', `${ty}px`);
      p.style.setProperty('--dur', `${Math.max(0.3, dur - durOffset)}s`);
      p.style.setProperty('--delay', `${delay}s`);
      this.group.appendChild(p);
    });
  }

  _createYetGroup(parent) {
    if (typeof document === 'undefined') return null;
    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('class', 'span-graph-yet-nodes');
    parent.appendChild(g);
    return g;
  }
}