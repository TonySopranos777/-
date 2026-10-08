class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = CONFIG.camera.zoomDefault;
    this.followIndex = 0;
  }

  update(trucks, canvasW, canvasH) {
    if (trucks.length === 0) return;
    const target = trucks[this.followIndex % trucks.length];
    if (!target) return;
    this.x = lerp(this.x, target.x, CONFIG.camera.followLerp);
    this.y = lerp(this.y, target.y, CONFIG.camera.followLerp);
  }

  worldToScreen(wx, wy, canvasW, canvasH) {
    const sx = (wx - this.x) * this.zoom + canvasW / 2;
    const sy = (wy - this.y) * this.zoom + canvasH / 2;
    return { x: sx, y: sy };
  }
}

class Renderer {
  constructor() {
    this.simCanvas = document.getElementById("simCanvas");
    this.ctx = this.simCanvas.getContext("2d");
    this.lidarCanvas = document.getElementById("lidarCanvas");
    this.lidarCtx = this.lidarCanvas.getContext("2d");
    this.radarCanvas = document.getElementById("radarCanvas");
    this.radarCtx = this.radarCanvas.getContext("2d");
    this.miniMapCanvas = document.getElementById("miniMapCanvas");
    this.miniMapCtx = this.miniMapCanvas.getContext("2d");
    this.chartCanvas = document.getElementById("chartCanvas");
    this.chartCtx = this.chartCanvas ? this.chartCanvas.getContext("2d") : null;
  }

  render(map, fleet, camera, weather, timeOfDay) {
    const parent = this.simCanvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.max(1, Math.floor(parent.clientWidth * dpr));
    const targetH = Math.max(1, Math.floor(parent.clientHeight * dpr));
    if (this.simCanvas.width !== targetW || this.simCanvas.height !== targetH) {
      this.simCanvas.width = targetW;
      this.simCanvas.height = targetH;
      this.simCanvas.style.width = parent.clientWidth + "px";
      this.simCanvas.style.height = parent.clientHeight + "px";
    }
    const ctx = this.ctx;
    const w = this.simCanvas.width;
    const h = this.simCanvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    ctx.translate(cx, cy);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    this.drawGrid(ctx, map);
    this.drawZones(ctx, map);
    this.drawRoutes(ctx, fleet);
    for (const truck of fleet.trucks) this.drawTruck(ctx, truck);
    this.drawWeatherOverlay(ctx, weather, map);
    this.drawTimeOverlay(ctx, timeOfDay, camera, fleet);

    ctx.restore();

    this.drawMiniMap(map, fleet);
    const selected = fleet.trucks[camera.followIndex % fleet.trucks.length];
    if (selected) {
      this.drawLidar(selected);
      this.drawRadar(selected);
    }
  }

  drawGrid(ctx, map) {
    const groundBase = this._groundColorForMap(map.mapType);
    for (let y = 0; y < CONFIG.GRID_H; y++) {
      for (let x = 0; x < CONFIG.GRID_W; x++) {
        const c = map.grid[y][x];
        const px = x * CONFIG.TILE;
        const py = y * CONFIG.TILE;
        if (map.mapType === "terrace") {
          const tcx = CONFIG.GRID_W * 0.63;
          const tcy = CONFIG.GRID_H * 0.68;
          const rDist = Math.hypot(x - tcx, y - tcy);
          const terraceBand = Math.floor(rDist / 3.6);
          if (c.blocked) {
            const s = 66 + (terraceBand % 2) * 10;
            ctx.fillStyle = `rgb(${s + 22}, ${s + 15}, ${s + 8})`;
          } else {
            const roadShade = 118 + (terraceBand % 2) * 8;
            ctx.fillStyle = `rgb(${roadShade + 20}, ${roadShade + 10}, ${roadShade - 4})`;
          }
        } else if (c.blocked) {
          const noise = hashNoise(x, y, 7);
          const r = Math.floor(130 + noise * 35 + c.rough * 25);
          const g = Math.floor(118 + noise * 30 + c.rough * 20);
          const b = Math.floor(105 + noise * 25 + c.rough * 18);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        } else {
          const shade = Math.floor(groundBase.lum + c.slope * 22 + c.rough * 18);
          const r = Math.floor(shade + groundBase.rOff + c.rough * 10);
          const g = Math.floor(shade + groundBase.gOff + c.rough * 8);
          const b = Math.floor(shade + groundBase.bOff + c.rough * 6);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        }
        ctx.fillRect(px, py, CONFIG.TILE, CONFIG.TILE);
      }
    }

    if (map.mapType === "terrace") {
      const tcx = CONFIG.GRID_W * 0.63 * CONFIG.TILE;
      const tcy = CONFIG.GRID_H * 0.68 * CONFIG.TILE;
      const maxR = Math.min(CONFIG.GRID_W, CONFIG.GRID_H) * 0.46 * CONFIG.TILE;
      ctx.strokeStyle = "rgba(210, 190, 165, 0.18)";
      ctx.lineWidth = 2;
      for (let r = maxR; r > 120; r -= 70) {
        ctx.beginPath();
        ctx.arc(tcx, tcy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(46,78,50,0.25)";
      ctx.fillRect(0, 0, CONFIG.GRID_W * CONFIG.TILE, Math.floor(CONFIG.GRID_H * 0.16) * CONFIG.TILE);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= CONFIG.GRID_W; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CONFIG.TILE, 0);
      ctx.lineTo(x * CONFIG.TILE, CONFIG.GRID_H * CONFIG.TILE);
      ctx.stroke();
    }
    for (let y = 0; y <= CONFIG.GRID_H; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CONFIG.TILE);
      ctx.lineTo(CONFIG.GRID_W * CONFIG.TILE, y * CONFIG.TILE);
      ctx.stroke();
    }
  }

  _groundColorForMap(type) {
    switch (type) {
      case "north": return { lum: 68, rOff: 18, gOff: 8, bOff: -4 };
      case "deep": return { lum: 58, rOff: 22, gOff: 10, bOff: -2 };
      case "ridge": return { lum: 62, rOff: 16, gOff: 12, bOff: 0 };
      case "west": return { lum: 64, rOff: 20, gOff: 14, bOff: 2 };
      case "south": return { lum: 60, rOff: 24, gOff: 10, bOff: -4 };
      case "east": return { lum: 66, rOff: 18, gOff: 10, bOff: -2 };
      case "canyon": return { lum: 70, rOff: 26, gOff: 12, bOff: 0 };
      default: return { lum: 72, rOff: 22, gOff: 8, bOff: -4 };
    }
  }

  drawZones(ctx, map) {
    if (!map.zones) return;
    const drawOne = (zone, color) => {
      const px = zone.x * CONFIG.TILE;
      const py = zone.y * CONFIG.TILE;
      const w = zone.w * CONFIG.TILE;
      const h = zone.h * CONFIG.TILE;
      ctx.fillStyle = color.fill;
      ctx.fillRect(px, py, w, h);
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, w - 2, h - 2);
      ctx.fillStyle = "#f2f5f8";
      ctx.font = "12px Segoe UI";
      ctx.fillText(zone.name, px + 4, py + 14);
    };
    drawOne(map.zones.base, { fill: "rgba(80,170,230,0.25)", stroke: "rgba(100,210,255,0.95)" });
    drawOne(map.zones.load, { fill: "rgba(90,190,100,0.25)", stroke: "rgba(130,230,130,0.95)" });
    drawOne(map.zones.unload, { fill: "rgba(240,170,60,0.24)", stroke: "rgba(255,200,90,0.95)" });
    drawOne(map.zones.fuel, { fill: "rgba(210,90,90,0.22)", stroke: "rgba(255,130,130,0.95)" });
    drawOne(map.zones.maintenance, { fill: "rgba(170,100,220,0.22)", stroke: "rgba(200,130,255,0.95)" });
  }

  drawRoutes(ctx, fleet) {
    for (const truck of fleet.trucks) {
      if (truck.routeRaw.length > 1) {
        ctx.strokeStyle = "rgba(64, 178, 255, 0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(truck.routeRaw[0].x, truck.routeRaw[0].y);
        for (let i = 1; i < truck.routeRaw.length; i++) ctx.lineTo(truck.routeRaw[i].x, truck.routeRaw[i].y);
        ctx.stroke();
      }
      if (truck.route.length > 1) {
        ctx.strokeStyle = truck.color + "cc";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(truck.route[0].x, truck.route[0].y);
        for (let i = 1; i < truck.route.length; i++) ctx.lineTo(truck.route[i].x, truck.route[i].y);
        ctx.stroke();
      }
    }
  }

  drawTruck(ctx, truck) {
    const x = truck.x;
    const y = truck.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(truck.angle);

    ctx.fillStyle = truck.color;
    ctx.fillRect(-14, -9, 28, 18);
    ctx.fillStyle = this._shadeColor(truck.color, -20);
    ctx.fillRect(-6, -13, 18, 8);
    ctx.fillStyle = "#303845";
    ctx.fillRect(-12, -7, 7, 5);
    ctx.fillRect(5, -7, 7, 5);
    ctx.fillRect(-12, 2, 7, 5);
    ctx.fillRect(5, 2, 7, 5);

    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(18, 0);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#fff3";
    ctx.fill();

    if (truck.operation.active) {
      const progress = 1 - truck.operation.remaining / Math.max(0.001, truck.operation.duration);
      ctx.strokeStyle = "rgba(255,220,120,0.9)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, progress)));
      ctx.stroke();
    }

    ctx.fillStyle = "#f2f5f8";
    ctx.font = "11px Segoe UI";
    ctx.fillText(truck.label, x + 16, y - 16);
    ctx.font = "10px Segoe UI";
    ctx.fillStyle = "#c8d0da";
    ctx.fillText(truck.state, x + 16, y - 4);
  }

  _shadeColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = clamp((num >> 16) + amt, 0, 255);
    const G = clamp(((num >> 8) & 0x00ff) + amt, 0, 255);
    const B = clamp((num & 0x0000ff) + amt, 0, 255);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  drawWeatherOverlay(ctx, weather, map) {
    const w = CONFIG.GRID_W * CONFIG.TILE;
    const h = CONFIG.GRID_H * CONFIG.TILE;
    const now = performance.now();
    if (weather === "fog") {
      ctx.fillStyle = "rgba(210,220,225,0.14)";
      ctx.fillRect(0, 0, w, h);
    } else if (weather === "dust") {
      ctx.fillStyle = "rgba(190,150,105,0.12)";
      ctx.fillRect(0, 0, w, h);
    } else if (weather === "rain") {
      ctx.strokeStyle = "rgba(170,210,255,0.25)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 220; i++) {
        const x = (i * 53 + now * 0.2) % w;
        const y = (i * 37 + now * 0.9) % h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 4, y + 11);
        ctx.stroke();
      }
    }
  }

  drawTimeOverlay(ctx, timeOfDay, camera, fleet) {
    const w = CONFIG.GRID_W * CONFIG.TILE;
    const h = CONFIG.GRID_H * CONFIG.TILE;
    if (timeOfDay === "day") return;
    if (timeOfDay === "dusk") {
      ctx.fillStyle = "rgba(255,140,70,0.12)";
      ctx.fillRect(0, 0, w, h);
      return;
    }
    ctx.fillStyle = "rgba(8,16,34,0.4)";
    ctx.fillRect(0, 0, w, h);
    const target = fleet.trucks[camera.followIndex % fleet.trucks.length];
    if (!target) return;
    const hx = target.x + Math.cos(target.angle) * 110;
    const hy = target.y + Math.sin(target.angle) * 110;
    const grad = ctx.createRadialGradient(hx, hy, 10, hx, hy, 190);
    grad.addColorStop(0, "rgba(255,245,200,0.45)");
    grad.addColorStop(1, "rgba(255,245,200,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(hx, hy, 190, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMiniMap(map, fleet) {
    const ctx = this.miniMapCtx;
    const cw = this.miniMapCanvas.width;
    const ch = this.miniMapCanvas.height;
    ctx.clearRect(0, 0, cw, ch);
    const sx = cw / (CONFIG.GRID_W * CONFIG.TILE);
    const sy = ch / (CONFIG.GRID_H * CONFIG.TILE);

    ctx.fillStyle = "#121923";
    ctx.fillRect(0, 0, cw, ch);

    for (let y = 0; y < CONFIG.GRID_H; y++) {
      for (let x = 0; x < CONFIG.GRID_W; x++) {
        if (!map.grid[y][x].blocked) continue;
        ctx.fillStyle = "rgba(255,60,60,0.8)";
        ctx.fillRect(x * CONFIG.TILE * sx, y * CONFIG.TILE * sy, CONFIG.TILE * sx, CONFIG.TILE * sy);
      }
    }

    for (const truck of fleet.trucks) {
      if (truck.route.length > 1) {
        ctx.strokeStyle = truck.color + "aa";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(truck.route[0].x * sx, truck.route[0].y * sy);
        for (let i = 1; i < truck.route.length; i++) ctx.lineTo(truck.route[i].x * sx, truck.route[i].y * sy);
        ctx.stroke();
      }
    }

    for (const truck of fleet.trucks) {
      const tx = truck.x * sx;
      const ty = truck.y * sy;
      ctx.fillStyle = truck.color;
      ctx.beginPath();
      ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawLidar(truck) {
    const ctx = this.lidarCtx;
    const cw = this.lidarCanvas.width;
    const ch = this.lidarCanvas.height;
    ctx.clearRect(0, 0, cw, ch);
    const cx = cw * 0.5;
    const cy = ch * 0.7;
    const radius = 75;

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    for (let r = 20; r <= radius; r += 18) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 0);
      ctx.stroke();
    }

    for (const ray of truck.lidarRays) {
      const dNorm = Math.min(1, ray.dist / CONFIG.sensors.lidarMaxDist);
      const a = ray.angle;
      const px = cx + Math.cos(a) * dNorm * radius;
      const py = cy - Math.abs(Math.sin(a)) * dNorm * radius;
      const danger = 1 - dNorm;
      ctx.strokeStyle = `rgba(${180 + danger * 70}, ${240 - danger * 160}, 80, 0.85)`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffd082";
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRadar(truck) {
    const ctx = this.radarCtx;
    const cw = this.radarCanvas.width;
    const ch = this.radarCanvas.height;
    ctx.clearRect(0, 0, cw, ch);
    const cx = cw / 2;
    const cy = ch / 2;
    const r = 90;

    ctx.strokeStyle = "rgba(65, 181, 255, 0.18)";
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (r * i) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    ctx.fillStyle = "rgba(0, 255, 170, 0.7)";
    for (const pt of truck.radarPoints) {
      const d = Math.min(1, pt.dist / CONFIG.sensors.radarMaxDist);
      const px = cx + Math.cos(pt.angle) * d * r;
      const py = cy + Math.sin(pt.angle) * d * r;
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#ffd082";
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCharts(economy, fleet) {
    if (!this.chartCtx || !this.chartCanvas) return;
    const ctx = this.chartCtx;
    const w = this.chartCanvas.width;
    const h = this.chartCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const stats = economy.getShiftStats();
    const pad = 10;
    const barW = (w - pad * 2) / 3 - pad;
    const maxH = h - pad * 2 - 20;

    // Fuel consumption bar
    const fuelNorm = Math.min(1, stats.totalFuelLiters / 500);
    ctx.fillStyle = "#2e3643";
    ctx.fillRect(pad, pad + maxH * (1 - 1), barW, maxH);
    ctx.fillStyle = "#66bb6a";
    ctx.fillRect(pad, pad + maxH * (1 - fuelNorm), barW, maxH * fuelNorm);
    ctx.fillStyle = "#c8d0da";
    ctx.font = "10px Segoe UI";
    ctx.fillText("Fuel L", pad, h - 2);

    // Tons bar
    const tonsNorm = Math.min(1, stats.tons / 1000);
    ctx.fillStyle = "#2e3643";
    ctx.fillRect(pad * 2 + barW, pad + maxH * (1 - 1), barW, maxH);
    ctx.fillStyle = "#ffa726";
    ctx.fillRect(pad * 2 + barW, pad + maxH * (1 - tonsNorm), barW, maxH * tonsNorm);
    ctx.fillStyle = "#c8d0da";
    ctx.fillText("Tons", pad * 2 + barW, h - 2);

    // Profit bar (can be negative, center at 0)
    const profitNorm = clamp(stats.profit / 50000, -1, 1);
    const zeroY = pad + maxH * 0.5;
    ctx.fillStyle = "#2e3643";
    ctx.fillRect(pad * 3 + barW * 2, pad, barW, maxH);
    if (profitNorm >= 0) {
      ctx.fillStyle = "#42a5f5";
      ctx.fillRect(pad * 3 + barW * 2, zeroY - maxH * 0.5 * profitNorm, barW, maxH * 0.5 * profitNorm);
    } else {
      ctx.fillStyle = "#ef5350";
      ctx.fillRect(pad * 3 + barW * 2, zeroY, barW, maxH * 0.5 * Math.abs(profitNorm));
    }
    ctx.fillStyle = "#c8d0da";
    ctx.fillText("Profit", pad * 3 + barW * 2, h - 2);
  }
}
