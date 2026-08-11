/* ==================================================================================
   Homepage hero — frame-sequence decode/draw worker.
   ------------------------------------------------------------------------------
   Owns everything about turning a scroll-derived frame index into pixels on the
   hero's <canvas>: fetching + decoding stills (via createImageBitmap, off the
   main thread) and drawing the current one with a cover-fit crop. This exists so
   GSAP/ScrollTrigger on the main thread never has to compete with image decode
   work for the same thread — see app/page.js for the main-thread half of this
   (message posting + the main-thread fallback used when OffscreenCanvas isn't
   available).

   Classic (non-module) worker — no imports, so it runs in the broadest range of
   browsers; everything it needs (fetch, createImageBitmap, self) is a worker
   global already.
   ================================================================================== */

let ctx = null
let offscreen = null
let cfg = null
let lastDrawTarget = 0

const frameCache = new Map() // frameIndex -> ImageBitmap
const pending = new Set()

function frameUrl(i) {
  return `${cfg.frameBase}${String(i + cfg.frameFirst).padStart(cfg.framePad, '0')}${cfg.frameExt}`
}

function drawIndex(target) {
  if (!ctx || !offscreen.width || !offscreen.height) return
  let bitmap = frameCache.get(target)
  if (!bitmap) {
    for (let d = 1; d <= cfg.frameWindow && !bitmap; d++) {
      bitmap = frameCache.get(target - d) || frameCache.get(target + d)
    }
  }
  if (!bitmap) return

  const cw = offscreen.width, ch = offscreen.height
  const canvasRatio = cw / ch
  const imgRatio = bitmap.width / bitmap.height
  let sx, sy, sw, sh
  if (imgRatio > canvasRatio) {
    // source proportionally wider than canvas -> crop left/right, centered
    sh = bitmap.height
    sw = sh * canvasRatio
    sy = 0
    sx = (bitmap.width - sw) / 2
  } else {
    // source proportionally taller than canvas -> crop top/bottom, biased by
    // cropTopBias (0 = keep the full top, all vertical crop absorbed by the bottom)
    sw = bitmap.width
    sh = sw / canvasRatio
    sx = 0
    sy = (bitmap.height - sh) * cfg.cropTopBias
  }
  // drawImage's destination rect (0,0,cw,ch) always covers the full canvas, so
  // there's nothing left uncovered — no clearRect needed beforehand.
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, cw, ch)
}

async function requestFrame(i) {
  if (i < 0 || i >= cfg.frameCount || frameCache.has(i) || pending.has(i)) return
  pending.add(i)
  try {
    const res = await fetch(frameUrl(i))
    const blob = await res.blob()
    const bitmap = await createImageBitmap(blob)
    pending.delete(i)
    frameCache.set(i, bitmap)
    if (i === lastDrawTarget) drawIndex(i)
  } catch {
    pending.delete(i)
  }
}

function pruneCache(center) {
  for (const [key, bitmap] of frameCache) {
    if (Math.abs(key - center) > cfg.frameWindow * 2) {
      bitmap.close()
      frameCache.delete(key)
    }
  }
}

self.onmessage = (e) => {
  const msg = e.data
  switch (msg.type) {
    case 'init': {
      cfg = msg
      offscreen = msg.canvas
      offscreen.width = msg.width
      offscreen.height = msg.height
      ctx = offscreen.getContext('2d', { alpha: false })
      requestFrame(0)
      self.postMessage({ type: 'ready' })
      break
    }
    case 'resize': {
      if (!offscreen) return
      offscreen.width = msg.width
      offscreen.height = msg.height
      drawIndex(lastDrawTarget)
      break
    }
    case 'seek': {
      if (!cfg) return
      const target = Math.min(Math.max(msg.target, 0), cfg.frameCount - 1)
      if (target === lastDrawTarget) return
      lastDrawTarget = target
      for (let d = -cfg.prefetchBehind; d <= cfg.prefetchAhead; d++) requestFrame(target + d)
      drawIndex(target)
      pruneCache(target)
      break
    }
  }
}
