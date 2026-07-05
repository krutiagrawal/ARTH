import { Skia } from '@shopify/react-native-skia';
import type { ForestTreeShape } from '../constants/forestThemePalettes';

/** Builds trunk + foliage Skia paths for a single tree, anchored so its base sits on `groundY`. */
export function drawTreePath(type: ForestTreeShape, x: number, h: number, w: number, groundY: number) {
  const path = Skia.Path.Make();
  const trunkPath = Skia.Path.Make();
  const trunkW = w * 0.12;
  const trunkH = h * 0.25;

  // Trunk
  trunkPath.addRect(Skia.XYWHRect(x - trunkW / 2, groundY - trunkH, trunkW, trunkH));

  if (type === 'pine') {
    // Triangle pine
    for (let tier = 0; tier < 3; tier++) {
      const tierH = h * 0.4;
      const tierW = w * (1 - tier * 0.2);
      const tierY = groundY - trunkH - tier * tierH * 0.55;
      path.moveTo(x, tierY - tierH);
      path.lineTo(x + tierW / 2, tierY);
      path.lineTo(x - tierW / 2, tierY);
      path.close();
    }
  } else if (type === 'oak') {
    // Round canopy
    path.addOval(Skia.XYWHRect(x - w / 2, groundY - trunkH - h * 0.85, w, h * 0.8));
    path.addOval(Skia.XYWHRect(x - w * 0.35, groundY - trunkH - h, w * 0.7, h * 0.6));
  } else if (type === 'birch') {
    // Slim oval
    path.addOval(Skia.XYWHRect(x - w * 0.35, groundY - trunkH - h * 0.9, w * 0.7, h * 0.85));
  } else {
    // Fruit tree — rounded with slight droop
    path.addOval(Skia.XYWHRect(x - w * 0.45, groundY - trunkH - h * 0.85, w * 0.9, h * 0.75));
  }

  return { path, trunkPath };
}
