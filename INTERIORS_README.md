# Interior Room Geometry System

**Story 2** — 3D interior rooms for hero buildings (Scheduling + Project Management)

## Overview

This system creates explorable 3D interior spaces for hero buildings in the Operations Hub district. Each hero building has 3 floors with distinct themes and purposes.

## Architecture

### Files
- `js/interiors.js` — Core interior generation module
- `js/camera.js` — Updated with `goToFloor()` method
- `js/main.js` — Integration with building click handlers
- `css/style.css` — Floor selector UI styles
- `index.html` — Floor selector UI element

## Features

### Floor Configuration

Each hero building has 3 floors at specific height percentages:

| Floor   | Height | Theme      | Color         | Purpose          |
|---------|--------|------------|---------------|------------------|
| Ground  | 20%    | Urgent     | Orange/Red    | Command center, alerts |
| Mid     | 50%    | Workflow   | Blue          | Work stations, process flow |
| Roof    | 80%    | Analytics  | Green         | Data viz, overview displays |

### Room Elements

Each interior includes:
- **Floor** — Grid pattern with emissive theme color
- **Ceiling** — Light strips matching theme
- **Walls** — Semi-transparent with glowing edge strips
- **Furniture** — Floor-specific consoles and displays
- **Lighting** — Pendant lights + corner uplights
- **Data Elements** — Floating particles, data streams, floor-specific holographics

### Cyberpunk Aesthetic

All interiors match the Operations Hub exterior:
- Dark metallic surfaces (0x0a0e18 base)
- Glowing wireframe edges
- Holographic displays
- Floating data particles
- Neon accent lighting

## API

### `createInterior(buildingId, floor, scene)`

Creates a single interior room for a building.

**Parameters:**
- `buildingId` (string) — Building ID from BUILDINGS array
- `floor` ('ground'|'mid'|'roof') — Floor level
- `scene` (THREE.Scene) — Target scene

**Returns:** `THREE.Group` or `null` if invalid

**Example:**
```javascript
import { createInterior } from './interiors.js';

const groundFloor = createInterior('scheduling', 'ground', scene);
```

### `createAllInteriors(buildingId, scene)`

Creates all 3 floors for a building.

**Returns:** `Array<THREE.Group>`

### `animateInterior(interiorGroup, time)`

Animates interior elements (floating particles, pulsing lights).

**Parameters:**
- `interiorGroup` (THREE.Group) — Interior to animate
- `time` (number) — Current time in seconds

**Usage:** Call every frame in animation loop.

### `getInteriorCameraPosition(buildingId, floor)`

Gets optimal camera position for viewing an interior.

**Returns:** `{ position: Vector3, target: Vector3, floor: string, buildingId: string }`

## Camera Integration

The `CameraSystem` class now includes `goToFloor(buildingId, floor)`:

```javascript
import { CameraSystem } from './camera.js';

const cam = new CameraSystem(camera, renderer);

// Navigate to ground floor interior
cam.goToFloor('scheduling', 'ground');

// Current state available via:
cam.currentTier      // 'interior'
cam.currentBuilding  // 'scheduling'
cam.currentFloor     // 'ground'
```

## User Interaction

### Entering Interiors
1. Click a hero building once → Camera zooms to building exterior
2. Click the same building again → Enters interior (ground floor)

### Floor Navigation
- Floor selector UI appears at bottom center when in interior mode
- Click floor buttons to switch between ground/mid/roof
- Each floor has distinct color coding (orange/blue/green)

### Exiting Interiors
- Click anywhere in the interior → Returns to building exterior view

## Hero Buildings

Currently only Operations Hub buildings are hero buildings:
- `scheduling` — Scheduling
- `projects` — Project Management

These are the only buildings with explorable interiors.

## Performance

- Interiors are created on-demand (when first entered)
- Only visible floor is rendered (others hidden)
- Animated elements use simple sine waves (GPU-friendly)
- Interior meshes are reused per building (no recreation)

## Future Enhancements

Potential additions:
- Real-time data feeds on displays
- Interactive UI panels
- Sound effects (ambient hum, data streams)
- More furniture variations
- Elevator animation between floors
- Mini-map showing floor layout

## Testing

Manual test steps:
1. Open `index.html` in browser
2. Click "📅 Schedule" dock button (or search for Scheduling)
3. Click the Scheduling building again to enter
4. Use floor selector to switch between floors
5. Click to exit back to exterior view

## Known Limitations

- Base scene must be working (currently broken per Kyle)
- Interiors only for hero buildings in Operations Hub
- No collision detection (camera passes through walls)
- No loading states (interiors pop in on creation)
