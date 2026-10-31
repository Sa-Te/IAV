// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { createContext, REQUIRED_LAYERS } from "./context.js";

describe("createContext", () => {
  it("returns null instead of throwing when the canvas has no WebGL2", () => {
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(null);

    expect(createContext(canvas)).toBeNull();
  });

  it("refuses a GPU with fewer layers than the window needs", () => {
    const canvas = document.createElement("canvas");
    const gl = {
      MAX_ARRAY_TEXTURE_LAYERS: 0x88ff,
      MAX_TEXTURE_SIZE: 0x0d33,
      getParameter: (parameter: number) => (parameter === 0x88ff ? REQUIRED_LAYERS - 1 : 4096),
      getExtension: () => null,
    };
    vi.spyOn(canvas, "getContext").mockReturnValue(gl as unknown as WebGL2RenderingContext);

    expect(createContext(canvas)).toBeNull();
  });

  it("keeps the constant on the window path honest", () => {
    expect(REQUIRED_LAYERS).toBe(96);
  });
});
