class Economy {
  constructor() {
    this.reset();
  }

  reset() {
    this.startMs = performance.now();
    this.totalFuelLiters = 0;
    this.totalIncome = 0;
    this.totalMaintenanceCost = 0;
    this.trips = 0;
    this.tons = 0;
    this.fuelSpentInTrips = 0;
    this.history = [];
  }

  recordDelivery(tons) {
    const income = tons * CONFIG.economy.incomePerTon;
    this.totalIncome += income;
    this.trips += 1;
    this.tons += tons;
    this.history.push({ timeSec: (performance.now() - this.startMs) / 1000, type: "delivery", value: tons });
  }

  recordFuelLiters(liters) {
    this.totalFuelLiters += liters;
    const cost = liters * CONFIG.economy.fuelCostPerLiter;
    this.totalIncome -= cost;
  }

  recordTripFuel(spentLiters) {
    this.fuelSpentInTrips += spentLiters;
  }

  recordMaintenance() {
    this.totalMaintenanceCost += CONFIG.economy.maintenanceCost;
    this.totalIncome -= CONFIG.economy.maintenanceCost;
    this.history.push({ timeSec: (performance.now() - this.startMs) / 1000, type: "maintenance", value: CONFIG.economy.maintenanceCost });
  }

  getProfit() {
    return this.totalIncome - this.totalMaintenanceCost;
  }

  getShiftStats() {
    const seconds = Math.max(0, (performance.now() - this.startMs) / 1000);
    const hours = seconds / 3600;
    const avgFuel = this.trips > 0 ? this.fuelSpentInTrips / this.trips : 0;
    const avgTons = this.trips > 0 ? this.tons / this.trips : 0;
    const tonsPerHour = hours > 0 ? this.tons / hours : 0;
    const profit = this.getProfit();
    return {
      shiftTimeSec: seconds,
      trips: this.trips,
      tons: this.tons,
      avgFuelPerTrip: avgFuel,
      avgTonsPerTrip: avgTons,
      tonsPerHour,
      totalFuelLiters: this.totalFuelLiters,
      totalMaintenanceCost: this.totalMaintenanceCost,
      profit,
      efficiency: tonsPerHour > 0 ? profit / (tonsPerHour * hours + 1) : 0
    };
  }
}
