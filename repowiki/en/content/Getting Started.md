# Getting Started

<cite>
**Referenced Files in This Document**
- [index.html](file://index.html)
- [README.txt](file://README.txt)
- [config.js](file://config.js)
- [main.js](file://main.js)
- [ui.js](file://ui.js)
- [map.js](file://map.js)
- [truck.js](file://truck.js)
- [fleet.js](file://fleet.js)
- [sensors.js](file://sensors.js)
- [renderer.js](file://renderer.js)
- [economy.js](file://economy.js)
- [utils.js](file://utils.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Installation and Setup](#installation-and-setup)
4. [Basic Usage Workflow](#basic-usage-workflow)
5. [Control Modes](#control-modes)
6. [Initial Operation](#initial-operation)
7. [Troubleshooting](#troubleshooting)
8. [Performance Tips](#performance-tips)
9. [Safety Warnings](#safety-warnings)
10. [Conclusion](#conclusion)

## Introduction

The Autonomous Dump Truck Simulator is a standalone HTML5 simulation that runs directly in your browser without requiring any external dependencies or installations. It features realistic autonomous truck behavior, multiple operational modes, sensor visualization, and economic metrics tracking.

The simulator provides two distinct control modes:
- Manual Mode: Direct keyboard control of a selected truck
- AI Mode: Autonomous navigation with pathfinding and obstacle avoidance

Key features include:
- Realistic physics and collision detection
- LiDAR and radar sensor visualization
- Dynamic weather effects
- Economic simulation with fuel costs and maintenance
- Multiple quarry locations with realistic layouts

## System Requirements

### Hardware Requirements
- Modern computer with integrated graphics capable of 2D rendering
- Minimum screen resolution: 1024x768 pixels
- Sufficient RAM for smooth animation (typically 2GB+ recommended)

### Software Requirements
- Modern web browser (Chrome, Firefox, Edge, Safari)
- No additional software installation required
- JavaScript enabled in the browser

### Browser Compatibility
The simulator is designed to work with all major modern browsers. It uses standard HTML5 Canvas APIs and vanilla JavaScript without any external libraries.

## Installation and Setup

### Step-by-Step Installation

1. **Download the Simulator Files**
   - Download all files from the repository to a single folder on your computer
   - Ensure all 12 files are present in the same directory

2. **Locate the Main File**
   - The main entry point is `index.html`
   - This file contains the complete simulation interface

3. **Launch the Simulator**
   - Double-click `index.html` to open in your default browser
   - Alternatively, right-click and choose "Open with" your preferred browser

4. **Verify Installation**
   - The simulation should load automatically
   - You should see the main interface with the map and control panel
   - If prompted to allow scripts, click "Allow"

### File Organization
The simulator consists of 12 interconnected files:
- `index.html`: Main HTML interface and canvas elements
- `config.js`: Global configuration constants
- `main.js`: Simulation loop and game logic
- `ui.js`: User interface controls and displays
- `map.js`: Map generation and pathfinding
- `truck.js`: Individual truck behavior and AI
- `fleet.js`: Fleet management and coordination
- `sensors.js`: Sensor simulation (LiDAR/Radar)
- `renderer.js`: Rendering engine and visual effects
- `economy.js`: Economic calculations and metrics
- `utils.js`: Utility functions and helpers
- `README.txt`: Basic usage instructions

**Section sources**
- [README.txt:1-20](file://README.txt#L1-L20)
- [index.html:1-257](file://index.html#L1-L257)

## Basic Usage Workflow

### Initial Launch
1. **Double-click index.html** to start the simulation
2. **Wait for initialization** - the simulation loads map data and creates trucks
3. **Interface appears** - left panel shows controls, right panel shows the map

### Understanding the Interface
The interface is divided into two main areas:

**Left Panel (Controls and Information)**
- Control buttons (Manual/AI mode, Reset, Pause)
- Map selection dropdown
- Camera selection
- Time scale controls (1x/2x/4x)
- Environment controls (Day/Night, Weather)
- Fleet status cards
- Production statistics
- Sensor visualizations (LiDAR, Radar)
- Mini-map

**Right Panel (Main View)**
- Large simulation canvas displaying the quarry map
- Trucks moving autonomously
- Route visualization
- Zone indicators (loading, unloading, fuel, maintenance)

### First-Time Setup
1. **Select a map** from the dropdown (default is North Quarry)
2. **Choose camera** to follow a specific truck
3. **Set time scale** to adjust simulation speed
4. **Adjust zoom level** using the slider

**Section sources**
- [index.html:155-257](file://index.html#L155-L257)
- [main.js:16-45](file://main.js#L16-L45)

## Control Modes

The simulator offers two distinct control modes for operating the autonomous trucks.

### Manual Mode (Keyboard Controls)

**Activation**
- Click the "Manual Mode" button in the control panel
- The button will highlight to indicate active mode

**Keyboard Controls**
- **W or Arrow Up**: Accelerate forward
- **S or Arrow Down**: Reverse/Brake
- **A or Arrow Left**: Turn left
- **D or Arrow Right**: Turn right
- **E**: Perform action in current zone (load/unload/fuel/maintenance)

**Manual Mode Features**
- Direct physical control of the selected truck
- Real-time physics response with friction and momentum
- Immediate feedback on actions
- Automatic zone detection for operations

**Section sources**
- [main.js:67-146](file://main.js#L67-L146)
- [index.html:182-184](file://index.html#L182-L184)

### AI Mode (Autonomous Navigation)

**Activation**
- Click the "AI Mode" button in the control panel
- The button will highlight to indicate active mode

**AI Behavior**
- Trucks navigate autonomously using A* pathfinding
- Obstacle avoidance with collision detection
- Route optimization considering terrain difficulty
- Automatic zone detection and operations
- Fuel and maintenance management

**AI Path Setting**
- In AI mode, click on the map to set destinations
- First click sets the start position
- Second click sets the destination
- The truck will calculate and follow the optimal route

**Section sources**
- [main.js:100-106](file://main.js#L100-L106)
- [README.txt:7-10](file://README.txt#L7-L10)

## Initial Operation

### Starting Your First Simulation

1. **Launch the Simulator**
   - Open `index.html` in your browser
   - Wait for the interface to load completely

2. **Select Initial Settings**
   - Choose a map from the dropdown menu
   - Select a camera to follow a specific truck
   - Adjust time scale to your preference (1x recommended for beginners)

3. **Choose Control Mode**
   - **Beginners**: Start with AI mode for automatic operation
   - **Advanced users**: Try manual mode for hands-on control

4. **Monitor Fleet Status**
   - Check individual truck status in the left panel
   - Monitor fuel levels, wear, and cargo status
   - Track production statistics and economic metrics

### Understanding Truck Operations

**Automatic Operations**
- Trucks automatically navigate to loading zones when empty
- They return to unloading zones when loaded
- Fuel and maintenance operations occur automatically when needed
- Economic calculations track profitability and efficiency

**Manual Operations**
- Press E while in a zone to trigger immediate operations
- Loading: Load cargo at the loading zone
- Unloading: Deliver cargo at the unloading zone
- Fueling: Refuel at the fuel station
- Maintenance: Service at the maintenance facility

**Section sources**
- [main.js:148-207](file://main.js#L148-L207)
- [truck.js:159-222](file://truck.js#L159-L222)

## Troubleshooting

### Common Issues and Solutions

**Issue: Simulator doesn't start**
- **Solution**: Ensure all 12 files are in the same folder
- **Solution**: Try opening with a different browser
- **Solution**: Check that JavaScript is enabled in your browser

**Issue: Blank screen or partially loaded interface**
- **Solution**: Refresh the page (Ctrl+F5)
- **Solution**: Clear browser cache and reload
- **Solution**: Try a different browser

**Issue: Controls not responding**
- **Solution**: Ensure the correct truck is selected as camera
- **Solution**: Verify you're in the correct control mode
- **Solution**: Check that the simulation isn't paused

**Issue: Performance problems**
- **Solution**: Reduce the number of visible trucks (use fewer trucks)
- **Solution**: Lower the time scale (reduce from 1x)
- **Solution**: Close other browser tabs to free resources

**Issue: Sensor visualization not showing**
- **Solution**: Select a truck as camera to view its sensors
- **Solution**: Ensure the truck has completed sensor scans
- **Solution**: Check that the sensor panels are visible

**Browser-Specific Issues**

**Internet Explorer/Edge Legacy**
- These browsers lack modern JavaScript support
- **Solution**: Use Chrome, Firefox, or Microsoft Edge (Chromium)

**Mobile Devices**
- Touch controls are not supported for truck control
- **Solution**: Use desktop/laptop computers for full functionality

**Security Software Interference**
- Some antivirus programs block local HTML execution
- **Solution**: Add the simulator folder to antivirus exceptions
- **Solution**: Run as administrator if necessary

**Section sources**
- [README.txt:3-6](file://README.txt#L3-L6)
- [index.html:182-184](file://index.html#L182-L184)

## Performance Tips

### Optimizing Simulation Performance

**Canvas Resolution Management**
- The simulation uses a large canvas (2400x1680 pixels)
- High-resolution displays may impact performance
- Use the zoom slider to reduce effective resolution

**Time Scale Adjustment**
- Start with 1x time scale for smooth operation
- Increase to 2x or 4x for faster learning
- Use pause button during intensive operations

**Resource Management**
- Close unnecessary browser tabs
- Disable browser extensions that might interfere
- Ensure adequate RAM (2GB+ recommended)

**Visual Effects**
- Weather effects (rain, fog) can impact performance
- Reduce visual effects for better performance
- Keep the interface focused on essential information

**Hardware Considerations**
- Modern GPUs handle the Canvas rendering efficiently
- Integrated graphics work adequately for this simulation
- Avoid running multiple heavy applications simultaneously

### Performance Monitoring
- Use the built-in statistics to monitor simulation performance
- Watch for FPS drops or lag indicators
- Adjust settings based on observed performance

## Safety Warnings

### Operational Safety Guidelines

**Simulation Environment**
- This is a simulation environment for educational purposes
- Results are not representative of real-world conditions
- Always supervise children when using the simulator

**Equipment Safety**
- The simulator does not control real vehicles
- No physical equipment is affected by simulation activities
- Follow standard safety protocols for any real-world vehicle operations

**Data Privacy**
- All simulation data remains local to your device
- No personal data is transmitted over networks
- Results can be exported as CSV files for analysis

**System Integrity**
- Do not modify core simulation files
- Changes may cause unexpected behavior
- Use original files for reliable operation

**Section sources**
- [README.txt:12-20](file://README.txt#L12-L20)

## Conclusion

The Autonomous Dump Truck Simulator provides an engaging way to learn about autonomous vehicle technology, pathfinding algorithms, and industrial operations. Its standalone design makes it easy to deploy and use without complex setup procedures.

Key benefits of the simulator include:
- Complete offline operation with no external dependencies
- Realistic physics and sensor simulation
- Educational value in autonomous systems
- Flexible control modes for different learning objectives
- Comprehensive economic modeling

For continued learning, consider exploring:
- Experimenting with different map configurations
- Comparing manual vs AI performance metrics
- Analyzing sensor data and decision-making processes
- Understanding economic factors affecting fleet operations

The simulator serves as an excellent foundation for understanding autonomous vehicle systems and can be adapted for educational or demonstration purposes.