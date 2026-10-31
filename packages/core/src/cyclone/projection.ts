/**
 * World → screen, by hand.
 *
 * No matrices library: the transform is one yaw, one pitch, one translation and a
 * perspective divide. Writing it out is shorter than a dependency and makes the
 * screen coordinates — which picking and keyboard focus depend on — testable.
 *
 * Screen space matches the DOM: x right, y **down**, origin top-left.
 */

import type { CardTransform } from "./layout.js";

export interface Camera {
  /** Radians, rotation around the vertical axis. */
  readonly yaw: number;
  /** Radians, rotation around the horizontal axis. */
  readonly pitch: number;
  /** Camera distance from the origin, along +Z. */
  readonly distance: number;
  /** Vertical field of view, radians. */
  readonly fovY: number;
  readonly viewport: { readonly width: number; readonly height: number };
}

export interface ScreenCard {
  readonly index: number;
  /** Pixels from the left. */
  readonly x: number;
  /** Pixels from the top. */
  readonly y: number;
  /** -z in camera space: positive in front of the camera, larger is nearer. */
  readonly depth: number;
  readonly visible: boolean;
}

const NEAR = 0.2;

export function projectCards(
  cards: readonly CardTransform[],
  camera: Camera,
): readonly ScreenCard[] {
  const { width, height } = camera.viewport;
  const aspect = width <= 0 || height <= 0 ? 1 : width / height;
  const focal = 1 / Math.tan(camera.fovY / 2);
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);

  return cards.map((card) => {
    // World position on the spiral.
    const wx = card.radius * Math.cos(card.angle);
    const wy = card.y;
    const wz = card.radius * Math.sin(card.angle);

    // Yaw around Y.
    const x1 = wx * cosYaw - wz * sinYaw;
    const z1 = wx * sinYaw + wz * cosYaw;
    // Pitch around X.
    const y2 = wy * cosPitch - z1 * sinPitch;
    const z2 = wy * sinPitch + z1 * cosPitch;

    // Camera sits at +distance on Z and looks down -Z.
    const cameraZ = z2 - camera.distance;
    const depth = -cameraZ;
    const visible = depth > NEAR;

    if (!visible) {
      return { index: card.index, x: 0, y: 0, depth, visible: false };
    }

    const ndcX = (focal / aspect) * (x1 / depth);
    // World y is up; screen y is down.
    const ndcY = focal * (y2 / depth);

    return {
      index: card.index,
      x: (ndcX * 0.5 + 0.5) * width,
      y: (0.5 - ndcY * 0.5) * height,
      depth,
      visible: true,
    };
  });
}
