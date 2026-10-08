class Truck {
  constructor(id, x, y, name, maxCapacity) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.angle = -0.2;
    this.speed = 0;
    this.fuel = CONFIG.fuel.max;
    this.wear = 0;
    this.cargoLoaded = false;
    this.cargoTons = 0;
    this.state = "IDLE";
    this.route = [];
    this.routeRaw = [];
    this.targetIndex = 0;
    this.aiActive = false;
    this.operation = { active: false, type: "", endMs: 0, onDone: null };
    this.lidarRays = [];
    this.radarPoints = [];
    this.maintenancePlanned = false;
    this.lastReplanMs = 0;
    this.completedTrips = 0;
    this.deliveryFuelStart = null;
    this.manual = false;
    this.skipAiMove = false;
    this.avoidanceOffset = 0;
    this.mileage = 0;
    this.manualMode = false;
    this.name = name || `Самосвал ${id + 1}`;
    this.maxCapacity = maxCapacity || 140;
    this.label = this.name;
    this.color = this._pickColor(id);
  }

  _pickColor(id) {
    const colors = ["#ffa726", "#66bb6a", "#42a5f5", "#ef5350", "#ab47bc"];
    return colors[id % colors.length];
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.angle = -0.2;
    this.speed = 0;
    this.fuel = CONFIG.fuel.max;
    this.wear = 0;
    this.cargoLoaded = false;
    this.cargoTons = 0;
    this.state = "IDLE";
    this.route = [];
    this.routeRaw = [];
    this.targetIndex = 0;
    this.aiActive = false;
    this.operation.active = false;
    this.maintenancePlanned = false;
    this.completedTrips = 0;
    this.deliveryFuelStart = null;
    this.skipAiMove = false;
    this.avoidanceOffset = 0;
    this.mileage = 0;
    this.manualMode = false;
    this.label = this.name;
  }

  isMovingState() {
    return ["TO_LOAD", "TO_UNLOAD", "TO_FUEL", "TO_MAINTENANCE"].includes(this.state);
  }

  isOperationState() {
    return ["LOADING", "UNLOADING", "FUELING", "MAINTENANCE"].includes(this.state);
  }

  targetZoneName() {
    if (this.state === "TO_LOAD") return "load";
    if (this.state === "TO_UNLOAD") return "unload";
    if (this.state === "TO_FUEL") return "fuel";
    if (this.state === "TO_MAINTENANCE") return "maintenance";
    return null;
  }

  update(dt, map, fleet, weather, economy) {
    this.updateOperation(dt);

    if (this.manualMode) {
      this.speed *= 0.92;
      if (Math.abs(this.speed) < 0.1) this.speed = 0;
      this.applySensors(fleet, weather, map);
      this.consumeFuel(dt, map, weather);
      this.accumulateWear(dt, map, weather);
      this.resolveCollisions(fleet);
      return;
    }

    this.checkTransitions(map, economy);

    if (this.isMovingState() && !this.skipAiMove) {
      if (!this.aiActive || this.route.length === 0) {
        this.planRouteToGoal(map, fleet);
      }
      if (this.aiActive && this.route.length > 0) {
        this.followRoute(dt, map, fleet, weather);
      }
    } else if (this.state === "IDLE") {
      this.speed *= 0.9;
      if (Math.abs(this.speed) < 0.1) this.speed = 0;
    }
    this.applySensors(fleet, weather, map);
    this.skipAiMove = false;

    this.consumeFuel(dt, map, weather);
    this.accumulateWear(dt, map, weather);
    this.resolveCollisions(fleet);

    if (this.fuel <= 0.05 && this.state !== "FUELING") {
      this.speed = 0;
      this.aiActive = false;
      if (this.state !== "IDLE") this.state = "IDLE";
    }
  }

  checkTransitions(map, economy) {
    const now = performance.now();
    const zoneNow = map.getCurrentZoneName(MapManager.worldToTile(this.x, this.y));

    if (this.isOperationState()) return;

    // Urgent maintenance
    if (this.wear >= CONFIG.wear.urgentThreshold && this.state !== "TO_MAINTENANCE" && this.state !== "FUELING") {
      this.state = "TO_MAINTENANCE";
      this.route = [];
      this.aiActive = false;
      return;
    }

    // Fuel critical
    if (this.fuel <= CONFIG.fuel.max * CONFIG.fsm.fuelCritical && this.state !== "TO_FUEL" && this.state !== "FUELING" && this.state !== "TO_MAINTENANCE" && this.state !== "MAINTENANCE") {
      this.state = "TO_FUEL";
      this.route = [];
      this.aiActive = false;
      return;
    }

    // Arrival detection
    const targetZone = this.targetZoneName();
    if (targetZone && zoneNow === targetZone) {
      this.onArrival(map, economy);
      return;
    }

    // Idle start
    if (this.state === "IDLE") {
      if (this.wear >= CONFIG.wear.urgentThreshold) {
        this.state = "TO_MAINTENANCE";
      } else if (this.fuel <= CONFIG.fuel.max * CONFIG.fsm.fuelCritical) {
        this.state = "TO_FUEL";
      } else {
        this.state = "TO_LOAD";
      }
    }
  }

  onArrival(map, economy) {
    if (this.state === "TO_LOAD") {
      this.state = "LOADING";
      this.beginOperation("Погрузка", CONFIG.operations.loadSec, () => {
        this.cargoLoaded = true;
        const minLoad = this.maxCapacity * 0.7;
        this.cargoTons = Math.min(this.maxCapacity, minLoad + Math.random() * (this.maxCapacity - minLoad));
        this.deliveryFuelStart = this.fuel;
        this.state = "TO_UNLOAD";
        this.aiActive = false;
        this.route = [];
      });
    } else if (this.state === "TO_UNLOAD") {
      this.state = "UNLOADING";
      this.beginOperation("Разгрузка", CONFIG.operations.unloadSec, () => {
        const delivered = this.cargoTons;
        this.cargoLoaded = false;
        this.cargoTons = 0;
        this.completedTrips++;
        if (economy) {
          economy.recordDelivery(delivered);
          if (this.deliveryFuelStart !== null) {
            economy.recordTripFuel(Math.max(0, this.deliveryFuelStart - this.fuel));
          }
        }
        this.deliveryFuelStart = null;
        if (this.wear >= CONFIG.wear.urgentThreshold || this.maintenancePlanned) {
          this.state = "TO_MAINTENANCE";
          this.maintenancePlanned = false;
        } else if (this.fuel <= CONFIG.fuel.max * CONFIG.fsm.fuelCritical) {
          this.state = "TO_FUEL";
        } else {
          this.state = "TO_LOAD";
        }
        this.aiActive = false;
        this.route = [];
      });
    } else if (this.state === "TO_FUEL") {
      this.state = "FUELING";
      this.beginOperation("Заправка", CONFIG.operations.fuelSec, () => {
        const liters = CONFIG.fuel.max - this.fuel;
        if (economy) economy.recordFuelLiters(liters);
        this.fuel = CONFIG.fuel.max;
        if (this.wear >= CONFIG.wear.urgentThreshold || this.maintenancePlanned) {
          this.state = "TO_MAINTENANCE";
          this.maintenancePlanned = false;
        } else {
          this.state = "TO_LOAD";
        }
        this.aiActive = false;
        this.route = [];
      });
    } else if (this.state === "TO_MAINTENANCE") {
      this.state = "MAINTENANCE";
      const duration = randRange(CONFIG.operations.maintenanceSecMin, CONFIG.operations.maintenanceSecMax);
      this.beginOperation("ТО", duration, () => {
        if (economy) economy.recordMaintenance();
        this.wear = 0;
        this.maintenancePlanned = false;
        this.state = "TO_LOAD";
        this.aiActive = false;
        this.route = [];
      });
    }
  }

  beginOperation(type, seconds, onDone) {
    this.speed = 0;
    this.aiActive = false;
    this.operation.active = true;
    this.operation.type = type;
    this.operation.remaining = seconds;
    this.operation.duration = seconds;
    this.operation.onDone = onDone;
  }

  updateOperation(dt) {
    if (!this.operation.active) return;
    this.operation.remaining -= dt;
    if (this.operation.remaining <= 0) {
      const done = this.operation.onDone;
      this.operation.active = false;
      this.operation.type = "";
      this.operation.onDone = null;
      if (done) done();
    }
  }

  planRouteToGoal(map, fleet) {
    const now = performance.now();
    if (now - this.lastReplanMs < CONFIG.fsm.pathReplanCooldownSec * 1000) return;
    this.lastReplanMs = now;

    const zoneName = this.targetZoneName();
    if (!zoneName || !map.zones) return;
    const targetZone = map.zones[zoneName];
    if (!targetZone) return;

    const startTile = MapManager.worldToTile(this.x, this.y);
    const goalTile = map.zoneCenter(targetZone);

    const extraBlocked = fleet ? fleet.getTruckObstacleTiles(this, map) : null;
    const routeWorld = map.planRoute(startTile, goalTile, extraBlocked);
    if (routeWorld.length > 0) {
      this.route = routeWorld;
      this.targetIndex = 0;
      this.aiActive = true;
    }
  }

  followRoute(dt, map, fleet, weather) {
    if (this.route.length === 0 || this.targetIndex >= this.route.length) {
      this.aiActive = false;
      return;
    }

    const target = this.route[this.targetIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const avoid = this.computeAvoidance();
    this.avoidanceOffset = lerp(this.avoidanceOffset, avoid * 0.35, 0.12);
    const desired = Math.atan2(dy, dx) + this.avoidanceOffset;
    const stepAngle = Math.PI / 4;
    const snapped = Math.round(desired / stepAngle) * stepAngle;

    let desiredSpeed = Math.max(0.45, Math.min(1.8, Math.hypot(dx, dy) / 24));

    // Sensor braking
    const frontDist = Sensors.frontObstacleDistance(this.lidarRays, this.angle);
    if (frontDist !== Infinity && frontDist < CONFIG.sensors.lidarMaxDist * CONFIG.sensors.brakeDistFactor) {
      desiredSpeed *= clamp(frontDist / (CONFIG.sensors.lidarMaxDist * CONFIG.sensors.brakeDistFactor), 0, 1);
    }

    // Weather traction
    let traction = 1.0;
    if (weather === "rain") traction = CONFIG.physics.rainTraction;
    if (weather === "dust") traction = CONFIG.physics.dustTraction;

    this.angle = snapped;
    this.speed += (desiredSpeed - this.speed) * 2.2 * dt * traction;
    this.move(dt, map, weather);

    // Deviation replan
    const deviation = map.deviationFromRoute({ x: this.x, y: this.y }, this.route);
    if (deviation > CONFIG.fsm.routeDeviationMax) {
      this.planRouteToGoal(map, fleet);
      return;
    }

    if (Math.hypot(dx, dy) < CONFIG.fsm.waypointSnapDist) {
      this.x = target.x;
      this.y = target.y;
      this.speed *= 0.25;
      this.targetIndex++;
      if (this.targetIndex >= this.route.length) {
        this.aiActive = false;
        this.route = [];
        this.speed *= 0.35;
      }
    }
  }

  applySensors(fleet, weather, map) {
    const others = fleet ? fleet.trucks.filter((t) => t !== this) : [];
    this.lidarRays = Sensors.castLiDAR(this, map, weather, others);
    this.radarPoints = Sensors.castRadar(this, map, weather, others);
  }

  computeAvoidance() {
    let leftSpace = 0;
    let rightSpace = 0;
    for (const ray of this.lidarRays) {
      const diff = angleDiff(ray.angle, this.angle);
      if (diff > 0.1 && diff < Math.PI / 2) leftSpace += ray.dist;
      else if (diff < -0.1 && diff > -Math.PI / 2) rightSpace += ray.dist;
    }
    const frontDist = Sensors.frontObstacleDistance(this.lidarRays, this.angle);
    if (frontDist === Infinity || frontDist > 80) return 0;
    if (leftSpace > rightSpace * 1.3) return 1.2;
    if (rightSpace > leftSpace * 1.3) return -1.2;
    return 0;
  }

  move(dt, map, weather) {
    const prevX = this.x;
    const prevY = this.y;
    const scale = CONFIG.physics.moveScale;
    const nx = this.x + Math.cos(this.angle) * this.speed * scale * dt;
    const ny = this.y + Math.sin(this.angle) * this.speed * scale * dt;
    const t = MapManager.worldToTile(nx, ny);

    if (MapManager.inBounds(t.x, t.y) && !map.grid[t.y][t.x].blocked) {
      this.x = nx;
      this.y = ny;
      this.mileage += Math.hypot(this.x - prevX, this.y - prevY);
    } else {
      this.speed *= -0.15;
    }
  }

  consumeFuel(dt, map, weather) {
    if (Math.abs(this.speed) < 0.08) return;
    const t = MapManager.worldToTile(this.x, this.y);
    let terrainCost = 1;
    if (MapManager.inBounds(t.x, t.y)) terrainCost = map.grid[t.y][t.x].cost;
    let usage = CONFIG.fuel.baseUsage + Math.abs(this.speed) * CONFIG.fuel.speedCoeff + terrainCost * CONFIG.fuel.terrainCoeff;
    if (this.cargoLoaded) usage += this.cargoTons * CONFIG.fuel.cargoCoeff * 0.01;
    if (weather === "rain" || weather === "dust") usage += CONFIG.fuel.weatherCoeff;
    this.fuel = Math.max(0, this.fuel - usage * dt * 60);
  }

  accumulateWear(dt, map, weather) {
    if (Math.abs(this.speed) < 0.08) return;
    const t = MapManager.worldToTile(this.x, this.y);
    let terrainCost = 1;
    if (MapManager.inBounds(t.x, t.y)) terrainCost = map.grid[t.y][t.x].cost;
    let inc = CONFIG.wear.baseRate + Math.abs(this.speed) * CONFIG.wear.speedCoeff + terrainCost * CONFIG.wear.terrainCoeff;
    if (this.cargoLoaded) inc += this.cargoTons * CONFIG.wear.cargoCoeff * 0.01;
    if (weather === "rain") inc *= 1.2;
    this.wear = Math.min(CONFIG.wear.max, this.wear + inc * dt);

    if (this.wear >= CONFIG.wear.planThreshold && !this.maintenancePlanned && this.state !== "TO_MAINTENANCE" && this.state !== "MAINTENANCE") {
      this.maintenancePlanned = true;
    }
  }

  resolveCollisions(fleet) {
    if (!fleet) return;
    for (const other of fleet.trucks) {
      if (other === this) continue;
      const d = Math.hypot(this.x - other.x, this.y - other.y);
      const minDist = CONFIG.fleet.separationRadius;
      if (d < minDist && d > 0) {
        const overlap = minDist - d;
        const nx = (this.x - other.x) / d;
        const ny = (this.y - other.y) / d;
        this.x += nx * overlap * 0.5;
        this.y += ny * overlap * 0.5;
        other.x -= nx * overlap * 0.5;
        other.y -= ny * overlap * 0.5;
        if (d < minDist * 0.6) {
          this.speed *= 0.7;
          other.speed *= 0.7;
        }
      }
    }
  }
}
