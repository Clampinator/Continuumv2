/*
Grid Renderer - draws the domain-specific reference grid on the 3D floor.
SPACE: star-field dotted grid
LAND: green terrain grid
AIR: blue altitude grid layers
WATER: blue depth grid
PROJECTOR layer only.
*/

export class GridRenderer {
  constructor(gl, shaderProgram) {
    this.gl = gl;
    this.program = shaderProgram;
    this._buffer = gl.createBuffer();
  }

  render(environment, camera) {
    const gl = this.gl;
    switch (environment.domain) {
      case 'space':
        this._renderSpaceGrid();
        break;
      case 'land':
        this._renderLandGrid();
        break;
      case 'air':
        this._renderAirGrid();
        break;
      case 'water':
        this._renderWaterGrid();
        break;
    }
  }

  // Dotted/sparse grid for space
  _renderSpaceGrid() {
    const gl = this.gl;
    const color = [0.1, 0.1, 0.2, 0.3];
    const spacing = 50;
    const range = 500;
    const verts = [];

    for (let x = -range; x <= range; x += spacing) {
      for (let z = -range; z <= range; z += spacing) {
        // Dots at intersections
        verts.push(
          x - 0.5, 0, z,  ...color,
          x + 0.5, 0, z,  ...color,
          x, 0, z + 0.5,  ...color,
          x - 0.5, 0, z,  ...color,
          x, 0, z + 0.5,  ...color,
          x + 0.5, 0, z,  ...color
        );
      }
    }

    this._drawVerts(verts);
  }

  // Green terrain grid for land
  _renderLandGrid() {
    const gl = this.gl;
    const color = [0.1, 0.3, 0.1, 0.4];
    const spacing = 50;
    const range = 500;
    const verts = [];

    for (let i = -range; i <= range; i += spacing) {
      verts.push(
        -range, 0, i,  ...color,
        range, 0, i,  ...color,
        i, 0, -range,  ...color,
        i, 0, range,  ...color
      );
    }
    this._drawVerts(verts, gl.LINES);
  }

  // Blue altitude grid layers for air
  _renderAirGrid() {
    const gl = this.gl;
    const ground = [0.1, 0.2, 0.3, 0.3];
    const ceiling = [0.2, 0.1, 0.3, 0.2];
    const spacing = 50;
    const range = 500;
    const ceilingH = 200;
    const verts = [];

    // Ground grid
    for (let i = -range; i <= range; i += spacing) {
      verts.push(-range, 0, i, ...ground, range, 0, i, ...ground);
      verts.push(i, 0, -range, ...ground, i, 0, range, ...ground);
    }
    // Ceiling grid
    for (let i = -range; i <= range; i += spacing) {
      verts.push(-range, ceilingH, i, ...ceiling, range, ceilingH, i, ...ceiling);
      verts.push(i, ceilingH, -range, ...ceiling, i, ceilingH, range, ...ceiling);
    }
    this._drawVerts(verts, gl.LINES);
  }

  // Blue depth grid for water
  _renderWaterGrid() {
    const gl = this.gl;
    const surface = [0.1, 0.3, 0.5, 0.4];
    const floor = [0.05, 0.15, 0.3, 0.3];
    const spacing = 50;
    const range = 500;
    const depth = -100;
    const verts = [];

    for (let i = -range; i <= range; i += spacing) {
      verts.push(-range, 0, i, ...surface, range, 0, i, ...surface);
      verts.push(i, 0, -range, ...surface, i, 0, range, ...surface);
      verts.push(-range, depth, i, ...floor, range, depth, i, ...floor);
      verts.push(i, depth, -range, ...floor, i, depth, range, ...floor);
    }
    this._drawVerts(verts, gl.LINES);
  }

  _drawVerts(flatVerts, mode) {
    if (flatVerts.length === 0) return;
    const gl = this.gl;
    const drawMode = mode ?? gl.TRIANGLES;
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

    gl.drawArrays(drawMode, 0, verts.length / 7);
  }
}