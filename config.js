const CONFIG = {
  TILE: 20,
  GRID_W: 120,
  GRID_H: 84,

  TRUCK_COUNT: 5,

  physics: {
    maxSpeed: 4.2,
    accel: 5.2,
    friction: 0.985,
    reverseMax: 2.0,
    steerBase: 0.9,
    steerSpeedFactor: 0.08,
    rainTraction: 0.72,
    dustTraction: 0.88,
    moveScale: 35
  },

  fuel: {
    max: 180,
    baseUsage: 0.0004,
    speedCoeff: 0.002,
    terrainCoeff: 0.0006,
    cargoCoeff: 0.0002,
    weatherCoeff: 0.0002
  },

  wear: {
    baseRate: 0.00005,
    speedCoeff: 0.0003,
    terrainCoeff: 0.0008,
    cargoCoeff: 0.0001,
    planThreshold: 0.70,
    urgentThreshold: 0.80,
    max: 1.0
  },

  trucks: [
    { name: "БелАЗ-75131", maxCapacity: 170 },
    { name: "КАМАЗ-65225", maxCapacity: 140 },
    { name: "Terex MT6300", maxCapacity: 170 },
    { name: "Liebherr T284", maxCapacity: 140 },
    { name: "CAT 797F", maxCapacity: 140 }
  ],

  sensors: {
    lidarRays: 72,
    lidarMaxDist: 190,
    lidarStep: 4,
    radarMaxDist: 220,
    fogRangeFactor: 0.45,
    dustNoiseMax: 18,
    frontSector: Math.PI / 3,
    brakeDistFactor: 0.55,
    overtakeOffset: 24
  },

  operations: {
    loadSec: 3,
    unloadSec: 3,
    fuelSec: 4,
    maintenanceSecMin: 5,
    maintenanceSecMax: 10
  },

  economy: {
    fuelCostPerLiter: 52,
    incomePerTon: 180,
    maintenanceCost: 12000
  },

  fsm: {
    fuelCritical: 0.20,
    routeDeviationMax: 55,
    pathReplanCooldownSec: 1.5,
    arrivalDist: 10,
    waypointSnapDist: 10
  },

  fleet: {
    separationRadius: 28,
    queueDist: 40,
    safetyBubbleAhead: 50,
    safetyBubbleSide: 22,
    truckObstacleCost: 8
  },

  camera: {
    zoomMin: 0.4,
    zoomMax: 2.0,
    zoomDefault: 1.0,
    followLerp: 0.08
  },

  timeScale: {
    options: [0, 1, 2, 4],
    defaultIndex: 1
  }
};
