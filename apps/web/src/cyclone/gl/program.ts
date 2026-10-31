/**
 * One program, instanced.
 *
 * A `sampler2DArray` instead of an atlas: every card is its own layer, so the
 * fragment shader indexes with `texture(uAtlas, vec3(uv, layer))` and there is no
 * UV arithmetic, no padding, no edge bleed and no re-packing when a card leaves
 * the window. An atlas would need all of that to save the same texture memory.
 *
 * The geometry is one unit quad; per-instance attributes carry where it goes and
 * which layer it samples.
 */

export const VERTEX_SHADER = `#version 300 es
in vec2 aCorner;
in vec2 aOffset;
in vec2 aScale;
in float aLayer;
in float aAlpha;

out vec2 vUv;
out float vLayer;
out float vAlpha;

void main() {
  vec2 world = aOffset + aCorner * aScale;
  // Screen-space placement: x right, y down, matching the DOM and the projection.
  vec2 clip = vec2(world.x * 2.0 - 1.0, 1.0 - world.y * 2.0);
  vUv = aCorner;
  vLayer = aLayer;
  vAlpha = aAlpha;
  gl_Position = vec4(clip, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision mediump float;

in vec2 vUv;
in float vLayer;
in float vAlpha;
uniform mediump sampler2DArray uAtlas;
out vec4 outColor;

void main() {
  vec4 texel = texture(uAtlas, vec3(vUv, vLayer));
  // Distance-based fade replaces a depth-of-field pass (D5): cheap, and it does
  // not need a second render target.
  outColor = vec4(texel.rgb, texel.a * vAlpha);
}
`;

export function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (shader === null) throw new Error("could not create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown";
    gl.deleteShader(shader);
    throw new Error(`shader failed to compile: ${log}`);
  }
  return shader;
}

export function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (program === null) throw new Error("could not create program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown";
    gl.deleteProgram(program);
    throw new Error(`program failed to link: ${log}`);
  }
  return program;
}
