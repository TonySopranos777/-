class Simulation {
  constructor() {
    this.map = new MapManager();
    this.fleet = new Fleet(CONFIG.TRUCK_COUNT);
    this.economy = new Economy();
    this.camera = new Camera();
    this.renderer = new Renderer();
    this.keys = {};
    this.paused = false;
    this.timeScale = CONFIG.timeScale.options[CONFIG.timeScale.defaultIndex];
    this.weather = "clear";
    this.timeOfDay = "day";
    this.prevTime = performance.now();
    this.manualTruckIndex = 0;

    this.maps = [
      { id: "north", name: "Северный карьер" },
      { id: "deep", name: "Глубокий разрез" },
      { id: "ridge", name: "Каменный хребет" },
      { id: "west", name: "Западный карьер" },
      { id: "south", name: "Южный карьер" },
      { id: "east", name: "Восточный карьер" },
      { id: "canyon", name: "Каньон" },
      { id: "terrace", name: "Террасный карьер (спираль)" }
    ];

    window.simMap = this.map;
    window.simEconomy = this.economy;

    this.mode = "ai";
    this.ui = new UI(
      () => this.reset(),
      () => this.togglePause(),
      (v) => this.setTimeScale(v),
      (v) => this.setZoom(v),
      (v) => this.selectCamera(v),
      (type) => this.setMap(type),
      (m) => this.setMode(m)
    );

    this._bindInputs();
    this.setMap(this.maps[0].id);
    this.ui.initFleetCards(CONFIG.TRUCK_COUNT);
    this.ui.initCameraOptions(CONFIG.trucks.map((t) => t.name));
    this.ui.initMapOptions(this.maps);
    requestAnimationFrame((t) => this.loop(t));
  }

  setMap(type) {
    this.map.generate(type);
    this.fleet.resetAtBase(this.map);
    this.economy.reset();
    this.camera.followIndex = 0;
    this.manualTruckIndex = 0;
    this.mode = "ai";
    if (this.ui) {
      this.ui.cameraSelect.value = 0;
      this.ui.manualBtn.classList.remove("active");
      this.ui.aiBtn.classList.add("active");
    }
    this._syncManualTruck();
  }

  reset() {
    this.setMap(this.map.mapType);
    if (this.ui && this.ui.statusText) this.ui.statusText.textContent = "Статус: сценарий сброшен";
  }

  update(dt) {
    const weather = this.weather;
    const hadInput = this.keys["w"] || this.keys["ц"] || this.keys["arrowup"] ||
                     this.keys["s"] || this.keys["ы"] || this.keys["arrowdown"] ||
                     this.keys["a"] || this.keys["ф"] || this.keys["arrowleft"] ||
                     this.keys["d"] || this.keys["в"] || this.keys["arrowright"];
    if (hadInput) {
      const t = this.fleet.trucks[this.manualTruckIndex];
      if (t) t.skipAiMove = true;
    }
    this.fleet.update(dt, this.map, weather, this.economy);
    this.updateManual(dt);
    this.camera.update(this.fleet.trucks, this.renderer.simCanvas.width, this.renderer.simCanvas.height);
  }

  togglePause() {
    this.paused = !this.paused;
  }

  setTimeScale(v) {
    this.timeScale = v;
  }

  setZoom(v) {
    this.camera.zoom = v;
  }

  selectCamera(v) {
    this.camera.followIndex = v;
    this.manualTruckIndex = v;
    this._syncManualTruck();
  }

  setMode(m) {
    this.mode = m;
    this._syncManualTruck();
    if (this.ui && this.ui.statusText) {
      this.ui.statusText.textContent = m === "ai" ? "Статус: ИИ режим" : "Статус: ручное управление выбранным самосвалом";
    }
  }

  _syncManualTruck() {
    for (let i = 0; i < this.fleet.trucks.length; i++) {
      this.fleet.trucks[i].manualMode = (this.mode === "manual" && i === this.manualTruckIndex);
    }
  }

  updateManual(dt) {
    const truck = this.fleet.trucks[this.manualTruckIndex];
    if (!truck || truck.operation.active) return;
    const up = this.keys["w"] || this.keys["ц"] || this.keys["arrowup"];
    const down = this.keys["s"] || this.keys["ы"] || this.keys["arrowdown"];
    const left = this.keys["a"] || this.keys["ф"] || this.keys["arrowleft"];
    const right = this.keys["d"] || this.keys["в"] || this.keys["arrowright"];
    const acc = (up ? 1 : 0) - (down ? 1 : 0);
    const steer = (right ? 1 : 0) - (left ? 1 : 0);
    if (acc === 0 && steer === 0) return;

    let traction = 1.0;
    if (this.weather === "rain") traction = CONFIG.physics.rainTraction;
    if (this.weather === "dust") traction = CONFIG.physics.dustTraction;

    truck.speed += acc * CONFIG.physics.accel * dt * traction;
    truck.speed *= CONFIG.physics.friction;
    truck.speed = Math.max(-CONFIG.physics.reverseMax, Math.min(CONFIG.physics.maxSpeed, truck.speed));
    truck.angle += steer * (CONFIG.physics.steerBase + Math.abs(truck.speed) * CONFIG.physics.steerSpeedFactor) * dt;

    const prevX = truck.x;
    const prevY = truck.y;
    const nx = truck.x + Math.cos(truck.angle) * truck.speed * CONFIG.physics.moveScale * dt;
    const ny = truck.y + Math.sin(truck.angle) * truck.speed * CONFIG.physics.moveScale * dt;
    const t = MapManager.worldToTile(nx, ny);
    if (MapManager.inBounds(t.x, t.y) && !this.map.grid[t.y][t.x].blocked) {
      truck.x = nx;
      truck.y = ny;
      truck.mileage += Math.hypot(truck.x - prevX, truck.y - prevY);
    } else {
      truck.speed *= -0.15;
    }
  }

  tryManualZoneAction() {
    const truck = this.fleet.trucks[this.manualTruckIndex];
    if (!truck || truck.operation.active) return;
    const tile = MapManager.worldToTile(truck.x, truck.y);
    const map = this.map;
    if (map.isInZone(tile, map.zones.load) && !truck.cargoLoaded) {
      truck.state = "LOADING";
      truck.beginOperation("Погрузка (ручн.)", CONFIG.operations.loadSec, () => {
        truck.cargoLoaded = true;
        truck.cargoTons = 95 + Math.random() * 40;
        truck.deliveryFuelStart = truck.fuel;
        truck.state = "TO_UNLOAD";
        truck.aiActive = false;
        truck.route = [];
      });
    } else if (map.isInZone(tile, map.zones.unload) && truck.cargoLoaded) {
      truck.state = "UNLOADING";
      truck.beginOperation("Разгрузка (ручн.)", CONFIG.operations.unloadSec, () => {
        const delivered = truck.cargoTons;
        truck.cargoLoaded = false;
        truck.cargoTons = 0;
        this.economy.recordDelivery(delivered);
        if (truck.deliveryFuelStart !== null) {
          this.economy.recordTripFuel(Math.max(0, truck.deliveryFuelStart - truck.fuel));
        }
        truck.deliveryFuelStart = null;
        if (truck.wear >= CONFIG.wear.urgentThreshold || truck.maintenancePlanned) {
          truck.state = "TO_MAINTENANCE";
          truck.maintenancePlanned = false;
        } else if (truck.fuel <= CONFIG.fuel.max * CONFIG.fsm.fuelCritical) {
          truck.state = "TO_FUEL";
        } else {
          truck.state = "TO_LOAD";
        }
        truck.aiActive = false;
        truck.route = [];
      });
    } else if (map.isInZone(tile, map.zones.fuel)) {
      truck.state = "FUELING";
      truck.beginOperation("Заправка (ручн.)", CONFIG.operations.fuelSec, () => {
        const liters = CONFIG.fuel.max - truck.fuel;
        this.economy.recordFuelLiters(liters);
        truck.fuel = CONFIG.fuel.max;
        truck.state = "TO_LOAD";
        truck.aiActive = false;
        truck.route = [];
      });
    } else if (map.isInZone(tile, map.zones.maintenance)) {
      truck.state = "MAINTENANCE";
      const dur = randRange(CONFIG.operations.maintenanceSecMin, CONFIG.operations.maintenanceSecMax);
      truck.beginOperation("ТО (ручн.)", dur, () => {
        this.economy.recordMaintenance();
        truck.wear = 0;
        truck.maintenancePlanned = false;
        truck.state = "TO_LOAD";
        truck.aiActive = false;
        truck.route = [];
      });
    }
  }

  render() {
    this.renderer.render(this.map, this.fleet, this.camera, this.weather, this.timeOfDay);
    this.renderer.drawCharts(this.economy, this.fleet);
    this.ui.update(this.fleet, this.economy, this.camera, this.timeScale, this.paused);
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.prevTime) / 1000);
    this.prevTime = now;
    if (!this.paused && this.timeScale > 0) {
      this.update(dt * this.timeScale);
    }
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  _bindInputs() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "e" || e.key.toLowerCase() === "у") {
        this.tryManualZoneAction();
      }
    });
    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    this.renderer.simCanvas.addEventListener("click", (ev) => {
      const rect = this.renderer.simCanvas.getBoundingClientRect();
      const canvasW = this.renderer.simCanvas.width;
      const canvasH = this.renderer.simCanvas.height;
      const scaleX = canvasW / rect.width;
      const scaleY = canvasH / rect.height;
      const sx = (ev.clientX - rect.left) * scaleX;
      const sy = (ev.clientY - rect.top) * scaleY;
      const wx = (sx - canvasW / 2) / this.camera.zoom + this.camera.x;
      const wy = (sy - canvasH / 2) / this.camera.zoom + this.camera.y;
      const clicked = this.fleet.getTruckAt(wx, wy, 30);
      if (clicked) {
        this.manualTruckIndex = clicked.id;
        this.camera.followIndex = clicked.id;
        this.ui.cameraSelect.value = clicked.id;
      }
    });

    this.ui.timeSelect.addEventListener("change", () => {
      this.timeOfDay = this.ui.timeSelect.value;
    });
    this.ui.weatherSelect.addEventListener("change", () => {
      this.weather = this.ui.weatherSelect.value;
    });

    window.addEventListener("resize", () => {
      // Canvas size is handled by Renderer each frame
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new Simulation();
});
