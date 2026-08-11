/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "(app-pages-browser)/./lib/workers/hero-frame-worker.js":
/*!******************************************!*\
  !*** ./lib/workers/hero-frame-worker.js ***!
  \******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval(__webpack_require__.ts("/* ==================================================================================\n   Homepage hero — frame-sequence decode/draw worker.\n   ------------------------------------------------------------------------------\n   Owns everything about turning a scroll-derived frame index into pixels on the\n   hero's <canvas>: fetching + decoding stills (via createImageBitmap, off the\n   main thread) and drawing the current one with a cover-fit crop. This exists so\n   GSAP/ScrollTrigger on the main thread never has to compete with image decode\n   work for the same thread — see app/page.js for the main-thread half of this\n   (message posting + the main-thread fallback used when OffscreenCanvas isn't\n   available).\n\n   Classic (non-module) worker — no imports, so it runs in the broadest range of\n   browsers; everything it needs (fetch, createImageBitmap, self) is a worker\n   global already.\n   ================================================================================== */ let ctx = null;\nlet offscreen = null;\nlet cfg = null;\nlet lastDrawTarget = 0;\nconst frameCache = new Map() // frameIndex -> ImageBitmap\n;\nconst pending = new Set();\nfunction frameUrl(i) {\n    return \"\".concat(cfg.frameBase).concat(String(i + cfg.frameFirst).padStart(cfg.framePad, '0')).concat(cfg.frameExt);\n}\nfunction drawIndex(target) {\n    if (!ctx || !offscreen.width || !offscreen.height) return;\n    let bitmap = frameCache.get(target);\n    if (!bitmap) {\n        for(let d = 1; d <= cfg.frameWindow && !bitmap; d++){\n            bitmap = frameCache.get(target - d) || frameCache.get(target + d);\n        }\n    }\n    if (!bitmap) return;\n    const cw = offscreen.width, ch = offscreen.height;\n    const canvasRatio = cw / ch;\n    const imgRatio = bitmap.width / bitmap.height;\n    let sx, sy, sw, sh;\n    if (imgRatio > canvasRatio) {\n        // source proportionally wider than canvas -> crop left/right, centered\n        sh = bitmap.height;\n        sw = sh * canvasRatio;\n        sy = 0;\n        sx = (bitmap.width - sw) / 2;\n    } else {\n        // source proportionally taller than canvas -> crop top/bottom, biased by\n        // cropTopBias (0 = keep the full top, all vertical crop absorbed by the bottom)\n        sw = bitmap.width;\n        sh = sw / canvasRatio;\n        sx = 0;\n        sy = (bitmap.height - sh) * cfg.cropTopBias;\n    }\n    // drawImage's destination rect (0,0,cw,ch) always covers the full canvas, so\n    // there's nothing left uncovered — no clearRect needed beforehand.\n    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, cw, ch);\n}\nasync function requestFrame(i) {\n    if (i < 0 || i >= cfg.frameCount || frameCache.has(i) || pending.has(i)) return;\n    pending.add(i);\n    try {\n        const res = await fetch(frameUrl(i));\n        const blob = await res.blob();\n        const bitmap = await createImageBitmap(blob);\n        pending.delete(i);\n        frameCache.set(i, bitmap);\n        if (i === lastDrawTarget) drawIndex(i);\n    } catch (e) {\n        pending.delete(i);\n    }\n}\nfunction pruneCache(center) {\n    for (const [key, bitmap] of frameCache){\n        if (Math.abs(key - center) > cfg.frameWindow * 2) {\n            bitmap.close();\n            frameCache.delete(key);\n        }\n    }\n}\nself.onmessage = (e)=>{\n    const msg = e.data;\n    switch(msg.type){\n        case 'init':\n            {\n                cfg = msg;\n                offscreen = msg.canvas;\n                offscreen.width = msg.width;\n                offscreen.height = msg.height;\n                ctx = offscreen.getContext('2d', {\n                    alpha: false\n                });\n                requestFrame(0);\n                self.postMessage({\n                    type: 'ready'\n                });\n                break;\n            }\n        case 'resize':\n            {\n                if (!offscreen) return;\n                offscreen.width = msg.width;\n                offscreen.height = msg.height;\n                drawIndex(lastDrawTarget);\n                break;\n            }\n        case 'seek':\n            {\n                if (!cfg) return;\n                const target = Math.min(Math.max(msg.target, 0), cfg.frameCount - 1);\n                if (target === lastDrawTarget) return;\n                lastDrawTarget = target;\n                for(let d = -cfg.prefetchBehind; d <= cfg.prefetchAhead; d++)requestFrame(target + d);\n                drawIndex(target);\n                pruneCache(target);\n                break;\n            }\n    }\n};\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL2xpYi93b3JrZXJzL2hlcm8tZnJhbWUtd29ya2VyLmpzIiwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7OztzRkFjc0YsR0FFdEYsSUFBSUEsTUFBTTtBQUNWLElBQUlDLFlBQVk7QUFDaEIsSUFBSUMsTUFBTTtBQUNWLElBQUlDLGlCQUFpQjtBQUVyQixNQUFNQyxhQUFhLElBQUlDLE1BQU0sNEJBQTRCOztBQUN6RCxNQUFNQyxVQUFVLElBQUlDO0FBRXBCLFNBQVNDLFNBQVNDLENBQUM7SUFDakIsT0FBTyxHQUFtQkMsT0FBaEJSLElBQUlTLFNBQVMsRUFBNERULE9BQXpEUSxPQUFPRCxJQUFJUCxJQUFJVSxVQUFVLEVBQUVDLFFBQVEsQ0FBQ1gsSUFBSVksUUFBUSxFQUFFLE1BQW9CLE9BQWJaLElBQUlhLFFBQVE7QUFDakc7QUFFQSxTQUFTQyxVQUFVQyxNQUFNO0lBQ3ZCLElBQUksQ0FBQ2pCLE9BQU8sQ0FBQ0MsVUFBVWlCLEtBQUssSUFBSSxDQUFDakIsVUFBVWtCLE1BQU0sRUFBRTtJQUNuRCxJQUFJQyxTQUFTaEIsV0FBV2lCLEdBQUcsQ0FBQ0o7SUFDNUIsSUFBSSxDQUFDRyxRQUFRO1FBQ1gsSUFBSyxJQUFJRSxJQUFJLEdBQUdBLEtBQUtwQixJQUFJcUIsV0FBVyxJQUFJLENBQUNILFFBQVFFLElBQUs7WUFDcERGLFNBQVNoQixXQUFXaUIsR0FBRyxDQUFDSixTQUFTSyxNQUFNbEIsV0FBV2lCLEdBQUcsQ0FBQ0osU0FBU0s7UUFDakU7SUFDRjtJQUNBLElBQUksQ0FBQ0YsUUFBUTtJQUViLE1BQU1JLEtBQUt2QixVQUFVaUIsS0FBSyxFQUFFTyxLQUFLeEIsVUFBVWtCLE1BQU07SUFDakQsTUFBTU8sY0FBY0YsS0FBS0M7SUFDekIsTUFBTUUsV0FBV1AsT0FBT0YsS0FBSyxHQUFHRSxPQUFPRCxNQUFNO0lBQzdDLElBQUlTLElBQUlDLElBQUlDLElBQUlDO0lBQ2hCLElBQUlKLFdBQVdELGFBQWE7UUFDMUIsdUVBQXVFO1FBQ3ZFSyxLQUFLWCxPQUFPRCxNQUFNO1FBQ2xCVyxLQUFLQyxLQUFLTDtRQUNWRyxLQUFLO1FBQ0xELEtBQUssQ0FBQ1IsT0FBT0YsS0FBSyxHQUFHWSxFQUFDLElBQUs7SUFDN0IsT0FBTztRQUNMLHlFQUF5RTtRQUN6RSxnRkFBZ0Y7UUFDaEZBLEtBQUtWLE9BQU9GLEtBQUs7UUFDakJhLEtBQUtELEtBQUtKO1FBQ1ZFLEtBQUs7UUFDTEMsS0FBSyxDQUFDVCxPQUFPRCxNQUFNLEdBQUdZLEVBQUMsSUFBSzdCLElBQUk4QixXQUFXO0lBQzdDO0lBQ0EsNkVBQTZFO0lBQzdFLG1FQUFtRTtJQUNuRWhDLElBQUlpQyxTQUFTLENBQUNiLFFBQVFRLElBQUlDLElBQUlDLElBQUlDLElBQUksR0FBRyxHQUFHUCxJQUFJQztBQUNsRDtBQUVBLGVBQWVTLGFBQWF6QixDQUFDO0lBQzNCLElBQUlBLElBQUksS0FBS0EsS0FBS1AsSUFBSWlDLFVBQVUsSUFBSS9CLFdBQVdnQyxHQUFHLENBQUMzQixNQUFNSCxRQUFROEIsR0FBRyxDQUFDM0IsSUFBSTtJQUN6RUgsUUFBUStCLEdBQUcsQ0FBQzVCO0lBQ1osSUFBSTtRQUNGLE1BQU02QixNQUFNLE1BQU1DLE1BQU0vQixTQUFTQztRQUNqQyxNQUFNK0IsT0FBTyxNQUFNRixJQUFJRSxJQUFJO1FBQzNCLE1BQU1wQixTQUFTLE1BQU1xQixrQkFBa0JEO1FBQ3ZDbEMsUUFBUW9DLE1BQU0sQ0FBQ2pDO1FBQ2ZMLFdBQVd1QyxHQUFHLENBQUNsQyxHQUFHVztRQUNsQixJQUFJWCxNQUFNTixnQkFBZ0JhLFVBQVVQO0lBQ3RDLEVBQUUsVUFBTTtRQUNOSCxRQUFRb0MsTUFBTSxDQUFDakM7SUFDakI7QUFDRjtBQUVBLFNBQVNtQyxXQUFXQyxNQUFNO0lBQ3hCLEtBQUssTUFBTSxDQUFDQyxLQUFLMUIsT0FBTyxJQUFJaEIsV0FBWTtRQUN0QyxJQUFJMkMsS0FBS0MsR0FBRyxDQUFDRixNQUFNRCxVQUFVM0MsSUFBSXFCLFdBQVcsR0FBRyxHQUFHO1lBQ2hESCxPQUFPNkIsS0FBSztZQUNaN0MsV0FBV3NDLE1BQU0sQ0FBQ0k7UUFDcEI7SUFDRjtBQUNGO0FBRUFJLEtBQUtDLFNBQVMsR0FBRyxDQUFDQztJQUNoQixNQUFNQyxNQUFNRCxFQUFFRSxJQUFJO0lBQ2xCLE9BQVFELElBQUlFLElBQUk7UUFDZCxLQUFLO1lBQVE7Z0JBQ1hyRCxNQUFNbUQ7Z0JBQ05wRCxZQUFZb0QsSUFBSUcsTUFBTTtnQkFDdEJ2RCxVQUFVaUIsS0FBSyxHQUFHbUMsSUFBSW5DLEtBQUs7Z0JBQzNCakIsVUFBVWtCLE1BQU0sR0FBR2tDLElBQUlsQyxNQUFNO2dCQUM3Qm5CLE1BQU1DLFVBQVV3RCxVQUFVLENBQUMsTUFBTTtvQkFBRUMsT0FBTztnQkFBTTtnQkFDaER4QixhQUFhO2dCQUNiZ0IsS0FBS1MsV0FBVyxDQUFDO29CQUFFSixNQUFNO2dCQUFRO2dCQUNqQztZQUNGO1FBQ0EsS0FBSztZQUFVO2dCQUNiLElBQUksQ0FBQ3RELFdBQVc7Z0JBQ2hCQSxVQUFVaUIsS0FBSyxHQUFHbUMsSUFBSW5DLEtBQUs7Z0JBQzNCakIsVUFBVWtCLE1BQU0sR0FBR2tDLElBQUlsQyxNQUFNO2dCQUM3QkgsVUFBVWI7Z0JBQ1Y7WUFDRjtRQUNBLEtBQUs7WUFBUTtnQkFDWCxJQUFJLENBQUNELEtBQUs7Z0JBQ1YsTUFBTWUsU0FBUzhCLEtBQUthLEdBQUcsQ0FBQ2IsS0FBS2MsR0FBRyxDQUFDUixJQUFJcEMsTUFBTSxFQUFFLElBQUlmLElBQUlpQyxVQUFVLEdBQUc7Z0JBQ2xFLElBQUlsQixXQUFXZCxnQkFBZ0I7Z0JBQy9CQSxpQkFBaUJjO2dCQUNqQixJQUFLLElBQUlLLElBQUksQ0FBQ3BCLElBQUk0RCxjQUFjLEVBQUV4QyxLQUFLcEIsSUFBSTZELGFBQWEsRUFBRXpDLElBQUtZLGFBQWFqQixTQUFTSztnQkFDckZOLFVBQVVDO2dCQUNWMkIsV0FBVzNCO2dCQUNYO1lBQ0Y7SUFDRjtBQUNGIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXEtydXRpIEFncmF3YWxcXERlc2t0b3BcXEFSVEggV2Vic2l0ZVxcQXJ0aF93aXRoX3ZpZGVvXFxsaWJcXHdvcmtlcnNcXGhlcm8tZnJhbWUtd29ya2VyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIEhvbWVwYWdlIGhlcm8g4oCUIGZyYW1lLXNlcXVlbmNlIGRlY29kZS9kcmF3IHdvcmtlci5cbiAgIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgT3ducyBldmVyeXRoaW5nIGFib3V0IHR1cm5pbmcgYSBzY3JvbGwtZGVyaXZlZCBmcmFtZSBpbmRleCBpbnRvIHBpeGVscyBvbiB0aGVcbiAgIGhlcm8ncyA8Y2FudmFzPjogZmV0Y2hpbmcgKyBkZWNvZGluZyBzdGlsbHMgKHZpYSBjcmVhdGVJbWFnZUJpdG1hcCwgb2ZmIHRoZVxuICAgbWFpbiB0aHJlYWQpIGFuZCBkcmF3aW5nIHRoZSBjdXJyZW50IG9uZSB3aXRoIGEgY292ZXItZml0IGNyb3AuIFRoaXMgZXhpc3RzIHNvXG4gICBHU0FQL1Njcm9sbFRyaWdnZXIgb24gdGhlIG1haW4gdGhyZWFkIG5ldmVyIGhhcyB0byBjb21wZXRlIHdpdGggaW1hZ2UgZGVjb2RlXG4gICB3b3JrIGZvciB0aGUgc2FtZSB0aHJlYWQg4oCUIHNlZSBhcHAvcGFnZS5qcyBmb3IgdGhlIG1haW4tdGhyZWFkIGhhbGYgb2YgdGhpc1xuICAgKG1lc3NhZ2UgcG9zdGluZyArIHRoZSBtYWluLXRocmVhZCBmYWxsYmFjayB1c2VkIHdoZW4gT2Zmc2NyZWVuQ2FudmFzIGlzbid0XG4gICBhdmFpbGFibGUpLlxuXG4gICBDbGFzc2ljIChub24tbW9kdWxlKSB3b3JrZXIg4oCUIG5vIGltcG9ydHMsIHNvIGl0IHJ1bnMgaW4gdGhlIGJyb2FkZXN0IHJhbmdlIG9mXG4gICBicm93c2VyczsgZXZlcnl0aGluZyBpdCBuZWVkcyAoZmV0Y2gsIGNyZWF0ZUltYWdlQml0bWFwLCBzZWxmKSBpcyBhIHdvcmtlclxuICAgZ2xvYmFsIGFscmVhZHkuXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbmxldCBjdHggPSBudWxsXG5sZXQgb2Zmc2NyZWVuID0gbnVsbFxubGV0IGNmZyA9IG51bGxcbmxldCBsYXN0RHJhd1RhcmdldCA9IDBcblxuY29uc3QgZnJhbWVDYWNoZSA9IG5ldyBNYXAoKSAvLyBmcmFtZUluZGV4IC0+IEltYWdlQml0bWFwXG5jb25zdCBwZW5kaW5nID0gbmV3IFNldCgpXG5cbmZ1bmN0aW9uIGZyYW1lVXJsKGkpIHtcbiAgcmV0dXJuIGAke2NmZy5mcmFtZUJhc2V9JHtTdHJpbmcoaSArIGNmZy5mcmFtZUZpcnN0KS5wYWRTdGFydChjZmcuZnJhbWVQYWQsICcwJyl9JHtjZmcuZnJhbWVFeHR9YFxufVxuXG5mdW5jdGlvbiBkcmF3SW5kZXgodGFyZ2V0KSB7XG4gIGlmICghY3R4IHx8ICFvZmZzY3JlZW4ud2lkdGggfHwgIW9mZnNjcmVlbi5oZWlnaHQpIHJldHVyblxuICBsZXQgYml0bWFwID0gZnJhbWVDYWNoZS5nZXQodGFyZ2V0KVxuICBpZiAoIWJpdG1hcCkge1xuICAgIGZvciAobGV0IGQgPSAxOyBkIDw9IGNmZy5mcmFtZVdpbmRvdyAmJiAhYml0bWFwOyBkKyspIHtcbiAgICAgIGJpdG1hcCA9IGZyYW1lQ2FjaGUuZ2V0KHRhcmdldCAtIGQpIHx8IGZyYW1lQ2FjaGUuZ2V0KHRhcmdldCArIGQpXG4gICAgfVxuICB9XG4gIGlmICghYml0bWFwKSByZXR1cm5cblxuICBjb25zdCBjdyA9IG9mZnNjcmVlbi53aWR0aCwgY2ggPSBvZmZzY3JlZW4uaGVpZ2h0XG4gIGNvbnN0IGNhbnZhc1JhdGlvID0gY3cgLyBjaFxuICBjb25zdCBpbWdSYXRpbyA9IGJpdG1hcC53aWR0aCAvIGJpdG1hcC5oZWlnaHRcbiAgbGV0IHN4LCBzeSwgc3csIHNoXG4gIGlmIChpbWdSYXRpbyA+IGNhbnZhc1JhdGlvKSB7XG4gICAgLy8gc291cmNlIHByb3BvcnRpb25hbGx5IHdpZGVyIHRoYW4gY2FudmFzIC0+IGNyb3AgbGVmdC9yaWdodCwgY2VudGVyZWRcbiAgICBzaCA9IGJpdG1hcC5oZWlnaHRcbiAgICBzdyA9IHNoICogY2FudmFzUmF0aW9cbiAgICBzeSA9IDBcbiAgICBzeCA9IChiaXRtYXAud2lkdGggLSBzdykgLyAyXG4gIH0gZWxzZSB7XG4gICAgLy8gc291cmNlIHByb3BvcnRpb25hbGx5IHRhbGxlciB0aGFuIGNhbnZhcyAtPiBjcm9wIHRvcC9ib3R0b20sIGJpYXNlZCBieVxuICAgIC8vIGNyb3BUb3BCaWFzICgwID0ga2VlcCB0aGUgZnVsbCB0b3AsIGFsbCB2ZXJ0aWNhbCBjcm9wIGFic29yYmVkIGJ5IHRoZSBib3R0b20pXG4gICAgc3cgPSBiaXRtYXAud2lkdGhcbiAgICBzaCA9IHN3IC8gY2FudmFzUmF0aW9cbiAgICBzeCA9IDBcbiAgICBzeSA9IChiaXRtYXAuaGVpZ2h0IC0gc2gpICogY2ZnLmNyb3BUb3BCaWFzXG4gIH1cbiAgLy8gZHJhd0ltYWdlJ3MgZGVzdGluYXRpb24gcmVjdCAoMCwwLGN3LGNoKSBhbHdheXMgY292ZXJzIHRoZSBmdWxsIGNhbnZhcywgc29cbiAgLy8gdGhlcmUncyBub3RoaW5nIGxlZnQgdW5jb3ZlcmVkIOKAlCBubyBjbGVhclJlY3QgbmVlZGVkIGJlZm9yZWhhbmQuXG4gIGN0eC5kcmF3SW1hZ2UoYml0bWFwLCBzeCwgc3ksIHN3LCBzaCwgMCwgMCwgY3csIGNoKVxufVxuXG5hc3luYyBmdW5jdGlvbiByZXF1ZXN0RnJhbWUoaSkge1xuICBpZiAoaSA8IDAgfHwgaSA+PSBjZmcuZnJhbWVDb3VudCB8fCBmcmFtZUNhY2hlLmhhcyhpKSB8fCBwZW5kaW5nLmhhcyhpKSkgcmV0dXJuXG4gIHBlbmRpbmcuYWRkKGkpXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goZnJhbWVVcmwoaSkpXG4gICAgY29uc3QgYmxvYiA9IGF3YWl0IHJlcy5ibG9iKClcbiAgICBjb25zdCBiaXRtYXAgPSBhd2FpdCBjcmVhdGVJbWFnZUJpdG1hcChibG9iKVxuICAgIHBlbmRpbmcuZGVsZXRlKGkpXG4gICAgZnJhbWVDYWNoZS5zZXQoaSwgYml0bWFwKVxuICAgIGlmIChpID09PSBsYXN0RHJhd1RhcmdldCkgZHJhd0luZGV4KGkpXG4gIH0gY2F0Y2gge1xuICAgIHBlbmRpbmcuZGVsZXRlKGkpXG4gIH1cbn1cblxuZnVuY3Rpb24gcHJ1bmVDYWNoZShjZW50ZXIpIHtcbiAgZm9yIChjb25zdCBba2V5LCBiaXRtYXBdIG9mIGZyYW1lQ2FjaGUpIHtcbiAgICBpZiAoTWF0aC5hYnMoa2V5IC0gY2VudGVyKSA+IGNmZy5mcmFtZVdpbmRvdyAqIDIpIHtcbiAgICAgIGJpdG1hcC5jbG9zZSgpXG4gICAgICBmcmFtZUNhY2hlLmRlbGV0ZShrZXkpXG4gICAgfVxuICB9XG59XG5cbnNlbGYub25tZXNzYWdlID0gKGUpID0+IHtcbiAgY29uc3QgbXNnID0gZS5kYXRhXG4gIHN3aXRjaCAobXNnLnR5cGUpIHtcbiAgICBjYXNlICdpbml0Jzoge1xuICAgICAgY2ZnID0gbXNnXG4gICAgICBvZmZzY3JlZW4gPSBtc2cuY2FudmFzXG4gICAgICBvZmZzY3JlZW4ud2lkdGggPSBtc2cud2lkdGhcbiAgICAgIG9mZnNjcmVlbi5oZWlnaHQgPSBtc2cuaGVpZ2h0XG4gICAgICBjdHggPSBvZmZzY3JlZW4uZ2V0Q29udGV4dCgnMmQnLCB7IGFscGhhOiBmYWxzZSB9KVxuICAgICAgcmVxdWVzdEZyYW1lKDApXG4gICAgICBzZWxmLnBvc3RNZXNzYWdlKHsgdHlwZTogJ3JlYWR5JyB9KVxuICAgICAgYnJlYWtcbiAgICB9XG4gICAgY2FzZSAncmVzaXplJzoge1xuICAgICAgaWYgKCFvZmZzY3JlZW4pIHJldHVyblxuICAgICAgb2Zmc2NyZWVuLndpZHRoID0gbXNnLndpZHRoXG4gICAgICBvZmZzY3JlZW4uaGVpZ2h0ID0gbXNnLmhlaWdodFxuICAgICAgZHJhd0luZGV4KGxhc3REcmF3VGFyZ2V0KVxuICAgICAgYnJlYWtcbiAgICB9XG4gICAgY2FzZSAnc2Vlayc6IHtcbiAgICAgIGlmICghY2ZnKSByZXR1cm5cbiAgICAgIGNvbnN0IHRhcmdldCA9IE1hdGgubWluKE1hdGgubWF4KG1zZy50YXJnZXQsIDApLCBjZmcuZnJhbWVDb3VudCAtIDEpXG4gICAgICBpZiAodGFyZ2V0ID09PSBsYXN0RHJhd1RhcmdldCkgcmV0dXJuXG4gICAgICBsYXN0RHJhd1RhcmdldCA9IHRhcmdldFxuICAgICAgZm9yIChsZXQgZCA9IC1jZmcucHJlZmV0Y2hCZWhpbmQ7IGQgPD0gY2ZnLnByZWZldGNoQWhlYWQ7IGQrKykgcmVxdWVzdEZyYW1lKHRhcmdldCArIGQpXG4gICAgICBkcmF3SW5kZXgodGFyZ2V0KVxuICAgICAgcHJ1bmVDYWNoZSh0YXJnZXQpXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxufVxuIl0sIm5hbWVzIjpbImN0eCIsIm9mZnNjcmVlbiIsImNmZyIsImxhc3REcmF3VGFyZ2V0IiwiZnJhbWVDYWNoZSIsIk1hcCIsInBlbmRpbmciLCJTZXQiLCJmcmFtZVVybCIsImkiLCJTdHJpbmciLCJmcmFtZUJhc2UiLCJmcmFtZUZpcnN0IiwicGFkU3RhcnQiLCJmcmFtZVBhZCIsImZyYW1lRXh0IiwiZHJhd0luZGV4IiwidGFyZ2V0Iiwid2lkdGgiLCJoZWlnaHQiLCJiaXRtYXAiLCJnZXQiLCJkIiwiZnJhbWVXaW5kb3ciLCJjdyIsImNoIiwiY2FudmFzUmF0aW8iLCJpbWdSYXRpbyIsInN4Iiwic3kiLCJzdyIsInNoIiwiY3JvcFRvcEJpYXMiLCJkcmF3SW1hZ2UiLCJyZXF1ZXN0RnJhbWUiLCJmcmFtZUNvdW50IiwiaGFzIiwiYWRkIiwicmVzIiwiZmV0Y2giLCJibG9iIiwiY3JlYXRlSW1hZ2VCaXRtYXAiLCJkZWxldGUiLCJzZXQiLCJwcnVuZUNhY2hlIiwiY2VudGVyIiwia2V5IiwiTWF0aCIsImFicyIsImNsb3NlIiwic2VsZiIsIm9ubWVzc2FnZSIsImUiLCJtc2ciLCJkYXRhIiwidHlwZSIsImNhbnZhcyIsImdldENvbnRleHQiLCJhbHBoYSIsInBvc3RNZXNzYWdlIiwibWluIiwibWF4IiwicHJlZmV0Y2hCZWhpbmQiLCJwcmVmZXRjaEFoZWFkIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./lib/workers/hero-frame-worker.js\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			var execOptions = { id: moduleId, module: module, factory: __webpack_modules__[moduleId], require: __webpack_require__ };
/******/ 			__webpack_require__.i.forEach(function(handler) { handler(execOptions); });
/******/ 			module = execOptions.module;
/******/ 			execOptions.factory.call(module.exports, module, module.exports, execOptions.require);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = __webpack_module_cache__;
/******/ 	
/******/ 	// expose the module execution interceptor
/******/ 	__webpack_require__.i = [];
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/get javascript update chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference all chunks
/******/ 		__webpack_require__.hu = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "static/webpack/" + chunkId + "." + __webpack_require__.h() + ".hot-update.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get mini-css chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.miniCssF = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return undefined;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get update manifest filename */
/******/ 	(() => {
/******/ 		__webpack_require__.hmrF = () => ("static/webpack/" + __webpack_require__.h() + ".62837fe5e3ac0388.hot-update.json");
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/getFullHash */
/******/ 	(() => {
/******/ 		__webpack_require__.h = () => ("767f2d4e36bf55fe")
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	(() => {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = () => {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: (script) => (script),
/******/ 					createScriptURL: (url) => (url)
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	(() => {
/******/ 		__webpack_require__.ts = (script) => (__webpack_require__.tt().createScript(script));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script url */
/******/ 	(() => {
/******/ 		__webpack_require__.tu = (url) => (__webpack_require__.tt().createScriptURL(url));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hot module replacement */
/******/ 	(() => {
/******/ 		var currentModuleData = {};
/******/ 		var installedModules = __webpack_require__.c;
/******/ 		
/******/ 		// module and require creation
/******/ 		var currentChildModule;
/******/ 		var currentParents = [];
/******/ 		
/******/ 		// status
/******/ 		var registeredStatusHandlers = [];
/******/ 		var currentStatus = "idle";
/******/ 		
/******/ 		// while downloading
/******/ 		var blockingPromises = 0;
/******/ 		var blockingPromisesWaiting = [];
/******/ 		
/******/ 		// The update info
/******/ 		var currentUpdateApplyHandlers;
/******/ 		var queuedInvalidatedModules;
/******/ 		
/******/ 		__webpack_require__.hmrD = currentModuleData;
/******/ 		
/******/ 		__webpack_require__.i.push(function (options) {
/******/ 			var module = options.module;
/******/ 			var require = createRequire(options.require, options.id);
/******/ 			module.hot = createModuleHotObject(options.id, module);
/******/ 			module.parents = currentParents;
/******/ 			module.children = [];
/******/ 			currentParents = [];
/******/ 			options.require = require;
/******/ 		});
/******/ 		
/******/ 		__webpack_require__.hmrC = {};
/******/ 		__webpack_require__.hmrI = {};
/******/ 		
/******/ 		function createRequire(require, moduleId) {
/******/ 			var me = installedModules[moduleId];
/******/ 			if (!me) return require;
/******/ 			var fn = function (request) {
/******/ 				if (me.hot.active) {
/******/ 					if (installedModules[request]) {
/******/ 						var parents = installedModules[request].parents;
/******/ 						if (parents.indexOf(moduleId) === -1) {
/******/ 							parents.push(moduleId);
/******/ 						}
/******/ 					} else {
/******/ 						currentParents = [moduleId];
/******/ 						currentChildModule = request;
/******/ 					}
/******/ 					if (me.children.indexOf(request) === -1) {
/******/ 						me.children.push(request);
/******/ 					}
/******/ 				} else {
/******/ 					console.warn(
/******/ 						"[HMR] unexpected require(" +
/******/ 							request +
/******/ 							") from disposed module " +
/******/ 							moduleId
/******/ 					);
/******/ 					currentParents = [];
/******/ 				}
/******/ 				return require(request);
/******/ 			};
/******/ 			var createPropertyDescriptor = function (name) {
/******/ 				return {
/******/ 					configurable: true,
/******/ 					enumerable: true,
/******/ 					get: function () {
/******/ 						return require[name];
/******/ 					},
/******/ 					set: function (value) {
/******/ 						require[name] = value;
/******/ 					}
/******/ 				};
/******/ 			};
/******/ 			for (var name in require) {
/******/ 				if (Object.prototype.hasOwnProperty.call(require, name) && name !== "e") {
/******/ 					Object.defineProperty(fn, name, createPropertyDescriptor(name));
/******/ 				}
/******/ 			}
/******/ 			fn.e = function (chunkId, fetchPriority) {
/******/ 				return trackBlockingPromise(require.e(chunkId, fetchPriority));
/******/ 			};
/******/ 			return fn;
/******/ 		}
/******/ 		
/******/ 		function createModuleHotObject(moduleId, me) {
/******/ 			var _main = currentChildModule !== moduleId;
/******/ 			var hot = {
/******/ 				// private stuff
/******/ 				_acceptedDependencies: {},
/******/ 				_acceptedErrorHandlers: {},
/******/ 				_declinedDependencies: {},
/******/ 				_selfAccepted: false,
/******/ 				_selfDeclined: false,
/******/ 				_selfInvalidated: false,
/******/ 				_disposeHandlers: [],
/******/ 				_main: _main,
/******/ 				_requireSelf: function () {
/******/ 					currentParents = me.parents.slice();
/******/ 					currentChildModule = _main ? undefined : moduleId;
/******/ 					__webpack_require__(moduleId);
/******/ 				},
/******/ 		
/******/ 				// Module API
/******/ 				active: true,
/******/ 				accept: function (dep, callback, errorHandler) {
/******/ 					if (dep === undefined) hot._selfAccepted = true;
/******/ 					else if (typeof dep === "function") hot._selfAccepted = dep;
/******/ 					else if (typeof dep === "object" && dep !== null) {
/******/ 						for (var i = 0; i < dep.length; i++) {
/******/ 							hot._acceptedDependencies[dep[i]] = callback || function () {};
/******/ 							hot._acceptedErrorHandlers[dep[i]] = errorHandler;
/******/ 						}
/******/ 					} else {
/******/ 						hot._acceptedDependencies[dep] = callback || function () {};
/******/ 						hot._acceptedErrorHandlers[dep] = errorHandler;
/******/ 					}
/******/ 				},
/******/ 				decline: function (dep) {
/******/ 					if (dep === undefined) hot._selfDeclined = true;
/******/ 					else if (typeof dep === "object" && dep !== null)
/******/ 						for (var i = 0; i < dep.length; i++)
/******/ 							hot._declinedDependencies[dep[i]] = true;
/******/ 					else hot._declinedDependencies[dep] = true;
/******/ 				},
/******/ 				dispose: function (callback) {
/******/ 					hot._disposeHandlers.push(callback);
/******/ 				},
/******/ 				addDisposeHandler: function (callback) {
/******/ 					hot._disposeHandlers.push(callback);
/******/ 				},
/******/ 				removeDisposeHandler: function (callback) {
/******/ 					var idx = hot._disposeHandlers.indexOf(callback);
/******/ 					if (idx >= 0) hot._disposeHandlers.splice(idx, 1);
/******/ 				},
/******/ 				invalidate: function () {
/******/ 					this._selfInvalidated = true;
/******/ 					switch (currentStatus) {
/******/ 						case "idle":
/******/ 							currentUpdateApplyHandlers = [];
/******/ 							Object.keys(__webpack_require__.hmrI).forEach(function (key) {
/******/ 								__webpack_require__.hmrI[key](
/******/ 									moduleId,
/******/ 									currentUpdateApplyHandlers
/******/ 								);
/******/ 							});
/******/ 							setStatus("ready");
/******/ 							break;
/******/ 						case "ready":
/******/ 							Object.keys(__webpack_require__.hmrI).forEach(function (key) {
/******/ 								__webpack_require__.hmrI[key](
/******/ 									moduleId,
/******/ 									currentUpdateApplyHandlers
/******/ 								);
/******/ 							});
/******/ 							break;
/******/ 						case "prepare":
/******/ 						case "check":
/******/ 						case "dispose":
/******/ 						case "apply":
/******/ 							(queuedInvalidatedModules = queuedInvalidatedModules || []).push(
/******/ 								moduleId
/******/ 							);
/******/ 							break;
/******/ 						default:
/******/ 							// ignore requests in error states
/******/ 							break;
/******/ 					}
/******/ 				},
/******/ 		
/******/ 				// Management API
/******/ 				check: hotCheck,
/******/ 				apply: hotApply,
/******/ 				status: function (l) {
/******/ 					if (!l) return currentStatus;
/******/ 					registeredStatusHandlers.push(l);
/******/ 				},
/******/ 				addStatusHandler: function (l) {
/******/ 					registeredStatusHandlers.push(l);
/******/ 				},
/******/ 				removeStatusHandler: function (l) {
/******/ 					var idx = registeredStatusHandlers.indexOf(l);
/******/ 					if (idx >= 0) registeredStatusHandlers.splice(idx, 1);
/******/ 				},
/******/ 		
/******/ 				// inherit from previous dispose call
/******/ 				data: currentModuleData[moduleId]
/******/ 			};
/******/ 			currentChildModule = undefined;
/******/ 			return hot;
/******/ 		}
/******/ 		
/******/ 		function setStatus(newStatus) {
/******/ 			currentStatus = newStatus;
/******/ 			var results = [];
/******/ 		
/******/ 			for (var i = 0; i < registeredStatusHandlers.length; i++)
/******/ 				results[i] = registeredStatusHandlers[i].call(null, newStatus);
/******/ 		
/******/ 			return Promise.all(results).then(function () {});
/******/ 		}
/******/ 		
/******/ 		function unblock() {
/******/ 			if (--blockingPromises === 0) {
/******/ 				setStatus("ready").then(function () {
/******/ 					if (blockingPromises === 0) {
/******/ 						var list = blockingPromisesWaiting;
/******/ 						blockingPromisesWaiting = [];
/******/ 						for (var i = 0; i < list.length; i++) {
/******/ 							list[i]();
/******/ 						}
/******/ 					}
/******/ 				});
/******/ 			}
/******/ 		}
/******/ 		
/******/ 		function trackBlockingPromise(promise) {
/******/ 			switch (currentStatus) {
/******/ 				case "ready":
/******/ 					setStatus("prepare");
/******/ 				/* fallthrough */
/******/ 				case "prepare":
/******/ 					blockingPromises++;
/******/ 					promise.then(unblock, unblock);
/******/ 					return promise;
/******/ 				default:
/******/ 					return promise;
/******/ 			}
/******/ 		}
/******/ 		
/******/ 		function waitForBlockingPromises(fn) {
/******/ 			if (blockingPromises === 0) return fn();
/******/ 			return new Promise(function (resolve) {
/******/ 				blockingPromisesWaiting.push(function () {
/******/ 					resolve(fn());
/******/ 				});
/******/ 			});
/******/ 		}
/******/ 		
/******/ 		function hotCheck(applyOnUpdate) {
/******/ 			if (currentStatus !== "idle") {
/******/ 				throw new Error("check() is only allowed in idle status");
/******/ 			}
/******/ 			return setStatus("check")
/******/ 				.then(__webpack_require__.hmrM)
/******/ 				.then(function (update) {
/******/ 					if (!update) {
/******/ 						return setStatus(applyInvalidatedModules() ? "ready" : "idle").then(
/******/ 							function () {
/******/ 								return null;
/******/ 							}
/******/ 						);
/******/ 					}
/******/ 		
/******/ 					return setStatus("prepare").then(function () {
/******/ 						var updatedModules = [];
/******/ 						currentUpdateApplyHandlers = [];
/******/ 		
/******/ 						return Promise.all(
/******/ 							Object.keys(__webpack_require__.hmrC).reduce(function (
/******/ 								promises,
/******/ 								key
/******/ 							) {
/******/ 								__webpack_require__.hmrC[key](
/******/ 									update.c,
/******/ 									update.r,
/******/ 									update.m,
/******/ 									promises,
/******/ 									currentUpdateApplyHandlers,
/******/ 									updatedModules
/******/ 								);
/******/ 								return promises;
/******/ 							}, [])
/******/ 						).then(function () {
/******/ 							return waitForBlockingPromises(function () {
/******/ 								if (applyOnUpdate) {
/******/ 									return internalApply(applyOnUpdate);
/******/ 								}
/******/ 								return setStatus("ready").then(function () {
/******/ 									return updatedModules;
/******/ 								});
/******/ 							});
/******/ 						});
/******/ 					});
/******/ 				});
/******/ 		}
/******/ 		
/******/ 		function hotApply(options) {
/******/ 			if (currentStatus !== "ready") {
/******/ 				return Promise.resolve().then(function () {
/******/ 					throw new Error(
/******/ 						"apply() is only allowed in ready status (state: " +
/******/ 							currentStatus +
/******/ 							")"
/******/ 					);
/******/ 				});
/******/ 			}
/******/ 			return internalApply(options);
/******/ 		}
/******/ 		
/******/ 		function internalApply(options) {
/******/ 			options = options || {};
/******/ 		
/******/ 			applyInvalidatedModules();
/******/ 		
/******/ 			var results = currentUpdateApplyHandlers.map(function (handler) {
/******/ 				return handler(options);
/******/ 			});
/******/ 			currentUpdateApplyHandlers = undefined;
/******/ 		
/******/ 			var errors = results
/******/ 				.map(function (r) {
/******/ 					return r.error;
/******/ 				})
/******/ 				.filter(Boolean);
/******/ 		
/******/ 			if (errors.length > 0) {
/******/ 				return setStatus("abort").then(function () {
/******/ 					throw errors[0];
/******/ 				});
/******/ 			}
/******/ 		
/******/ 			// Now in "dispose" phase
/******/ 			var disposePromise = setStatus("dispose");
/******/ 		
/******/ 			results.forEach(function (result) {
/******/ 				if (result.dispose) result.dispose();
/******/ 			});
/******/ 		
/******/ 			// Now in "apply" phase
/******/ 			var applyPromise = setStatus("apply");
/******/ 		
/******/ 			var error;
/******/ 			var reportError = function (err) {
/******/ 				if (!error) error = err;
/******/ 			};
/******/ 		
/******/ 			var outdatedModules = [];
/******/ 			results.forEach(function (result) {
/******/ 				if (result.apply) {
/******/ 					var modules = result.apply(reportError);
/******/ 					if (modules) {
/******/ 						for (var i = 0; i < modules.length; i++) {
/******/ 							outdatedModules.push(modules[i]);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 			});
/******/ 		
/******/ 			return Promise.all([disposePromise, applyPromise]).then(function () {
/******/ 				// handle errors in accept handlers and self accepted module load
/******/ 				if (error) {
/******/ 					return setStatus("fail").then(function () {
/******/ 						throw error;
/******/ 					});
/******/ 				}
/******/ 		
/******/ 				if (queuedInvalidatedModules) {
/******/ 					return internalApply(options).then(function (list) {
/******/ 						outdatedModules.forEach(function (moduleId) {
/******/ 							if (list.indexOf(moduleId) < 0) list.push(moduleId);
/******/ 						});
/******/ 						return list;
/******/ 					});
/******/ 				}
/******/ 		
/******/ 				return setStatus("idle").then(function () {
/******/ 					return outdatedModules;
/******/ 				});
/******/ 			});
/******/ 		}
/******/ 		
/******/ 		function applyInvalidatedModules() {
/******/ 			if (queuedInvalidatedModules) {
/******/ 				if (!currentUpdateApplyHandlers) currentUpdateApplyHandlers = [];
/******/ 				Object.keys(__webpack_require__.hmrI).forEach(function (key) {
/******/ 					queuedInvalidatedModules.forEach(function (moduleId) {
/******/ 						__webpack_require__.hmrI[key](
/******/ 							moduleId,
/******/ 							currentUpdateApplyHandlers
/******/ 						);
/******/ 					});
/******/ 				});
/******/ 				queuedInvalidatedModules = undefined;
/******/ 				return true;
/******/ 			}
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "/_next/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	(() => {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push((options) => {
/******/ 			const originalFactory = options.factory;
/******/ 			options.factory = (moduleObject, moduleExports, webpackRequire) => {
/******/ 				const hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				const cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : () => {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/******/ 	/* webpack/runtime/css loading */
/******/ 	(() => {
/******/ 		var createStylesheet = (chunkId, fullhref, resolve, reject) => {
/******/ 			var linkTag = document.createElement("link");
/******/ 		
/******/ 			linkTag.rel = "stylesheet";
/******/ 			linkTag.type = "text/css";
/******/ 			var onLinkComplete = (event) => {
/******/ 				// avoid mem leaks.
/******/ 				linkTag.onerror = linkTag.onload = null;
/******/ 				if (event.type === 'load') {
/******/ 					resolve();
/******/ 				} else {
/******/ 					var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 					var realHref = event && event.target && event.target.href || fullhref;
/******/ 					var err = new Error("Loading CSS chunk " + chunkId + " failed.\n(" + realHref + ")");
/******/ 					err.code = "CSS_CHUNK_LOAD_FAILED";
/******/ 					err.type = errorType;
/******/ 					err.request = realHref;
/******/ 					linkTag.parentNode.removeChild(linkTag)
/******/ 					reject(err);
/******/ 				}
/******/ 			}
/******/ 			linkTag.onerror = linkTag.onload = onLinkComplete;
/******/ 			linkTag.href = fullhref;
/******/ 		
/******/ 			(function(linkTag) {
/******/ 			                if (typeof _N_E_STYLE_LOAD === 'function') {
/******/ 			                    const { href, onload, onerror } = linkTag;
/******/ 			                    _N_E_STYLE_LOAD(href.indexOf(window.location.origin) === 0 ? new URL(href).pathname : href).then(()=>onload == null ? void 0 : onload.call(linkTag, {
/******/ 			                            type: 'load'
/******/ 			                        }), ()=>onerror == null ? void 0 : onerror.call(linkTag, {}));
/******/ 			                } else {
/******/ 			                    document.head.appendChild(linkTag);
/******/ 			                }
/******/ 			            })(linkTag)
/******/ 			return linkTag;
/******/ 		};
/******/ 		var findStylesheet = (href, fullhref) => {
/******/ 			var existingLinkTags = document.getElementsByTagName("link");
/******/ 			for(var i = 0; i < existingLinkTags.length; i++) {
/******/ 				var tag = existingLinkTags[i];
/******/ 				var dataHref = tag.getAttribute("data-href") || tag.getAttribute("href");
/******/ 				if(tag.rel === "stylesheet" && (dataHref === href || dataHref === fullhref)) return tag;
/******/ 			}
/******/ 			var existingStyleTags = document.getElementsByTagName("style");
/******/ 			for(var i = 0; i < existingStyleTags.length; i++) {
/******/ 				var tag = existingStyleTags[i];
/******/ 				var dataHref = tag.getAttribute("data-href");
/******/ 				if(dataHref === href || dataHref === fullhref) return tag;
/******/ 			}
/******/ 		};
/******/ 		var loadStylesheet = (chunkId) => {
/******/ 			return new Promise((resolve, reject) => {
/******/ 				var href = __webpack_require__.miniCssF(chunkId);
/******/ 				var fullhref = __webpack_require__.p + href;
/******/ 				if(findStylesheet(href, fullhref)) return resolve();
/******/ 				createStylesheet(chunkId, fullhref, resolve, reject);
/******/ 			});
/******/ 		}
/******/ 		// no chunk loading
/******/ 		
/******/ 		var oldTags = [];
/******/ 		var newTags = [];
/******/ 		var applyHandler = (options) => {
/******/ 			return { dispose: () => {
/******/ 				for(var i = 0; i < oldTags.length; i++) {
/******/ 					var oldTag = oldTags[i];
/******/ 					if(oldTag.parentNode) oldTag.parentNode.removeChild(oldTag);
/******/ 				}
/******/ 				oldTags.length = 0;
/******/ 			}, apply: () => {
/******/ 				for(var i = 0; i < newTags.length; i++) newTags[i].rel = "stylesheet";
/******/ 				newTags.length = 0;
/******/ 			} };
/******/ 		}
/******/ 		__webpack_require__.hmrC.miniCss = (chunkIds, removedChunks, removedModules, promises, applyHandlers, updatedModulesList) => {
/******/ 			applyHandlers.push(applyHandler);
/******/ 			chunkIds.forEach((chunkId) => {
/******/ 				var href = __webpack_require__.miniCssF(chunkId);
/******/ 				var fullhref = __webpack_require__.p + href;
/******/ 				var oldTag = findStylesheet(href, fullhref);
/******/ 				if(!oldTag) return;
/******/ 				promises.push(new Promise((resolve, reject) => {
/******/ 					var tag = createStylesheet(chunkId, fullhref, () => {
/******/ 						tag.as = "style";
/******/ 						tag.rel = "preload";
/******/ 						resolve();
/******/ 					}, reject);
/******/ 					oldTags.push(oldTag);
/******/ 					newTags.push(tag);
/******/ 				}));
/******/ 			});
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/importScripts chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "already loaded"
/******/ 		var installedChunks = __webpack_require__.hmrS_importScripts = __webpack_require__.hmrS_importScripts || {
/******/ 			"hero-frame-worker": 1
/******/ 		};
/******/ 		
/******/ 		// no chunk install function needed
/******/ 		// no chunk loading
/******/ 		
/******/ 		function loadUpdateChunk(chunkId, updatedModulesList) {
/******/ 			var success = false;
/******/ 			self["webpackHotUpdate_N_E"] = (_, moreModules, runtime) => {
/******/ 				for(var moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						currentUpdate[moduleId] = moreModules[moduleId];
/******/ 						if(updatedModulesList) updatedModulesList.push(moduleId);
/******/ 					}
/******/ 				}
/******/ 				if(runtime) currentUpdateRuntime.push(runtime);
/******/ 				success = true;
/******/ 			};
/******/ 			// start update chunk loading
/******/ 			importScripts(__webpack_require__.tu(__webpack_require__.p + __webpack_require__.hu(chunkId)));
/******/ 			if(!success) throw new Error("Loading update chunk failed for unknown reason");
/******/ 		}
/******/ 		
/******/ 		var currentUpdateChunks;
/******/ 		var currentUpdate;
/******/ 		var currentUpdateRemovedChunks;
/******/ 		var currentUpdateRuntime;
/******/ 		function applyHandler(options) {
/******/ 			if (__webpack_require__.f) delete __webpack_require__.f.importScriptsHmr;
/******/ 			currentUpdateChunks = undefined;
/******/ 			function getAffectedModuleEffects(updateModuleId) {
/******/ 				var outdatedModules = [updateModuleId];
/******/ 				var outdatedDependencies = {};
/******/ 		
/******/ 				var queue = outdatedModules.map(function (id) {
/******/ 					return {
/******/ 						chain: [id],
/******/ 						id: id
/******/ 					};
/******/ 				});
/******/ 				while (queue.length > 0) {
/******/ 					var queueItem = queue.pop();
/******/ 					var moduleId = queueItem.id;
/******/ 					var chain = queueItem.chain;
/******/ 					var module = __webpack_require__.c[moduleId];
/******/ 					if (
/******/ 						!module ||
/******/ 						(module.hot._selfAccepted && !module.hot._selfInvalidated)
/******/ 					)
/******/ 						continue;
/******/ 					if (module.hot._selfDeclined) {
/******/ 						return {
/******/ 							type: "self-declined",
/******/ 							chain: chain,
/******/ 							moduleId: moduleId
/******/ 						};
/******/ 					}
/******/ 					if (module.hot._main) {
/******/ 						return {
/******/ 							type: "unaccepted",
/******/ 							chain: chain,
/******/ 							moduleId: moduleId
/******/ 						};
/******/ 					}
/******/ 					for (var i = 0; i < module.parents.length; i++) {
/******/ 						var parentId = module.parents[i];
/******/ 						var parent = __webpack_require__.c[parentId];
/******/ 						if (!parent) continue;
/******/ 						if (parent.hot._declinedDependencies[moduleId]) {
/******/ 							return {
/******/ 								type: "declined",
/******/ 								chain: chain.concat([parentId]),
/******/ 								moduleId: moduleId,
/******/ 								parentId: parentId
/******/ 							};
/******/ 						}
/******/ 						if (outdatedModules.indexOf(parentId) !== -1) continue;
/******/ 						if (parent.hot._acceptedDependencies[moduleId]) {
/******/ 							if (!outdatedDependencies[parentId])
/******/ 								outdatedDependencies[parentId] = [];
/******/ 							addAllToSet(outdatedDependencies[parentId], [moduleId]);
/******/ 							continue;
/******/ 						}
/******/ 						delete outdatedDependencies[parentId];
/******/ 						outdatedModules.push(parentId);
/******/ 						queue.push({
/******/ 							chain: chain.concat([parentId]),
/******/ 							id: parentId
/******/ 						});
/******/ 					}
/******/ 				}
/******/ 		
/******/ 				return {
/******/ 					type: "accepted",
/******/ 					moduleId: updateModuleId,
/******/ 					outdatedModules: outdatedModules,
/******/ 					outdatedDependencies: outdatedDependencies
/******/ 				};
/******/ 			}
/******/ 		
/******/ 			function addAllToSet(a, b) {
/******/ 				for (var i = 0; i < b.length; i++) {
/******/ 					var item = b[i];
/******/ 					if (a.indexOf(item) === -1) a.push(item);
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			// at begin all updates modules are outdated
/******/ 			// the "outdated" status can propagate to parents if they don't accept the children
/******/ 			var outdatedDependencies = {};
/******/ 			var outdatedModules = [];
/******/ 			var appliedUpdate = {};
/******/ 		
/******/ 			var warnUnexpectedRequire = function warnUnexpectedRequire(module) {
/******/ 				console.warn(
/******/ 					"[HMR] unexpected require(" + module.id + ") to disposed module"
/******/ 				);
/******/ 			};
/******/ 		
/******/ 			for (var moduleId in currentUpdate) {
/******/ 				if (__webpack_require__.o(currentUpdate, moduleId)) {
/******/ 					var newModuleFactory = currentUpdate[moduleId];
/******/ 					/** @type {TODO} */
/******/ 					var result = newModuleFactory
/******/ 						? getAffectedModuleEffects(moduleId)
/******/ 						: {
/******/ 								type: "disposed",
/******/ 								moduleId: moduleId
/******/ 							};
/******/ 					/** @type {Error|false} */
/******/ 					var abortError = false;
/******/ 					var doApply = false;
/******/ 					var doDispose = false;
/******/ 					var chainInfo = "";
/******/ 					if (result.chain) {
/******/ 						chainInfo = "\nUpdate propagation: " + result.chain.join(" -> ");
/******/ 					}
/******/ 					switch (result.type) {
/******/ 						case "self-declined":
/******/ 							if (options.onDeclined) options.onDeclined(result);
/******/ 							if (!options.ignoreDeclined)
/******/ 								abortError = new Error(
/******/ 									"Aborted because of self decline: " +
/******/ 										result.moduleId +
/******/ 										chainInfo
/******/ 								);
/******/ 							break;
/******/ 						case "declined":
/******/ 							if (options.onDeclined) options.onDeclined(result);
/******/ 							if (!options.ignoreDeclined)
/******/ 								abortError = new Error(
/******/ 									"Aborted because of declined dependency: " +
/******/ 										result.moduleId +
/******/ 										" in " +
/******/ 										result.parentId +
/******/ 										chainInfo
/******/ 								);
/******/ 							break;
/******/ 						case "unaccepted":
/******/ 							if (options.onUnaccepted) options.onUnaccepted(result);
/******/ 							if (!options.ignoreUnaccepted)
/******/ 								abortError = new Error(
/******/ 									"Aborted because " + moduleId + " is not accepted" + chainInfo
/******/ 								);
/******/ 							break;
/******/ 						case "accepted":
/******/ 							if (options.onAccepted) options.onAccepted(result);
/******/ 							doApply = true;
/******/ 							break;
/******/ 						case "disposed":
/******/ 							if (options.onDisposed) options.onDisposed(result);
/******/ 							doDispose = true;
/******/ 							break;
/******/ 						default:
/******/ 							throw new Error("Unexception type " + result.type);
/******/ 					}
/******/ 					if (abortError) {
/******/ 						return {
/******/ 							error: abortError
/******/ 						};
/******/ 					}
/******/ 					if (doApply) {
/******/ 						appliedUpdate[moduleId] = newModuleFactory;
/******/ 						addAllToSet(outdatedModules, result.outdatedModules);
/******/ 						for (moduleId in result.outdatedDependencies) {
/******/ 							if (__webpack_require__.o(result.outdatedDependencies, moduleId)) {
/******/ 								if (!outdatedDependencies[moduleId])
/******/ 									outdatedDependencies[moduleId] = [];
/******/ 								addAllToSet(
/******/ 									outdatedDependencies[moduleId],
/******/ 									result.outdatedDependencies[moduleId]
/******/ 								);
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 					if (doDispose) {
/******/ 						addAllToSet(outdatedModules, [result.moduleId]);
/******/ 						appliedUpdate[moduleId] = warnUnexpectedRequire;
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 			currentUpdate = undefined;
/******/ 		
/******/ 			// Store self accepted outdated modules to require them later by the module system
/******/ 			var outdatedSelfAcceptedModules = [];
/******/ 			for (var j = 0; j < outdatedModules.length; j++) {
/******/ 				var outdatedModuleId = outdatedModules[j];
/******/ 				var module = __webpack_require__.c[outdatedModuleId];
/******/ 				if (
/******/ 					module &&
/******/ 					(module.hot._selfAccepted || module.hot._main) &&
/******/ 					// removed self-accepted modules should not be required
/******/ 					appliedUpdate[outdatedModuleId] !== warnUnexpectedRequire &&
/******/ 					// when called invalidate self-accepting is not possible
/******/ 					!module.hot._selfInvalidated
/******/ 				) {
/******/ 					outdatedSelfAcceptedModules.push({
/******/ 						module: outdatedModuleId,
/******/ 						require: module.hot._requireSelf,
/******/ 						errorHandler: module.hot._selfAccepted
/******/ 					});
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			var moduleOutdatedDependencies;
/******/ 		
/******/ 			return {
/******/ 				dispose: function () {
/******/ 					currentUpdateRemovedChunks.forEach(function (chunkId) {
/******/ 						delete installedChunks[chunkId];
/******/ 					});
/******/ 					currentUpdateRemovedChunks = undefined;
/******/ 		
/******/ 					var idx;
/******/ 					var queue = outdatedModules.slice();
/******/ 					while (queue.length > 0) {
/******/ 						var moduleId = queue.pop();
/******/ 						var module = __webpack_require__.c[moduleId];
/******/ 						if (!module) continue;
/******/ 		
/******/ 						var data = {};
/******/ 		
/******/ 						// Call dispose handlers
/******/ 						var disposeHandlers = module.hot._disposeHandlers;
/******/ 						for (j = 0; j < disposeHandlers.length; j++) {
/******/ 							disposeHandlers[j].call(null, data);
/******/ 						}
/******/ 						__webpack_require__.hmrD[moduleId] = data;
/******/ 		
/******/ 						// disable module (this disables requires from this module)
/******/ 						module.hot.active = false;
/******/ 		
/******/ 						// remove module from cache
/******/ 						delete __webpack_require__.c[moduleId];
/******/ 		
/******/ 						// when disposing there is no need to call dispose handler
/******/ 						delete outdatedDependencies[moduleId];
/******/ 		
/******/ 						// remove "parents" references from all children
/******/ 						for (j = 0; j < module.children.length; j++) {
/******/ 							var child = __webpack_require__.c[module.children[j]];
/******/ 							if (!child) continue;
/******/ 							idx = child.parents.indexOf(moduleId);
/******/ 							if (idx >= 0) {
/******/ 								child.parents.splice(idx, 1);
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					// remove outdated dependency from module children
/******/ 					var dependency;
/******/ 					for (var outdatedModuleId in outdatedDependencies) {
/******/ 						if (__webpack_require__.o(outdatedDependencies, outdatedModuleId)) {
/******/ 							module = __webpack_require__.c[outdatedModuleId];
/******/ 							if (module) {
/******/ 								moduleOutdatedDependencies =
/******/ 									outdatedDependencies[outdatedModuleId];
/******/ 								for (j = 0; j < moduleOutdatedDependencies.length; j++) {
/******/ 									dependency = moduleOutdatedDependencies[j];
/******/ 									idx = module.children.indexOf(dependency);
/******/ 									if (idx >= 0) module.children.splice(idx, 1);
/******/ 								}
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 				},
/******/ 				apply: function (reportError) {
/******/ 					// insert new code
/******/ 					for (var updateModuleId in appliedUpdate) {
/******/ 						if (__webpack_require__.o(appliedUpdate, updateModuleId)) {
/******/ 							__webpack_require__.m[updateModuleId] = appliedUpdate[updateModuleId];
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					// run new runtime modules
/******/ 					for (var i = 0; i < currentUpdateRuntime.length; i++) {
/******/ 						currentUpdateRuntime[i](__webpack_require__);
/******/ 					}
/******/ 		
/******/ 					// call accept handlers
/******/ 					for (var outdatedModuleId in outdatedDependencies) {
/******/ 						if (__webpack_require__.o(outdatedDependencies, outdatedModuleId)) {
/******/ 							var module = __webpack_require__.c[outdatedModuleId];
/******/ 							if (module) {
/******/ 								moduleOutdatedDependencies =
/******/ 									outdatedDependencies[outdatedModuleId];
/******/ 								var callbacks = [];
/******/ 								var errorHandlers = [];
/******/ 								var dependenciesForCallbacks = [];
/******/ 								for (var j = 0; j < moduleOutdatedDependencies.length; j++) {
/******/ 									var dependency = moduleOutdatedDependencies[j];
/******/ 									var acceptCallback =
/******/ 										module.hot._acceptedDependencies[dependency];
/******/ 									var errorHandler =
/******/ 										module.hot._acceptedErrorHandlers[dependency];
/******/ 									if (acceptCallback) {
/******/ 										if (callbacks.indexOf(acceptCallback) !== -1) continue;
/******/ 										callbacks.push(acceptCallback);
/******/ 										errorHandlers.push(errorHandler);
/******/ 										dependenciesForCallbacks.push(dependency);
/******/ 									}
/******/ 								}
/******/ 								for (var k = 0; k < callbacks.length; k++) {
/******/ 									try {
/******/ 										callbacks[k].call(null, moduleOutdatedDependencies);
/******/ 									} catch (err) {
/******/ 										if (typeof errorHandlers[k] === "function") {
/******/ 											try {
/******/ 												errorHandlers[k](err, {
/******/ 													moduleId: outdatedModuleId,
/******/ 													dependencyId: dependenciesForCallbacks[k]
/******/ 												});
/******/ 											} catch (err2) {
/******/ 												if (options.onErrored) {
/******/ 													options.onErrored({
/******/ 														type: "accept-error-handler-errored",
/******/ 														moduleId: outdatedModuleId,
/******/ 														dependencyId: dependenciesForCallbacks[k],
/******/ 														error: err2,
/******/ 														originalError: err
/******/ 													});
/******/ 												}
/******/ 												if (!options.ignoreErrored) {
/******/ 													reportError(err2);
/******/ 													reportError(err);
/******/ 												}
/******/ 											}
/******/ 										} else {
/******/ 											if (options.onErrored) {
/******/ 												options.onErrored({
/******/ 													type: "accept-errored",
/******/ 													moduleId: outdatedModuleId,
/******/ 													dependencyId: dependenciesForCallbacks[k],
/******/ 													error: err
/******/ 												});
/******/ 											}
/******/ 											if (!options.ignoreErrored) {
/******/ 												reportError(err);
/******/ 											}
/******/ 										}
/******/ 									}
/******/ 								}
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					// Load self accepted modules
/******/ 					for (var o = 0; o < outdatedSelfAcceptedModules.length; o++) {
/******/ 						var item = outdatedSelfAcceptedModules[o];
/******/ 						var moduleId = item.module;
/******/ 						try {
/******/ 							item.require(moduleId);
/******/ 						} catch (err) {
/******/ 							if (typeof item.errorHandler === "function") {
/******/ 								try {
/******/ 									item.errorHandler(err, {
/******/ 										moduleId: moduleId,
/******/ 										module: __webpack_require__.c[moduleId]
/******/ 									});
/******/ 								} catch (err1) {
/******/ 									if (options.onErrored) {
/******/ 										options.onErrored({
/******/ 											type: "self-accept-error-handler-errored",
/******/ 											moduleId: moduleId,
/******/ 											error: err1,
/******/ 											originalError: err
/******/ 										});
/******/ 									}
/******/ 									if (!options.ignoreErrored) {
/******/ 										reportError(err1);
/******/ 										reportError(err);
/******/ 									}
/******/ 								}
/******/ 							} else {
/******/ 								if (options.onErrored) {
/******/ 									options.onErrored({
/******/ 										type: "self-accept-errored",
/******/ 										moduleId: moduleId,
/******/ 										error: err
/******/ 									});
/******/ 								}
/******/ 								if (!options.ignoreErrored) {
/******/ 									reportError(err);
/******/ 								}
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					return outdatedModules;
/******/ 				}
/******/ 			};
/******/ 		}
/******/ 		__webpack_require__.hmrI.importScripts = function (moduleId, applyHandlers) {
/******/ 			if (!currentUpdate) {
/******/ 				currentUpdate = {};
/******/ 				currentUpdateRuntime = [];
/******/ 				currentUpdateRemovedChunks = [];
/******/ 				applyHandlers.push(applyHandler);
/******/ 			}
/******/ 			if (!__webpack_require__.o(currentUpdate, moduleId)) {
/******/ 				currentUpdate[moduleId] = __webpack_require__.m[moduleId];
/******/ 			}
/******/ 		};
/******/ 		__webpack_require__.hmrC.importScripts = function (
/******/ 			chunkIds,
/******/ 			removedChunks,
/******/ 			removedModules,
/******/ 			promises,
/******/ 			applyHandlers,
/******/ 			updatedModulesList
/******/ 		) {
/******/ 			applyHandlers.push(applyHandler);
/******/ 			currentUpdateChunks = {};
/******/ 			currentUpdateRemovedChunks = removedChunks;
/******/ 			currentUpdate = removedModules.reduce(function (obj, key) {
/******/ 				obj[key] = false;
/******/ 				return obj;
/******/ 			}, {});
/******/ 			currentUpdateRuntime = [];
/******/ 			chunkIds.forEach(function (chunkId) {
/******/ 				if (
/******/ 					__webpack_require__.o(installedChunks, chunkId) &&
/******/ 					installedChunks[chunkId] !== undefined
/******/ 				) {
/******/ 					promises.push(loadUpdateChunk(chunkId, updatedModulesList));
/******/ 					currentUpdateChunks[chunkId] = true;
/******/ 				} else {
/******/ 					currentUpdateChunks[chunkId] = false;
/******/ 				}
/******/ 			});
/******/ 			if (__webpack_require__.f) {
/******/ 				__webpack_require__.f.importScriptsHmr = function (chunkId, promises) {
/******/ 					if (
/******/ 						currentUpdateChunks &&
/******/ 						__webpack_require__.o(currentUpdateChunks, chunkId) &&
/******/ 						!currentUpdateChunks[chunkId]
/******/ 					) {
/******/ 						promises.push(loadUpdateChunk(chunkId));
/******/ 						currentUpdateChunks[chunkId] = true;
/******/ 					}
/******/ 				};
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.hmrM = () => {
/******/ 			if (typeof fetch === "undefined") throw new Error("No browser support: need fetch API");
/******/ 			return fetch(__webpack_require__.p + __webpack_require__.hmrF()).then((response) => {
/******/ 				if(response.status === 404) return; // no update available
/******/ 				if(!response.ok) throw new Error("Failed to fetch update manifest " + response.statusText);
/******/ 				return response.json();
/******/ 			});
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// module cache are used so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	var __webpack_exports__ = __webpack_require__("(app-pages-browser)/./lib/workers/hero-frame-worker.js");
/******/ 	_N_E = __webpack_exports__;
/******/ 	
/******/ })()
;