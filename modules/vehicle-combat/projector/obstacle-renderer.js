/*
Obstacle Renderer - draws environment obstacles (buildings, planets,
asteroids, islands, etc.) in the 3D scene.
Domain-specific shapes and colors. PROJECTOR layer only.
*/

export class ObstacleRenderer {
  constructor(gl, shaderProgram) {
    this.gl = gl;
    this.program = shaderProgram;
    this._buffer = gl.createBuffer();
  }

  // Render all obstacles for a given domain
  render(obstacles, domain, camera) {
    const gl = this.gl;
    if (!obstacles || obstacles.length === 0) return;

    for (const obs of obstacles) {
      this._renderObstacle(obs, domain);
    }
  }

  _renderObstacle(obs, domain) {
    const gl = this.gl;
    const pos = obs.position ?? { x: 0, y: 0, z: 0 };
    const size = obs.size ?? 20;
    const color = this._getColor(domain, obs.type);

    // Draw based on shape type
    if (obs.type === 'planet' || obs.type === 'moon') {
      this._drawCircle(pos, size, color);
    } else if (obs.type === 'building') {
      this._drawBox(pos, size, color);
    } else if (obs.type === 'hill' || obs.type === 'asteroid') {
      this._drawDiamond(pos, size, color);
    } else {
      this._drawBox(pos, size, color);
    }
  }

  _drawCircle(pos, radius, color) {
    const gl = this.gl;
    const segments = 24;
    const verts = [];

    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      verts.push(
        pos.x, pos.y, pos.z,  ...color,
        pos.x + Math.cos(a1) * radius, pos.y + Math.sin(a1) * radius, pos.z,  ...color,
        pos.x + Math.cos(a2) * radius, pos.y + Math.sin(a2) * radius, pos.z,  ...color
      );
    }

    this._drawVerts(verts);
  }

  _drawBox(pos, size, color) {
    const gl = this.gl;
    const s = size / 2;
    const verts = [
      pos.x - s, pos.y - s, pos.z,  ...color,
      pos.x + s, pos.y - s, pos.z,  ...color,
      pos.x + s, pos.y + s, pos.z,  ...color,
      pos.x - s, pos.y - s, pos.z,  ...color,
      pos.x + s, pos.y + s, pos.z,  ...color,
      pos.x - s, pos.y + s, pos.z,  ...color
    ];
    this._drawVerts(verts);
  }

  _drawDiamond(pos, size, color) {
    const s = size / 2;
    const verts = [
      pos.x, pos.y + s, pos.z,  ...color,
      pos.x - s, pos.y, pos.z,  ...color,
      pos.x + s, pos.y, pos.z,  ...color,
      pos.x, pos.y + s, pos.z,  ...color,
      pos.x + s, pos.y, pos.z,  ...color,
      pos.x, pos.y - s, pos.z,  ...color
    ];
    this._drawVerts(verts);
  }

  _drawVerts(flatVerts) {
    const gl = this.gl;
    const verts = new Float32Array(flatVerts);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);

    const stride = 7 * 4;
    const aPos = gl.getAttribLocation(this.program, 'aPosition');
    const aCol = gl.getAttribLocation(this.program, 'aColor');

    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, stride, 12);

    gl.drawArrays(gl.TRIANGLES, 0, verts.length / 7);
  }

  _getColor(domain, type) {
    const colors = {
      space: { planet: [0.27, 0.53, 1, 1], moon: [0.67, 0.67, 0.67, 1], asteroid: [0.53, 0.4, 0.27, 1], station: [1, 0.67, 0, 1] },
      land: { building: [0.33, 0.33, 0.33, 1], hill: [0.13, 0.47, 0.13, 1], wall: [0.53, 0.53, 0.53, 1] },
      air: { cloud: [0.8, 0.8, 0.8, 0.3] },
      water: { island: [0.13, 0.47, 0.13, 1], reef: [0.27, 0.53, 0.27, 1] }
    };
    return colors[domain]?.[type] ?? [0.53, 0.53, 0.53, 1];
  }
}