# Control Panel

<cite>
**Referenced Files in This Document**
- [index.html](file://index.html)
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [config.js](file://config.js)
- [renderer.js](file://renderer.js)
- [truck.js](file://truck.js)
- [map.js](file://map.js)
- [economy.js](file://economy.js)
- [utils.js](file://utils.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document describes the control panel system that manages all primary user interactions in the autonomous dump truck simulator. It focuses on:
- Mode switching between AI and manual operation modes, including button activation states and visual feedback
- Simulation control buttons for reset, pause/resume, and their state management
- Time scale controls with different speed multipliers and visual indicators
- Zoom slider for adjusting the viewport scale
- Camera selection dropdown for choosing which truck to follow
- Map selection interface for switching between different simulation environments
- Weather control system
- Event handling, state synchronization, and user feedback mechanisms

## Project Structure
The control panel is implemented primarily in HTML and JavaScript. The UI is defined declaratively in the HTML and driven by a dedicated UI controller class. The simulation lifecycle and state are managed by the main simulation class, which coordinates with the UI, rendering, and game logic.

```mermaid
graph TB
subgraph "UI Layer"
HTML["index.html<br/>Defines control panel elements"]
UI["ui.js<br/>UI controller"]
end
subgraph "Simulation Core"
MAIN["main.js<br/>Simulation orchestrator"]
CONFIG["config.js<br/>Global constants"]
end
subgraph "Rendering & Graphics"
RENDERER["renderer.js<br/>Camera, rendering, overlays"]
end
subgraph "Game Logic"
MAP["map.js<br/>Map generation & zones"]
TRUCK["truck.js<br/>Truck state & movement"]
ECONOMY["economy.js<br/>Shift statistics"]
end
HTML --> UI
UI --> MAIN
MAIN --> RENDERER
MAIN --> MAP
MAIN --> TRUCK
MAIN --> ECONOMY
MAIN --> CONFIG
```

**Diagram sources**
- [index.html](file://index.html)
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [config.js](file://config.js)
- [renderer.js](file://renderer.js)
- [map.js](file://map.js)
- [truck.js](file://truck.js)
- [economy.js](file://economy.js)

**Section sources**
- [index.html](file://index.html)
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [config.js](file://config.js)

## Core Components
- Control panel layout and elements are defined in the HTML page.
- The UI controller binds events to user actions and updates the simulation state accordingly.
- The simulation orchestrator manages mode, time scale, pause, camera selection, map selection, and weather/time-of-day.
- Rendering integrates camera zoom and overlays for weather/time effects.
- Truck logic toggles manual mode per vehicle and applies physics and sensor feedback.
- Economy tracks production metrics and provides statistics for the UI.

**Section sources**
- [index.html](file://index.html)
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [renderer.js](file://renderer.js)
- [truck.js](file://truck.js)
- [economy.js](file://economy.js)

## Architecture Overview
The control panel is a thin UI layer that delegates to the simulation core. Events from the UI trigger callbacks that update internal state and synchronize the UI display.

```mermaid
sequenceDiagram
participant U as "User"
participant UI as "UI Controller (ui.js)"
participant S as "Simulation (main.js)"
participant R as "Renderer (renderer.js)"
U->>UI : Click "AI Mode" button
UI->>S : onModeChange("ai")
S->>S : setMode("ai")
S->>S : _syncManualTruck()
S->>UI : ui.statusText.textContent = "AI mode"
S->>R : render()
U->>UI : Change "Map" select
UI->>S : onMapChange(mapId)
S->>S : setMap(mapId)
S->>S : reset fleet & camera
S->>UI : ui.cameraSelect.value = 0
S->>UI : ui.manualBtn.classList.remove("active")
S->>UI : ui.aiBtn.classList.add("active")
S->>R : render()
```

**Diagram sources**
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [renderer.js](file://renderer.js)

## Detailed Component Analysis

### Mode Switching: AI vs Manual
- Two mutually exclusive buttons control the global mode:
  - Manual mode activates only the currently selected truck for keyboard input.
  - AI mode lets all trucks operate autonomously.
- Button activation state:
  - Active button receives the "active" class; the other loses it.
- State synchronization:
  - The simulation sets a flag and toggles per-truck manual mode for the selected index.
  - UI updates status text and button classes.

```mermaid
flowchart TD
Start(["User clicks a mode button"]) --> Check{"Which button?"}
Check --> |Manual| SetManual["Set mode='manual'<br/>Sync selected truck to manual mode"]
Check --> |AI| SetAI["Set mode='ai'<br/>Disable manual mode for all trucks"]
SetManual --> UpdateUI["Update status text<br/>Remove 'active' from AI button<br/>Add 'active' to Manual button"]
SetAI --> UpdateUI
UpdateUI --> Render["Render frame with new mode"]
```

**Diagram sources**
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [truck.js](file://truck.js)

**Section sources**
- [index.html](file://index.html)
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [truck.js](file://truck.js)

### Simulation Controls: Reset and Pause/Resume
- Reset:
  - Reinitializes the current map, resets fleet positions at base, clears economy counters, resets camera focus, and switches to AI mode.
  - UI status text indicates reset completion.
- Pause/Resume:
  - Toggles a paused flag that affects the simulation loop.
  - UI updates the button label to reflect current state.

```mermaid
sequenceDiagram
participant U as "User"
participant UI as "UI Controller"
participant S as "Simulation"
U->>UI : Click "Reset"
UI->>S : onReset()
S->>S : reset()
S->>S : setMap(map.mapType)
S->>S : fleet.resetAtBase(map)
S->>S : economy.reset()
S->>S : camera.followIndex = 0
S->>S : mode = "ai"
S->>UI : ui.statusText.textContent = "Reset message"
S->>S : render()
U->>UI : Click "Pause"
UI->>S : onPauseToggle()
S->>S : paused = !paused
S->>UI : ui.pauseBtn.textContent = "Resume/Pause"
S->>S : render()
```

**Diagram sources**
- [ui.js](file://ui.js)
- [main.js](file://main.js)

**Section sources**
- [index.html](file://index.html)
- [ui.js](file://ui.js)
- [main.js](file://main.js)

### Time Scale Controls
- Buttons represent multipliers: 0, 1, 2, 4.
- Active multiplier is highlighted via the "active" class.
- The simulation loop scales delta time by the selected multiplier when not paused.
- UI reflects the current time scale and updates active button visuals.

```mermaid
flowchart TD
TSStart(["User selects time scale"]) --> GetVal["Read data-value from button"]
GetVal --> Apply["onTimeScale(value) -> setTimeScale(value)"]
Apply --> Loop["Loop multiplies dt by timeScale"]
Loop --> UIUpdate["UI updates active button class"]
```

**Diagram sources**
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [config.js](file://config.js)

**Section sources**
- [index.html](file://index.html)
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [config.js](file://config.js)

### Zoom Slider
- A range input adjusts the camera zoom level.
- Value changes are sent to the simulation, which updates the camera zoom.
- The renderer applies zoom during world-to-screen transformations.

```mermaid
sequenceDiagram
participant U as "User"
participant UI as "UI Controller"
participant S as "Simulation"
participant R as "Renderer"
U->>UI : Move zoom slider
UI->>S : onZoom(value)
S->>S : camera.zoom = value
S->>R : render()
R->>R : Apply zoom in worldToScreen()
```

**Diagram sources**
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [renderer.js](file://renderer.js)

**Section sources**
- [index.html](file://index.html)
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [renderer.js](file://renderer.js)

### Camera Selection Dropdown
- Dropdown lists trucks by index.
- Selecting an option updates the camera’s follow index and syncs the manual truck index.
- Clicking on a truck in the simulation canvas also sets the camera and manual selection.

```mermaid
sequenceDiagram
participant U as "User"
participant UI as "UI Controller"
participant S as "Simulation"
participant R as "Renderer"
U->>UI : Change camera select
UI->>S : onCameraSelect(index)
S->>S : camera.followIndex = index
S->>S : manualTruckIndex = index
S->>S : _syncManualTruck()
S->>R : render()
U->>R : Click on truck in canvas
R->>S : getTruckAt(x,y)
S->>S : manualTruckIndex = clicked.id
S->>S : camera.followIndex = clicked.id
S->>UI : ui.cameraSelect.value = clicked.id
```

**Diagram sources**
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [renderer.js](file://renderer.js)

**Section sources**
- [index.html](file://index.html)
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [renderer.js](file://renderer.js)

### Map Selection Interface
- Dropdown populated with predefined maps.
- Changing the map regenerates terrain, resets fleet positions, clears economy, resets camera, and switches to AI mode.
- UI ensures the camera and mode buttons reflect the new state.

```mermaid
sequenceDiagram
participant U as "User"
participant UI as "UI Controller"
participant S as "Simulation"
participant MAP as "Map Manager"
U->>UI : Change map select
UI->>S : onMapChange(mapId)
S->>MAP : generate(mapId)
S->>S : fleet.resetAtBase(map)
S->>S : economy.reset()
S->>S : camera.followIndex = 0
S->>S : mode = "ai"
S->>UI : ui.cameraSelect.value = 0
S->>UI : Remove "active" from manualBtn, add to aiBtn
```

**Diagram sources**
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [map.js](file://map.js)

**Section sources**
- [index.html](file://index.html)
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [map.js](file://map.js)

### Weather and Time-of-Day Controls
- Environment controls include time-of-day (day/dusk/night) and weather (clear/fog/rain/dust).
- These affect rendering overlays and truck behavior (e.g., traction and sensor range).
- UI change events propagate to the simulation, which updates the current weather/time.

```mermaid
sequenceDiagram
participant U as "User"
participant UI as "UI Controller"
participant S as "Simulation"
participant R as "Renderer"
U->>UI : Change time select
UI->>S : timeOfDay = value
U->>UI : Change weather select
UI->>S : weather = value
S->>R : render()
R->>R : drawWeatherOverlay(weather)
R->>R : drawTimeOverlay(timeOfDay)
```

**Diagram sources**
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [renderer.js](file://renderer.js)

**Section sources**
- [index.html](file://index.html)
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [renderer.js](file://renderer.js)

### Event Handling, State Synchronization, and User Feedback
- Event binding:
  - UI registers click handlers for mode buttons, reset/pause, time scale buttons, zoom slider, camera select, and map select.
  - Keyboard input toggles manual mode and triggers operations when near zones.
- State synchronization:
  - Simulation updates internal state and informs UI to refresh displays.
  - UI maintains active button states and status messages.
- User feedback:
  - Status text communicates reset, mode changes, and export completion.
  - Visual feedback includes active button highlighting, pause button label, and chart updates.

```mermaid
flowchart TD
EHStart["Bind events in UI"] --> ModeClick["Mode button click"]
EHStart --> ResetClick["Reset button click"]
EHStart --> PauseClick["Pause button click"]
EHStart --> TimeScaleClick["Time scale button click"]
EHStart --> ZoomInput["Zoom slider input"]
EHStart --> CameraChange["Camera select change"]
EHStart --> MapChange["Map select change"]
ModeClick --> SyncMode["Call onModeChange -> setMode -> _syncManualTruck"]
ResetClick --> ResetSim["Call onReset -> reset -> reinitialize"]
PauseClick --> TogglePaused["Call onPauseToggle -> toggle paused"]
TimeScaleClick --> SetTS["Call onTimeScale -> setTimeScale"]
ZoomInput --> SetZoom["Call onZoom -> camera.zoom"]
CameraChange --> SetCam["Call onCameraSelect -> camera.followIndex"]
MapChange --> SetMap["Call onMapChange -> setMap"]
SyncMode --> UIUpdate["UI updates status text and button classes"]
ResetSim --> UIUpdate
TogglePaused --> UIUpdate
SetTS --> UIUpdate
SetZoom --> Render["Render frame"]
SetCam --> Render
SetMap --> UIUpdate
UIUpdate --> Render
```

**Diagram sources**
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [renderer.js](file://renderer.js)

**Section sources**
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [index.html](file://index.html)

## Dependency Analysis
The control panel relies on a small set of core modules. The UI controller depends on the simulation orchestrator, which in turn depends on rendering, map generation, truck logic, and economy.

```mermaid
graph LR
UI["ui.js"] --> MAIN["main.js"]
MAIN --> RENDERER["renderer.js"]
MAIN --> MAP["map.js"]
MAIN --> TRUCK["truck.js"]
MAIN --> ECONOMY["economy.js"]
MAIN --> CONFIG["config.js"]
UI --> CONFIG
RENDERER --> CONFIG
TRUCK --> CONFIG
MAP --> CONFIG
```

**Diagram sources**
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [renderer.js](file://renderer.js)
- [map.js](file://map.js)
- [truck.js](file://truck.js)
- [economy.js](file://economy.js)
- [config.js](file://config.js)

**Section sources**
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [renderer.js](file://renderer.js)
- [map.js](file://map.js)
- [truck.js](file://truck.js)
- [economy.js](file://economy.js)
- [config.js](file://config.js)

## Performance Considerations
- Time scale 0 effectively pauses the simulation by multiplying delta time to zero.
- Camera zoom is applied in the renderer’s world-to-screen transform; keep zoom within configured bounds to avoid excessive scaling.
- Manual mode reduces AI-driven movement for the selected truck, simplifying physics calculations for that vehicle.
- Weather conditions alter sensor range and traction, indirectly affecting performance-sensitive computations like pathfinding replanning.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Mode buttons not updating:
  - Verify that the active class is toggled and the status text is updated after mode changes.
- Reset does not restore state:
  - Ensure map regeneration, fleet reset, economy reset, and camera reset occur in sequence.
- Pause button label incorrect:
  - Confirm the pause state toggle and button text update in the UI.
- Zoom slider not applying:
  - Check that the zoom value is propagated to the camera and that the renderer uses it in transforms.
- Camera selection mismatch:
  - Validate that selecting a truck updates both the follow index and manual selection, and that canvas clicks synchronize the selection.
- Map switch not reflected:
  - Confirm that the map generator runs, fleet resets at base, and UI reflects the new camera and mode.

**Section sources**
- [ui.js](file://ui.js)
- [main.js](file://main.js)
- [renderer.js](file://renderer.js)
- [map.js](file://map.js)

## Conclusion
The control panel provides a cohesive interface for operating the autonomous dump truck simulation. Its design cleanly separates concerns: the UI handles user interactions and visual feedback, while the simulation orchestrator manages state transitions and rendering. Mode switching, reset/pause, time scale, zoom, camera selection, map switching, and environment controls are all synchronized through well-defined event handlers and state updates.