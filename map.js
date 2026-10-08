class MapManager {
  constructor() {
    this.grid = [];
    this.obstacles = [];
    this.mapType = "north";
    this.zones = null;
  }

  static inBounds(x, y) {
    return x >= 0 && y >= 0 && x < CONFIG.GRID_W && y < CONFIG.GRID_H;
  }

  static worldToTile(wx, wy) {
    return { x: Math.floor(wx / CONFIG.TILE), y: Math.floor(wy / CONFIG.TILE) };
  }

  static tileToWorld(tx, ty) {
    return { x: tx * CONFIG.TILE + CONFIG.TILE * 0.5, y: ty * CONFIG.TILE + CONFIG.TILE * 0.5 };
  }

  static heuristic(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  generate(type) {
    this.mapType = type;
    const seedMap = { north: 3, deep: 9, ridge: 15, west: 19, south: 25, east: 37, canyon: 41, terrace: 31 };
    const seed = seedMap[type] || 3;

    this.grid = [];
    this.obstacles = [];

    for (let y = 0; y < CONFIG.GRID_H; y++) {
      const row = [];
      for (let x = 0; x < CONFIG.GRID_W; x++) {
        const nx = x / CONFIG.GRID_W;
        const ny = y / CONFIG.GRID_H;
        const base = hashNoise(x, y, seed);
        const slope = Math.abs(hashNoise(x + 11, y - 7, seed + 4) - 0.5) * 2;
        const rough = hashNoise(x * 2, y * 2, seed + 8);
        let blocked = false;

        if (type === "north") {
          const hill = Math.hypot(nx - 0.35, ny - 0.28);
          blocked = base > 0.88 || (hill < 0.18 && base > 0.55) || (ny < 0.16 && base > 0.68);
        } else if (type === "deep") {
          const pit = Math.hypot(nx - 0.5, ny - 0.55);
          blocked = base > 0.90 || pit < 0.13 || (pit > 0.40 && pit < 0.44);
        } else if (type === "ridge") {
          const ridge = Math.abs(ny - (0.22 + 0.48 * nx));
          const ridge2 = Math.abs(ny - (0.55 - 0.35 * nx));
          blocked = base > 0.89 || ridge < 0.055 || (ridge2 < 0.045 && base > 0.7);
        } else if (type === "west") {
          const valley = Math.abs(ny - (0.72 - 0.48 * nx));
          const hill = Math.hypot(nx - 0.75, ny - 0.25);
          blocked = base > 0.89 || valley < 0.045 || (hill < 0.14 && base > 0.6);
        } else if (type === "south") {
          const rock = Math.hypot(nx - 0.65, ny - 0.35);
          blocked = base > 0.89 || (ny > 0.72 && base > 0.64) || (nx > 0.82 && ny > 0.48) || (rock < 0.16 && base > 0.6);
        } else if (type === "east") {
          const cliff = Math.abs(nx - (0.25 + 0.4 * ny));
          const mound = Math.hypot(nx - 0.72, ny - 0.62);
          blocked = base > 0.88 || cliff < 0.05 || (mound < 0.18 && base > 0.58) || (ny > 0.78 && base > 0.72);
        } else if (type === "canyon") {
          const canyon = Math.abs(ny - (0.35 + 0.25 * Math.sin(nx * 5.5)));
          const wall = Math.abs(ny - (0.35 + 0.25 * Math.sin(nx * 5.5) + 0.28));
          blocked = base > 0.91 || canyon < 0.04 || wall < 0.04 || (nx < 0.12 && base > 0.75) || (nx > 0.88 && base > 0.75);
        } else {
          const terraced = Math.abs(Math.hypot(nx - 0.52, ny - 0.57) - 0.3);
          blocked = base > 0.93 || terraced < 0.02;
        }

        if (x < 2 || y < 2 || x > CONFIG.GRID_W - 3 || y > CONFIG.GRID_H - 3) blocked = true;
        const tile = { x, y, blocked, slope, rough, cost: 1 + slope * 1.7 + rough * 1.1 };
        row.push(tile);
        if (blocked) this.obstacles.push(tile);
      }
      this.grid.push(row);
    }

    this.carveRoads(type);
    if (type === "terrace") this.applySpiralRoad();
    this.zones = this.getZones(type);
    this.carveZoneRoads();
    return this;
  }

  carveRoads(type) {
    const lines =
      type === "north"
        ? [[8, 48, 72, 45], [10, 10, 62, 18], [16, 52, 68, 11]]
        : type === "deep"
        ? [[8, 50, 76, 16], [15, 10, 68, 44], [40, 7, 40, 52]]
        : type === "ridge"
        ? [[8, 10, 76, 44], [10, 48, 62, 12], [33, 7, 78, 28]]
        : type === "west"
        ? [[8, 44, 76, 12], [14, 12, 74, 39], [24, 51, 66, 20]]
        : type === "south"
        ? [[8, 11, 66, 21], [14, 35, 78, 49], [16, 52, 58, 16]]
        : type === "east"
        ? [[8, 12, 74, 18], [14, 48, 68, 14], [40, 8, 42, 52]]
        : type === "canyon"
        ? [[8, 14, 76, 20], [12, 42, 74, 48], [44, 8, 46, 52]]
        : [[9, 9, 39, 11], [39, 11, 74, 16], [74, 16, 72, 50], [15, 11, 72, 50]];

    for (const [x1, y1, x2, y2] of lines) this.carveLine(x1, y1, x2, y2, 2);
  }

  carveLine(x1, y1, x2, y2, radius) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let i = 0; i <= steps; i++) {
      const t = i / Math.max(steps, 1);
      const x = Math.round(x1 + (x2 - x1) * t);
      const y = Math.round(y1 + (y2 - y1) * t);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const tx = x + dx;
          const ty = y + dy;
          if (!MapManager.inBounds(tx, ty)) continue;
          const cell = this.grid[ty][tx];
          cell.blocked = false;
          cell.cost = Math.max(0.8, cell.cost - 0.6);
          cell.rough *= 0.6;
        }
      }
    }
  }

  applySpiralRoad() {
    for (let y = 0; y < CONFIG.GRID_H; y++) {
      for (let x = 0; x < CONFIG.GRID_W; x++) {
        const c = this.grid[y][x];
        c.blocked = true;
        c.cost = 5.5;
      }
    }

    const cx = Math.floor(CONFIG.GRID_W * 0.63);
    const cy = Math.floor(CONFIG.GRID_H * 0.68);
    const maxR = Math.min(CONFIG.GRID_W, CONFIG.GRID_H) * 0.46;
    const minR = 9;
    const turns = 8.8;
    const steps = 3800;
    let prev = null;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = turns * Math.PI * 2 * t + Math.PI * 0.02;
      const r = maxR - t * (maxR - minR);
      const x = Math.round(cx + Math.cos(a) * r);
      const y = Math.round(cy + Math.sin(a) * r);
      if (prev) this.carveLine(prev.x, prev.y, x, y, 2);
      prev = { x, y };
    }

    const access = this.getTerraceAccessPoints();
    this.carveLine(access.top.x, access.top.y, access.entry.x, access.entry.y, 3);
    this.carveLine(access.exit.x, access.exit.y, access.bottom.x, access.bottom.y, 3);

    for (let y = 2; y < CONFIG.GRID_H - 2; y++) {
      for (let x = 2; x < CONFIG.GRID_W - 2; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.hypot(dx, dy);
        if (r > maxR + 1 || r < minR - 2) continue;
        const c = this.grid[y][x];
        if (!c.blocked) continue;
        const band = Math.floor(r / 4);
        if (band % 2 === 0 && Math.abs(r - band * 4) < 0.7) {
          c.blocked = true;
          c.cost = 8;
        }
      }
    }

    for (let y = 2; y < CONFIG.GRID_H - 2; y++) {
      for (let x = 2; x < CONFIG.GRID_W - 2; x++) {
        if (this.grid[y][x].blocked) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
            const n = this.grid[y + dy][x + dx];
            if (!n.blocked) continue;
            n.blocked = false;
            n.cost = 1.15;
          }
        }
      }
    }

    for (let y = 3; y < CONFIG.GRID_H - 3; y++) {
      for (let x = 3; x < CONFIG.GRID_W - 3; x++) {
        if (this.grid[y][x].blocked) continue;
        const freeDiag =
          (!this.grid[y - 1][x - 1].blocked ? 1 : 0) +
          (!this.grid[y - 1][x + 1].blocked ? 1 : 0) +
          (!this.grid[y + 1][x - 1].blocked ? 1 : 0) +
          (!this.grid[y + 1][x + 1].blocked ? 1 : 0);
        const freeCross =
          (!this.grid[y - 1][x].blocked ? 1 : 0) +
          (!this.grid[y + 1][x].blocked ? 1 : 0) +
          (!this.grid[y][x - 1].blocked ? 1 : 0) +
          (!this.grid[y][x + 1].blocked ? 1 : 0);
        if (freeDiag >= 3 && freeCross <= 1) {
          this.grid[y][x].blocked = true;
          this.grid[y][x].cost = 8;
        }
      }
    }
  }

  getZones(type) {
    if (type === "north") {
      return {
        base: { x: 8, y: 49, w: 8, h: 4, name: "База" },
        load: { x: 18, y: 10, w: 9, h: 5, name: "Погрузка" },
        unload: { x: 66, y: 44, w: 11, h: 6, name: "Разгрузка" },
        fuel: { x: 52, y: 13, w: 7, h: 4, name: "АЗС" },
        maintenance: { x: 38, y: 48, w: 8, h: 4, name: "ТО" }
      };
    }
    if (type === "deep") {
      return {
        base: { x: 8, y: 50, w: 8, h: 4, name: "База" },
        load: { x: 32, y: 31, w: 9, h: 5, name: "Погрузка" },
        unload: { x: 67, y: 14, w: 11, h: 6, name: "Разгрузка" },
        fuel: { x: 16, y: 10, w: 7, h: 4, name: "АЗС" },
        maintenance: { x: 55, y: 40, w: 8, h: 4, name: "ТО" }
      };
    }
    if (type === "ridge") {
      return {
        base: { x: 9, y: 10, w: 8, h: 4, name: "База" },
        load: { x: 19, y: 38, w: 9, h: 5, name: "Погрузка" },
        unload: { x: 68, y: 24, w: 11, h: 6, name: "Разгрузка" },
        fuel: { x: 49, y: 42, w: 7, h: 4, name: "АЗС" },
        maintenance: { x: 30, y: 10, w: 8, h: 4, name: "ТО" }
      };
    }
    if (type === "west") {
      return {
        base: { x: 7, y: 46, w: 8, h: 4, name: "База" },
        load: { x: 15, y: 14, w: 9, h: 5, name: "Погрузка" },
        unload: { x: 69, y: 18, w: 11, h: 6, name: "Разгрузка" },
        fuel: { x: 56, y: 40, w: 7, h: 4, name: "АЗС" },
        maintenance: { x: 35, y: 46, w: 8, h: 4, name: "ТО" }
      };
    }
    if (type === "south") {
      return {
        base: { x: 8, y: 11, w: 8, h: 4, name: "База" },
        load: { x: 21, y: 22, w: 9, h: 5, name: "Погрузка" },
        unload: { x: 70, y: 47, w: 11, h: 6, name: "Разгрузка" },
        fuel: { x: 58, y: 17, w: 7, h: 4, name: "АЗС" },
        maintenance: { x: 40, y: 11, w: 8, h: 4, name: "ТО" }
      };
    }
    if (type === "east") {
      return {
        base: { x: 8, y: 14, w: 8, h: 4, name: "База" },
        load: { x: 20, y: 42, w: 9, h: 5, name: "Погрузка" },
        unload: { x: 68, y: 20, w: 11, h: 6, name: "Разгрузка" },
        fuel: { x: 52, y: 46, w: 7, h: 4, name: "АЗС" },
        maintenance: { x: 36, y: 14, w: 8, h: 4, name: "ТО" }
      };
    }
    if (type === "canyon") {
      return {
        base: { x: 8, y: 16, w: 8, h: 4, name: "База" },
        load: { x: 22, y: 36, w: 9, h: 5, name: "Погрузка" },
        unload: { x: 66, y: 18, w: 11, h: 6, name: "Разгрузка" },
        fuel: { x: 50, y: 44, w: 7, h: 4, name: "АЗС" },
        maintenance: { x: 34, y: 16, w: 8, h: 4, name: "ТО" }
      };
    }
    return {
      base: { x: 12, y: 6, w: 11, h: 5, name: "База" },
      load: { x: 36, y: 6, w: 13, h: 6, name: "Погрузка" },
      fuel: { x: 62, y: 7, w: 9, h: 5, name: "АЗС" },
      unload: { x: 82, y: 75, w: 16, h: 8, name: "Разгрузка" },
      maintenance: { x: 88, y: 6, w: 9, h: 5, name: "ТО" }
    };
  }

  getTerraceAccessPoints() {
    return {
      top: { x: Math.floor(CONFIG.GRID_W * 0.47), y: Math.floor(CONFIG.GRID_H * 0.2) },
      entry: { x: Math.floor(CONFIG.GRID_W * 0.58), y: Math.floor(CONFIG.GRID_H * 0.27) },
      exit: { x: Math.floor(CONFIG.GRID_W * 0.78), y: Math.floor(CONFIG.GRID_H * 0.79) },
      bottom: { x: Math.floor(CONFIG.GRID_W * 0.74), y: Math.floor(CONFIG.GRID_H * 0.9) }
    };
  }

  carveZoneRoads() {
    if (!this.zones) return;
    for (const zone of Object.values(this.zones)) {
      for (let y = zone.y; y < zone.y + zone.h; y++) {
        for (let x = zone.x; x < zone.x + zone.w; x++) {
          if (!MapManager.inBounds(x, y)) continue;
          const cell = this.grid[y][x];
          cell.blocked = false;
          cell.cost = 0.85;
          cell.rough *= 0.5;
        }
      }
    }
    const b = this.zoneCenter(this.zones.base);
    const l = this.zoneCenter(this.zones.load);
    const u = this.zoneCenter(this.zones.unload);
    const f = this.zoneCenter(this.zones.fuel);
    const m = this.zoneCenter(this.zones.maintenance);
    this.carveLine(b.x, b.y, l.x, l.y, 2);
    this.carveLine(l.x, l.y, f.x, f.y, 2);
    this.carveLine(f.x, f.y, m.x, m.y, 2);
    this.carveLine(m.x, m.y, b.x, b.y, 2);
    if (this.mapType === "terrace") {
      const access = this.getTerraceAccessPoints();
      this.carveLine(f.x, f.y, access.top.x, access.top.y, 3);
      this.carveLine(l.x, l.y, access.top.x, access.top.y, 3);
      this.carveLine(b.x, b.y, l.x, l.y, 3);
      this.carveLine(access.bottom.x, access.bottom.y, u.x, u.y, 3);
    } else {
      this.carveLine(l.x, l.y, u.x, u.y, 2);
      this.carveLine(u.x, u.y, f.x, f.y, 2);
      this.carveLine(u.x, u.y, m.x, m.y, 2);
    }
  }

  zoneCenter(zone) {
    return {
      x: Math.floor(zone.x + zone.w / 2),
      y: Math.floor(zone.y + zone.h / 2)
    };
  }

  isInZone(tile, zone) {
    return tile.x >= zone.x && tile.x < zone.x + zone.w && tile.y >= zone.y && tile.y < zone.y + zone.h;
  }

  getCurrentZoneName(tile) {
    if (!this.zones) return null;
    if (this.isInZone(tile, this.zones.load)) return "load";
    if (this.isInZone(tile, this.zones.unload)) return "unload";
    if (this.isInZone(tile, this.zones.fuel)) return "fuel";
    if (this.isInZone(tile, this.zones.maintenance)) return "maintenance";
    if (this.isInZone(tile, this.zones.base)) return "base";
    return null;
  }

  nearestOpenTile(tile, maxRadius = 14) {
    if (MapManager.inBounds(tile.x, tile.y) && !this.grid[tile.y][tile.x].blocked) return tile;
    for (let r = 1; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = tile.x + dx;
          const y = tile.y + dy;
          if (!MapManager.inBounds(x, y)) continue;
          if (!this.grid[y][x].blocked) return { x, y };
        }
      }
    }
    return null;
  }

  findPath(start, goal, extraBlocked = null) {
    const resolvedStart = this.nearestOpenTile(start, 18);
    const resolvedGoal = this.nearestOpenTile(goal, 18);
    if (!resolvedStart || !resolvedGoal) return [];

    const pq = new PriorityQueue((a, b) => a.priority - b.priority);
    const closed = new Set();
    const came = new Map();
    const g = new Map();
    const f = new Map();
    const startK = key(resolvedStart.x, resolvedStart.y);
    g.set(startK, 0);
    f.set(startK, MapManager.heuristic(resolvedStart, resolvedGoal));
    pq.push(resolvedStart, f.get(startK));

    while (pq.size() > 0) {
      const current = pq.pop();
      const ck = key(current.x, current.y);
      if (closed.has(ck)) continue;
      closed.add(ck);
      if (current.x === resolvedGoal.x && current.y === resolvedGoal.y) {
        return this.reconstructPath(came, current);
      }

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = current.x + dx;
          const ny = current.y + dy;
          if (!MapManager.inBounds(nx, ny)) continue;
          const cell = this.grid[ny][nx];
          if (cell.blocked) continue;
          const nk = key(nx, ny);
          if (extraBlocked && extraBlocked.has(nk)) continue;
          if (closed.has(nk)) continue;
          if (dx !== 0 && dy !== 0) {
            const sideA = this.grid[current.y][nx];
            const sideB = this.grid[ny][current.x];
            if (sideA.blocked || sideB.blocked) continue;
          }
          const step = dx !== 0 && dy !== 0 ? 1.4142 : 1;
          const tentative = (g.get(ck) ?? Infinity) + cell.cost * step;
          if (tentative < (g.get(nk) ?? Infinity)) {
            came.set(nk, current);
            g.set(nk, tentative);
            const nf = tentative + MapManager.heuristic({ x: nx, y: ny }, resolvedGoal);
            f.set(nk, nf);
            pq.push({ x: nx, y: ny }, nf);
          }
        }
      }
    }
    return [];
  }

  reconstructPath(came, current) {
    const path = [current];
    while (came.has(key(current.x, current.y))) {
      current = came.get(key(current.x, current.y));
      path.push(current);
    }
    return path.reverse();
  }

  smoothPath(path) {
    if (path.length < 3) return path;
    const out = [path[0]];
    for (let i = 1; i < path.length - 1; i++) {
      const a = out[out.length - 1];
      const b = path[i];
      const c = path[i + 1];
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const bcx = c.x - b.x;
      const bcy = c.y - b.y;
      if (abx === bcx && aby === bcy) continue;
      out.push(b);
    }
    out.push(path[path.length - 1]);
    return out;
  }

  planRoute(startTile, endTile, extraBlocked = null) {
    const raw = this.findPath(startTile, endTile, extraBlocked);
    if (raw.length === 0) return [];
    const smooth = this.smoothPath(raw);
    return smooth.map((t) => MapManager.tileToWorld(t.x, t.y));
  }

  deviationFromRoute(worldPos, route, maxCheck = 40) {
    if (!route || route.length === 0) return Infinity;
    let best = Infinity;
    const start = Math.max(0, route.length - maxCheck);
    for (let i = start; i < route.length; i++) {
      const d = Math.hypot(worldPos.x - route[i].x, worldPos.y - route[i].y);
      if (d < best) best = d;
    }
    return best;
  }

  getTileCostAtWorld(wx, wy) {
    const t = MapManager.worldToTile(wx, wy);
    if (!MapManager.inBounds(t.x, t.y)) return 5;
    return this.grid[t.y][t.x].cost;
  }
}
