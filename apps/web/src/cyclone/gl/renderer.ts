/**
 * Draw, and nothing else.
 *
 * No `requestAnimationFrame` here: the caller owns the clock, so the loop can be
 * paused when the tab is hidden, stopped under reduced motion, and driven
 * frame-by-frame in a test. The renderer also owns no data: it receives one
 * instance per visible card and draws.
 */

export interface Instance {
  /** Normalised screen position of the card centre (0..1). */
  readonly x: number;
  readonly y: number;
  /** Normalised half-size. */
  readonly scale: number;
  /** Layer in the texture array, or -1 when no texture is resident yet. */
  readonly layer: number;
  readonly alpha: number;
}

export interface Frame {
  readonly instances: readonly Instance[];
  readonly background: readonly [number, number, number];
}

export interface Renderer {
  resize(width: number, height: number, dpr: number): void;
  draw(frame: Frame): number;
  dispose(): void;
}

const QUAD = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
const INDICES = new Uint16Array([0, 1, 2, 2, 1, 3]);
const FLOATS_PER_INSTANCE = 6;

export function createRenderer(gl: WebGL2RenderingContext, program: WebGLProgram): Renderer {
  const vao = gl.createVertexArray();
  const quadBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();
  const instanceBuffer = gl.createBuffer();

  if (vao === null || quadBuffer === null || indexBuffer === null || instanceBuffer === null) {
    throw new Error("could not allocate buffers");
  }

  gl.bindVertexArray(vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
  const corner = gl.getAttribLocation(program, "aCorner");
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, INDICES, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  const stride = FLOATS_PER_INSTANCE * 4;
  for (const [name, size, offset] of [
    ["aOffset", 2, 0],
    ["aScale", 2, 2],
    ["aLayer", 1, 4],
  ] as const) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset * 4);
    gl.vertexAttribDivisor(location, 1);
  }

  const alphaLocation = gl.getAttribLocation(program, "aAlpha");
  gl.enableVertexAttribArray(alphaLocation);
  gl.vertexAttribPointer(alphaLocation, 1, gl.FLOAT, false, stride, 5 * 4);
  gl.vertexAttribDivisor(alphaLocation, 1);

  gl.bindVertexArray(null);
  gl.useProgram(program);

  let instanceData = new Float32Array(0);
  let drawn = 0;

  return {
    resize(width, height, dpr) {
      // A 3x phone would triple the pixel count for no visible gain.
      const ratio = Math.min(2, Math.max(1, dpr));
      const w = Math.max(1, Math.floor(width * ratio));
      const h = Math.max(1, Math.floor(height * ratio));
      if (gl.canvas.width !== w) gl.canvas.width = w;
      if (gl.canvas.height !== h) gl.canvas.height = h;
      gl.viewport(0, 0, w, h);
    },

    draw(frame) {
      gl.clearColor(frame.background[0], frame.background[1], frame.background[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      drawn = 0;

      // Nothing resident yet: a clear, not a crash (the first frames of a load).
      if (frame.instances.length === 0) return 0;

      if (instanceData.length < frame.instances.length * FLOATS_PER_INSTANCE) {
        instanceData = new Float32Array(frame.instances.length * FLOATS_PER_INSTANCE);
      }

      frame.instances.forEach((instance, index) => {
        const at = index * FLOATS_PER_INSTANCE;
        instanceData[at] = instance.x;
        instanceData[at + 1] = instance.y;
        instanceData[at + 2] = instance.scale;
        instanceData[at + 3] = instance.scale;
        instanceData[at + 4] = instance.layer;
        instanceData[at + 5] = instance.alpha;
      });

      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        instanceData.subarray(0, frame.instances.length * FLOATS_PER_INSTANCE),
        gl.DYNAMIC_DRAW,
      );

      gl.bindVertexArray(vao);
      gl.drawElementsInstanced(
        gl.TRIANGLES,
        INDICES.length,
        gl.UNSIGNED_SHORT,
        0,
        frame.instances.length,
      );
      gl.bindVertexArray(null);
      drawn = frame.instances.length;
      return drawn;
    },

    dispose() {
      gl.deleteBuffer(quadBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteBuffer(instanceBuffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    },
  };
}
