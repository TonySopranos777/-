const Sensors = {
  weatherRangeFactor(weather) {
    if (weather === "fog") return CONFIG.sensors.fogRangeFactor;
    if (weather === "dust") return 0.75;
    if (weather === "rain") return 0.9;
    return 1.0;
  },

  castLiDAR(truck, map, weather, otherTrucks) {
    const rays = [];
    const maxDist = CONFIG.sensors.lidarMaxDist * this.weatherRangeFactor(weather);
    const ox = truck.x;
    const oy = truck.y;
    const count = CONFIG.sensors.lidarRays;
    const step = CONFIG.sensors.lidarStep;

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      let hitDist = maxDist;
      let hit = false;
      for (let d = step; d <= maxDist; d += step) {
        const rx = ox + Math.cos(a) * d;
        const ry = oy + Math.sin(a) * d;
        const t = MapManager.worldToTile(rx, ry);
        if (!MapManager.inBounds(t.x, t.y) || map.grid[t.y][t.x].blocked) {
          hitDist = d;
          hit = true;
          break;
        }
        let truckHit = false;
        for (const other of otherTrucks) {
          if (other === truck) continue;
          if (Math.hypot(rx - other.x, ry - other.y) < 14) {
            hitDist = d;
            hit = true;
            truckHit = true;
            break;
          }
        }
        if (truckHit) break;
      }
      if (weather === "dust") {
        const noise = (Math.random() - 0.5) * CONFIG.sensors.dustNoiseMax * 2;
        hitDist = clamp(hitDist + noise, 0, maxDist);
      }
      rays.push({ angle: a, dist: hitDist, hit });
    }
    return rays;
  },

  castRadar(truck, map, weather, otherTrucks) {
    const points = [];
    const maxDist = CONFIG.sensors.radarMaxDist * this.weatherRangeFactor(weather);
    const ox = truck.x;
    const oy = truck.y;
    const count = CONFIG.sensors.lidarRays;
    const step = CONFIG.sensors.lidarStep;

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      for (let d = step; d <= maxDist; d += step) {
        const rx = ox + Math.cos(a) * d;
        const ry = oy + Math.sin(a) * d;
        const t = MapManager.worldToTile(rx, ry);
        if (!MapManager.inBounds(t.x, t.y) || map.grid[t.y][t.x].blocked) {
          points.push({ angle: a, dist: d, x: rx, y: ry, type: "wall" });
          break;
        }
        for (const other of otherTrucks) {
          if (other === truck) continue;
          if (Math.hypot(rx - other.x, ry - other.y) < 14) {
            points.push({ angle: a, dist: d, x: rx, y: ry, type: "truck" });
            break;
          }
        }
      }
    }
    return points;
  },

  frontObstacleDistance(lidarRays, truckAngle, sectorHalf = CONFIG.sensors.frontSector) {
    let minDist = Infinity;
    for (const ray of lidarRays) {
      const diff = Math.abs(angleDiff(ray.angle, truckAngle));
      if (diff < sectorHalf && ray.hit && ray.dist < minDist) {
        minDist = ray.dist;
      }
    }
    return minDist;
  },

  nearestTruckAhead(lidarRays, truckAngle, sectorHalf = CONFIG.sensors.frontSector) {
    let minDist = Infinity;
    for (const ray of lidarRays) {
      const diff = Math.abs(angleDiff(ray.angle, truckAngle));
      if (diff < sectorHalf && ray.hit && ray.dist < minDist) {
        minDist = ray.dist;
      }
    }
    return minDist === Infinity ? null : minDist;
  }
};
