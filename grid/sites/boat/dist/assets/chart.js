// Draws a generated nautical chart behind the hero and page titles: buff land, two shoal bands,
// depth contours, soundings in feet with bottom notes, and a couple of lights in chart magenta.
// Each page gets its own seeded chart. Colors come from the CSS tokens, so it follows light and dark.
(function () {
  'use strict';
  var canvases = Array.prototype.slice.call(document.querySelectorAll('canvas[data-chart]'));
  if (!canvases.length) return;

  function hash(str) { var h = 2166136261 >>> 0; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function makeNoise(rand) {
    var p = []; var i;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = p[i]; p[i] = p[j]; p[j] = t; }
    var perm = new Uint16Array(512); for (i = 0; i < 512; i++) perm[i] = p[i & 255];
    var val = new Float32Array(256); for (i = 0; i < 256; i++) val[i] = rand();
    function sm(t) { return t * t * (3 - 2 * t); }
    return function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
      var a = val[perm[X + perm[Y]]], b = val[perm[X + 1 + perm[Y]]], c = val[perm[X + perm[Y + 1]]], d = val[perm[X + 1 + perm[Y + 1]]];
      var u = sm(xf), v = sm(yf);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
  }
  function fbm(n, x, y) { var s = 0, a = 0.5, f = 1; for (var o = 0; o < 5; o++) { s += a * n(x * f, y * f); f *= 2; a *= 0.5; } return s / 0.96875; }

  function token(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function rgb(hex) {
    var h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }

  var LIGHTS = ['Fl G 4s', 'Fl R 4s', 'Q G', 'Fl 6s 17ft 4M', 'Fl R 2.5s', 'Iso G 6s'];
  var BOTTOM = ['S', 'Sh', 'grs', 'M', 'S Sh'];

  function draw(cv) {
    var rect = cv.getBoundingClientRect();
    var W = Math.max(1, Math.round(rect.width)), H = Math.max(1, Math.round(rect.height));
    if (W < 10 || H < 10) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var colors = {
      water: rgb(token('--water') || '#f7fafc'), shoal: rgb(token('--shoal') || '#cfe4f2'), land: rgb(token('--land') || '#f1e1b0'),
      ink: token('--ink') || '#14263a', rule: token('--rule') || '#a9c3d5', magenta: token('--magenta') || '#a6206a',
    };
    var shoal2 = mix(colors.shoal, colors.water, 0.55);

    var seed = hash(cv.getAttribute('data-chart') || 'chart');
    var rand = rng(seed), n1 = makeNoise(rand), n2 = makeNoise(rand);
    var coast = parseFloat(cv.getAttribute('data-coast') || '0.65');
    var ox = rand() * 50, oy = rand() * 50;
    var scale = 3.4 / 1200;

    // Elevation field on a coarse grid: positive is land, negative is depth.
    var g = 5, cols = Math.ceil(W / g) + 2, rows = Math.ceil(H / g) + 2;
    var F = new Float32Array(cols * rows);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = c * g, y = r * g;
        var wx = (fbm(n2, x * scale * 1.3 + 11, y * scale * 1.3 + 7) - 0.5) * 0.22;
        var e = (fbm(n1, x * scale + ox, y * scale + oy) - 0.5) * 2.3 + (x / W + wx - coast) * 0.95;
        F[r * cols + c] = e;
      }
    }
    function field(x, y) {
      var gx = x / g, gy = y / g, c0 = Math.floor(gx), r0 = Math.floor(gy);
      var fx = gx - c0, fy = gy - r0;
      var i = r0 * cols + c0;
      return (F[i] * (1 - fx) + F[i + 1] * fx) * (1 - fy) + (F[i + cols] * (1 - fx) + F[i + cols + 1] * fx) * fy;
    }

    // Fill at CSS resolution, then scale up.
    var off = document.createElement('canvas'); off.width = W; off.height = H;
    var octx = off.getContext('2d'); var img = octx.createImageData(W, H); var d = img.data;
    for (var py = 0; py < H; py++) {
      for (var px = 0; px < W; px++) {
        var v = field(px, py), col = v > 0 ? colors.land : v > -0.13 ? colors.shoal : v > -0.28 ? shoal2 : colors.water;
        var k = (py * W + px) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, W, H);

    // Contours by marching squares.
    function contour(level, stroke, width, alpha) {
      ctx.beginPath();
      for (var r = 0; r < rows - 1; r++) {
        for (var c = 0; c < cols - 1; c++) {
          var a = F[r * cols + c], b = F[r * cols + c + 1], cc = F[(r + 1) * cols + c + 1], dd = F[(r + 1) * cols + c];
          var idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (cc > level ? 2 : 0) | (dd > level ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          var x = c * g, y = r * g;
          var T = [x + g * (level - a) / (b - a), y], R = [x + g, y + g * (level - b) / (cc - b)];
          var B = [x + g * (level - dd) / (cc - dd), y + g], L = [x, y + g * (level - a) / (dd - a)];
          var segs;
          switch (idx) {
            case 1: case 14: segs = [[L, B]]; break;
            case 2: case 13: segs = [[B, R]]; break;
            case 3: case 12: segs = [[L, R]]; break;
            case 4: case 11: segs = [[T, R]]; break;
            case 5: segs = [[L, T], [B, R]]; break;
            case 6: case 9: segs = [[T, B]]; break;
            case 7: case 8: segs = [[L, T]]; break;
            case 10: segs = [[T, R], [L, B]]; break;
          }
          for (var s = 0; s < segs.length; s++) { ctx.moveTo(segs[s][0][0], segs[s][0][1]); ctx.lineTo(segs[s][1][0], segs[s][1][1]); }
        }
      }
      ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.stroke(); ctx.globalAlpha = 1;
    }
    contour(-0.46, colors.rule, 0.8, 0.75);
    contour(-0.28, colors.rule, 0.9, 0.95);
    contour(-0.13, colors.rule, 1, 1);
    contour(0, colors.ink, 1.3, 0.9);

    // Areas to keep clear: panels laid over the chart.
    var base = cv.getBoundingClientRect();
    var avoid = Array.prototype.map.call(cv.parentElement.querySelectorAll('[data-chart-avoid]'), function (el) {
      var b = el.getBoundingClientRect(); return { x: b.left - base.left - 14, y: b.top - base.top - 14, w: b.width + 28, h: b.height + 28 };
    });
    function clear(x, y, w, h) {
      if (x < 18 || y < 18 || x + w > W - 18 || y + h > H - 18) return false;
      for (var i = 0; i < avoid.length; i++) { var a = avoid[i]; if (x < a.x + a.w && x + w > a.x && y < a.y + a.h && y + h > a.y) return false; }
      return true;
    }

    var serif = (token('--display') || 'Georgia, serif');
    ctx.textBaseline = 'middle';

    // Water name, letterspaced italic, where it fits.
    var label = cv.getAttribute('data-label');
    if (label) {
      var size = Math.max(15, Math.min(26, W / 46));
      ctx.font = 'italic 600 ' + size + 'px ' + serif;
      var spaced = label.split('').join(String.fromCharCode(8202));
      var tw = ctx.measureText(spaced).width;
      var best = null;
      for (var ty = 40; ty < H - 30 && !best; ty += 12) {
        for (var tx = 30; tx < W - tw - 30; tx += 16) {
          if (!clear(tx, ty - size / 2, tw, size)) continue;
          var ok = true;
          for (var sx = 0; sx <= tw && ok; sx += 12) if (field(tx + sx, ty) > -0.3 || field(tx + sx, ty - size / 2) > -0.3 || field(tx + sx, ty + size / 2) > -0.3) ok = false;
          if (ok) { best = [tx, ty]; break; }
        }
      }
      if (best) { ctx.fillStyle = colors.ink; ctx.globalAlpha = 0.62; ctx.fillText(spaced, best[0], best[1]); ctx.globalAlpha = 1; avoid.push({ x: best[0] - 10, y: best[1] - size, w: tw + 20, h: size * 2 }); }
    }

    // Soundings in feet, with an occasional bottom note.
    ctx.font = 'italic 400 12px ' + serif;
    var placed = [];
    var tries = Math.round((W * H) / 2200);
    for (var t = 0; t < tries; t++) {
      var sx2 = 20 + rand() * (W - 40), sy2 = 20 + rand() * (H - 40);
      var ev = field(sx2, sy2);
      if (ev > -0.035) continue;
      var tooClose = false;
      for (var q = 0; q < placed.length; q++) { var dx = placed[q][0] - sx2, dy = placed[q][1] - sy2; if (dx * dx + dy * dy < 54 * 54) { tooClose = true; break; } }
      if (tooClose || !clear(sx2 - 10, sy2 - 9, 26, 18)) continue;
      placed.push([sx2, sy2]);
      var depth = Math.max(1, Math.round(1 + (-ev) * 26));
      ctx.fillStyle = colors.ink; ctx.globalAlpha = 0.66; ctx.fillText(String(depth), sx2, sy2);
      if (rand() < 0.16) { ctx.font = 'italic 400 10px ' + serif; ctx.fillText(BOTTOM[Math.floor(rand() * BOTTOM.length)], sx2 + 1, sy2 + 12); ctx.font = 'italic 400 12px ' + serif; }
      ctx.globalAlpha = 1;
    }

    // Two or three lights near the coast, in chart magenta.
    var lights = 0;
    for (var t2 = 0; t2 < 600 && lights < 3; t2++) {
      var lx = 30 + rand() * (W - 120), ly = 30 + rand() * (H - 60), le = field(lx, ly);
      if (le > -0.03 || le < -0.16 || !clear(lx - 8, ly - 26, 90, 34)) continue;
      ctx.fillStyle = colors.magenta; ctx.strokeStyle = colors.magenta;
      ctx.beginPath(); ctx.arc(lx, ly, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(-Math.PI / 4);
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(7, -9, 0, -19); ctx.quadraticCurveTo(-7, -9, 0, -3); ctx.globalAlpha = 0.85; ctx.fill(); ctx.restore();
      ctx.globalAlpha = 0.9; ctx.font = 'italic 600 11px ' + serif; ctx.fillText(LIGHTS[Math.floor(rand() * LIGHTS.length)], lx + 10, ly - 14);
      ctx.globalAlpha = 1;
      avoid.push({ x: lx - 8, y: ly - 26, w: 90, h: 34 });
      lights++;
    }
  }

  function drawAll() { for (var i = 0; i < canvases.length; i++) { try { draw(canvases[i]); } catch (e) { /* the shoal-blue background shows instead */ } } }
  var lastW = window.innerWidth, timer = null;
  window.addEventListener('resize', function () { if (window.innerWidth === lastW) return; lastW = window.innerWidth; clearTimeout(timer); timer = setTimeout(drawAll, 150); });
  if (window.matchMedia) { var mq = window.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', drawAll); }
  if (window.MutationObserver) new MutationObserver(drawAll).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  drawAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAll);
})();
