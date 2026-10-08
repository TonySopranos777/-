class Fleet {
  constructor(count) {
    this.trucks = [];
    for (let i = 0; i < count; i++) {
      const cfg = CONFIG.trucks[i] || { name: `Самосвал ${i + 1}`, maxCapacity: 140 };
      this.trucks.push(new Truck(i, 0, 0, cfg.name, cfg.maxCapacity));
    }
  }

  resetAtBase(map) {
    if (!map.zones || !map.zones.base) return;
    const base = map.zoneCenter(map.zones.base);
    const baseW = MapManager.tileToWorld(base.x, base.y);
    for (let i = 0; i < this.trucks.length; i++) {
      const t = this.trucks[i];
      const offset = (i - this.trucks.length / 2) * 28;
      t.reset(baseW.x + offset, baseW.y + (i % 2) * 18);
    }
  }

  update(dt, map, weather, economy) {
    for (const truck of this.trucks) {
      truck.update(dt, map, this, weather, economy);
    }
  }

  getTruckObstacleTiles(excludeTruck, map) {
    const set = new Set();
    for (const truck of this.trucks) {
      if (truck === excludeTruck) continue;
      if (truck.state === "LOADING" || truck.state === "UNLOADING" || truck.state === "FUELING" || truck.state === "MAINTENANCE") continue;
      const t = MapManager.worldToTile(truck.x, truck.y);
      const radius = 2;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = t.x + dx;
          const y = t.y + dy;
          if (MapManager.inBounds(x, y)) {
            set.add(key(x, y));
          }
        }
      }
    }
    return set;
  }

  getTruckAt(x, y, radius = 20) {
    for (const truck of this.trucks) {
      if (Math.hypot(truck.x - x, truck.y - y) < radius) return truck;
    }
    return null;
  }

  getTotalFuelPercent() {
    let total = 0;
    for (const t of this.trucks) total += t.fuel / CONFIG.fuel.max;
    return total / this.trucks.length;
  }

  getTotalWearPercent() {
    let total = 0;
    for (const t of this.trucks) total += t.wear;
    return total / this.trucks.length;
  }
}
