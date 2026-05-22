/*
Ship Model Renderer - draws vehicle meshes in the 3D scene.
Receives vehicle position/velocity data and renders a simple
triangular marker with damage coloring.
PROJECTOR layer: no domain logic here.
*/

export class ShipModelRenderer {
  constructor(gl, shaderProgram) {
    this.gl = gl;
    this.program = shaderProgram;
    this._buffer = gl.createBuffer();
  }

  // Render a single ship at its world position
  render(vehicleData, camera) {
    const gl = this.gl;
    const pos = vehicleData.position ?? { x: 0, y: 0, z: 0 };

    // Color: cyan for friendly, magenta for hostile (based on metadata)
    const color = vehicleData.isHostile ? [1, 0, 1, 1] : [0, 0.9, 1, 1];
    const size = 10;

    // Simple triangle vertices
    const verts = new Float32Array([
      pos.x, pos.y + size, pos.z,  ...color,
      pos.x - size * 0.6, pos.y - size * 0.4, pos.z,  ...color,
      pos.x + size * 0.6, pos.y - size * 0.4, pos.z,  ...color
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);

    const stride = 7 * 4;
    const aPos = gl.getAttribLocation(this.program, 'aPosition');
    const aCol = gl.getAttribLocation(this.program, 'aColor');

    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, stride, 12);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Draw velocity vector as a line
    if (vehicleData.velocity) {
      this._renderVelocityLine(vehicleData, color);
    }
  }

  _renderVelocityLine(vehicleData, color) {
    const gl = this.gl;
    const pos = vehicleData.position;
    const vel = vehicleData.velocity;
    const scale = 2;

    const lineColor = [1, 0, 1, 0.6];
    const verts = new Float32Array([
      pos.x, pos.y, pos.z,  ...lineColor,
      pos.x + vel.x * scale, pos.y + vel.y * scale, pos.z + vel.z * scale,  ...lineColor
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);

    const stride = 7 * 4;
    const aPos = gl.getAttribLocation(this.program, 'aPosition');
    const aCol = gl.getAttribLocation(this.program, 'aColor');

    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, stride, 12);

    gl.drawArrays(gl.LINES, 0, 2);
  }
}