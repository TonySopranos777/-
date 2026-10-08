class UI {
  constructor(onReset, onPauseToggle, onTimeScale, onZoom, onCameraSelect, onMapChange, onModeChange) {
    this.fleetCardsEl = document.getElementById("fleetCards");
    this.shiftStatsEl = document.getElementById("shiftStats");
    this.statusText = document.getElementById("statusText");
    this.mapSelect = document.getElementById("mapSelect");
    this.resetBtn = document.getElementById("resetBtn");
    this.pauseBtn = document.getElementById("pauseBtn");
    this.manualBtn = document.getElementById("manualBtn");
    this.aiBtn = document.getElementById("aiBtn");
    this.timeScaleBtns = document.querySelectorAll(".timeScaleBtn");
    this.zoomSlider = document.getElementById("zoomSlider");
    this.cameraSelect = document.getElementById("cameraSelect");
    this.timeSelect = document.getElementById("timeSelect");
    this.weatherSelect = document.getElementById("weatherSelect");
    this.exportCsvBtn = document.getElementById("exportCsvBtn");

    this.onReset = onReset;
    this.onPauseToggle = onPauseToggle;
    this.onTimeScale = onTimeScale;
    this.onZoom = onZoom;
    this.onCameraSelect = onCameraSelect;
    this.onMapChange = onMapChange;
    this.onModeChange = onModeChange;

    this._bindEvents();
    this._fleetCardEls = [];
  }

  _bindEvents() {
    this.resetBtn.addEventListener("click", () => this.onReset && this.onReset());
    this.pauseBtn.addEventListener("click", () => this.onPauseToggle && this.onPauseToggle());
    this.manualBtn.addEventListener("click", () => {
      this.manualBtn.classList.add("active");
      this.aiBtn.classList.remove("active");
      this.onModeChange && this.onModeChange("manual");
    });
    this.aiBtn.addEventListener("click", () => {
      this.aiBtn.classList.add("active");
      this.manualBtn.classList.remove("active");
      this.onModeChange && this.onModeChange("ai");
    });
    this.timeScaleBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = Number(btn.dataset.value);
        this.onTimeScale && this.onTimeScale(v);
        this._updateTimeScaleButtons(v);
      });
    });
    this.zoomSlider.addEventListener("input", () => {
      const v = Number(this.zoomSlider.value);
      this.onZoom && this.onZoom(v);
    });
    this.cameraSelect.addEventListener("change", () => {
      const v = Number(this.cameraSelect.value);
      this.onCameraSelect && this.onCameraSelect(v);
    });
    this.mapSelect.addEventListener("change", () => {
      this.onMapChange && this.onMapChange(this.mapSelect.value);
    });
    this.exportCsvBtn.addEventListener("click", () => this._exportCsv());
  }

  _updateTimeScaleButtons(activeValue) {
    this.timeScaleBtns.forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.value) === activeValue);
    });
  }

  initFleetCards(count) {
    this.fleetCardsEl.innerHTML = "";
    this._fleetCardEls = [];
    for (let i = 0; i < count; i++) {
      const card = document.createElement("div");
      card.className = "card truck-card";
      card.innerHTML = `
        <div class="row" style="justify-content:space-between;">
          <span class="label" id="t${i}-name">Самосвал ${i + 1}</span>
          <span class="small" id="t${i}-state">IDLE</span>
        </div>
        <div class="small" id="t${i}-task">Задача: ожидание</div>
        <div class="small" id="t${i}-capacity">Грузоподъемность: -- т</div>
        <div class="label" style="margin-top:6px;">Топливо: <span id="t${i}-fuelText">100%</span></div>
        <div class="meter"><div id="t${i}-fuelBar" style="width:100%;background:var(--good);"></div></div>
        <div class="label" style="margin-top:6px;">Износ: <span id="t${i}-wearText">0%</span></div>
        <div class="meter"><div id="t${i}-wearBar" style="width:0%;background:#ab47bc;"></div></div>
        <div class="small" id="t${i}-cargo" style="margin-top:4px;">Груз: пусто</div>
      `;
      this.fleetCardsEl.appendChild(card);
      this._fleetCardEls.push({
        name: document.getElementById(`t${i}-name`),
        state: document.getElementById(`t${i}-state`),
        task: document.getElementById(`t${i}-task`),
        capacity: document.getElementById(`t${i}-capacity`),
        fuelText: document.getElementById(`t${i}-fuelText`),
        fuelBar: document.getElementById(`t${i}-fuelBar`),
        wearText: document.getElementById(`t${i}-wearText`),
        wearBar: document.getElementById(`t${i}-wearBar`),
        cargo: document.getElementById(`t${i}-cargo`)
      });
    }
  }

  initCameraOptions(names) {
    this.cameraSelect.innerHTML = "";
    for (let i = 0; i < names.length; i++) {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = names[i];
      this.cameraSelect.appendChild(o);
    }
  }

  initMapOptions(maps) {
    this.mapSelect.innerHTML = "";
    for (const m of maps) {
      const o = document.createElement("option");
      o.value = m.id;
      o.textContent = m.name;
      this.mapSelect.appendChild(o);
    }
  }

  update(fleet, economy, camera, timeScale, paused) {
    for (let i = 0; i < fleet.trucks.length; i++) {
      const t = fleet.trucks[i];
      const el = this._fleetCardEls[i];
      if (!el) continue;
      el.name.textContent = t.name;
      el.name.style.color = t.color;
      el.state.textContent = t.state;
      el.task.textContent = `Задача: ${this._stateTask(t.state)}`;
      el.capacity.textContent = `Грузоподъемность: ${t.maxCapacity} т`;
      const fp = (t.fuel / CONFIG.fuel.max) * 100;
      el.fuelText.textContent = `${t.fuel.toFixed(1)} / ${CONFIG.fuel.max.toFixed(1)} л (${fp.toFixed(1)}%)`;
      el.fuelBar.style.width = `${Math.max(0, Math.min(100, fp))}%`;
      el.fuelBar.style.background = fp > 60 ? "var(--good)" : fp > 25 ? "#ffb74d" : "var(--warn)";
      const wp = t.wear * 100;
      el.wearText.textContent = `${wp.toFixed(1)}%`;
      el.wearBar.style.width = `${Math.max(0, Math.min(100, wp))}%`;
      el.wearBar.style.background = wp > 70 ? "var(--warn)" : "#ab47bc";
      el.cargo.textContent = `Груз: ${t.cargoLoaded ? t.cargoTons.toFixed(1) + " т" : "пусто"}`;
    }

    const stats = economy.getShiftStats();
    this.shiftStatsEl.innerHTML = `
      <div class="small">Время смены: ${formatShiftDuration(stats.shiftTimeSec)}</div>
      <div class="small">Рейсы: ${stats.trips}</div>
      <div class="small">Тоннаж: ${stats.tons.toFixed(1)} т</div>
      <div class="small">Средний расход/рейс: ${stats.avgFuelPerTrip.toFixed(2)} л</div>
      <div class="small">Средний тоннаж/рейс: ${stats.avgTonsPerTrip.toFixed(1)} т</div>
      <div class="small">Производительность: ${stats.tonsPerHour.toFixed(1)} т/ч</div>
      <div class="small">Расход топлива: ${stats.totalFuelLiters.toFixed(1)} л</div>
      <div class="small">Стоимость ТО: ${stats.totalMaintenanceCost.toFixed(0)} ₽</div>
      <div class="small">Прибыль: ${stats.profit.toFixed(0)} ₽</div>
      <div class="small">Эффективность: ${(stats.efficiency * 100).toFixed(1)}%</div>
    `;

    this.pauseBtn.textContent = paused ? "▶ Продолжить" : "⏸ Пауза";
    this._updateTimeScaleButtons(timeScale);
  }

  _stateTask(state) {
    const map = {
      IDLE: "ожидание",
      TO_LOAD: "ехать на погрузку",
      LOADING: "погрузка",
      TO_UNLOAD: "ехать на разгрузку",
      UNLOADING: "разгрузка",
      TO_FUEL: "ехать на АЗС",
      FUELING: "заправка",
      TO_MAINTENANCE: "ехать на ТО",
      MAINTENANCE: "техобслуживание"
    };
    return map[state] || state;
  }

  _exportCsv() {
    if (!window.simEconomy) return;
    const stats = window.simEconomy.getShiftStats();
    const lines = [
      "metric,value",
      `shift_time_seconds,${stats.shiftTimeSec.toFixed(1)}`,
      `trips,${stats.trips}`,
      `tons,${stats.tons.toFixed(2)}`,
      `avg_fuel_per_trip,${stats.avgFuelPerTrip.toFixed(3)}`,
      `total_fuel_liters,${stats.totalFuelLiters.toFixed(2)}`,
      `maintenance_cost,${stats.totalMaintenanceCost.toFixed(0)}`,
      `profit,${stats.profit.toFixed(0)}`,
      `efficiency_percent,${(stats.efficiency * 100).toFixed(2)}`
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `shift-report-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    if (this.statusText) this.statusText.textContent = "Статус: CSV отчет сохранен";
  }
}
