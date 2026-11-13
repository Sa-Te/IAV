// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { createRenderer } from "./renderer.js";

/**
 * A minimal GL double: enough of the API for the renderer to bind and draw, and
 * a counter for what actually reached the GPU. Pixels are not asserted here —
 * jsdom has no WebGL, and a screenshot is not a test.
 */
function fakeGl() {
  const calls = { drawElementsInstanced: 0, clear: 0 };
  const gl = {
    canvas: { width: 0, height: 0 },
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    FLOAT: 5126,
    TRIANGLES: 4,
    UNSIGNED_SHORT: 5123,
    COLOR_BUFFER_BIT: 16384,
    createVertexArray: () => ({}),
    createBuffer: () => ({}),
    bindVertexArray: () => undefined,
    bindBuffer: () => undefined,
    bufferData: () => undefined,
    getAttribLocation: () => 0,
    enableVertexAttribArray: () => undefined,
    vertexAttribPointer: () => undefined,
    vertexAttribDivisor: () => undefined,
    useProgram: () => undefined,
    viewport: () => undefined,
    clearColor: () => undefined,
    clear: () => {
      calls.clear += 1;
    },
    drawElementsInstanced: () => {
      calls.drawElementsInstanced += 1;
    },
    deleteBuffer: () => undefined,
    deleteVertexArray: () => undefined,
    deleteProgram: () => undefined,
  };
  return { gl: gl as unknown as WebGL2RenderingContext, calls };
}

describe("renderer", () => {
  it("clears but draws nothing when no texture is resident", () => {
    const { gl, calls } = fakeGl();
    const renderer = createRenderer(gl, {} as WebGLProgram);

    const drawCalls = renderer.draw({ instances: [], background: [0, 0, 0] });

    expect(drawCalls).toBe(0);
    expect(calls.clear).toBe(1);
    expect(calls.drawElementsInstanced).toBe(0);
  });

  it("draws one instanced call regardless of how many cards are visible", () => {
    const { gl, calls } = fakeGl();
    const renderer = createRenderer(gl, {} as WebGLProgram);

    const drawCalls = renderer.draw({
      instances: Array.from({ length: 96 }, (_, index) => ({
        x: 0.5,
        y: 0.5,
        scaleX: 0.05,
        scaleY: 0.05,
        uvX: 1,
        uvY: 1,
        layer: index,
        alpha: 0.8,
      })),
      background: [0, 0, 0],
    });

    // The report is draw calls, not cards: 96 cards are one instanced call (ADR 0010).
    expect(drawCalls).toBe(1);
    expect(calls.drawElementsInstanced).toBe(1);
  });

  it("caps device pixel ratio at 2", () => {
    const { gl } = fakeGl();
    const renderer = createRenderer(gl, {} as WebGLProgram);

    renderer.resize(400, 300, 3);

    expect(gl.canvas.width).toBe(800);
    expect(gl.canvas.height).toBe(600);
  });
});
