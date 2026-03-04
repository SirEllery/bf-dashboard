/**
 * interiors.js — Interior room geometry system for hero buildings
 * 
 * Creates 3 floor-specific interior rooms per hero building:
 * - Ground floor (20% height): Orange/red theme (urgent operations)
 * - Mid floor (50% height): Blue theme (workflow management)
 * - Roof floor (80% height): Green theme (analytics/overview)
 * 
 * Cyberpunk aesthetic matching Operations Hub exterior
 */
import * as THREE from 'three';

// Floor configuration
export const FLOOR_CONFIG = {
    ground: {
        heightPercent: 0.20,
        theme: 'urgent',
        primaryColor: 0xff4422,
        accentColor: 0xff8844,
        emissiveIntensity: 0.3,
    },
    mid: {
        heightPercent: 0.50,
        theme: 'workflow',
        primaryColor: 0x4488ff,
        accentColor: 0x88ccff,
        emissiveIntensity: 0.25,
    },
    roof: {
        heightPercent: 0.80,
        theme: 'analytics',
        primaryColor: 0x44ff88,
        accentColor: 0x88ffcc,
        emissiveIntensity: 0.2,
    },
};

// Interior room dimensions (relative to building size)
const INTERIOR_SCALE = 0.7; // Interior is 70% of building exterior
const FLOOR_HEIGHT = 3.5; // Height of each floor room
const WALL_THICKNESS = 0.3;

/**
 * Create interior room geometry for a specific building and floor
 * @param {string} buildingId - Building ID from BUILDINGS array
 * @param {'ground'|'mid'|'roof'} floor - Floor level
 * @param {THREE.Scene} scene - Scene to add interior to
 * @returns {THREE.Group|null} Interior group or null if invalid
 */
export function createInterior(buildingId, floor, scene) {
    const config = FLOOR_CONFIG[floor];
    if (!config) {
        console.warn(`Invalid floor: ${floor}. Use 'ground', 'mid', or 'roof'`);
        return null;
    }

    // Find building data
    const building = window.BUILDINGS?.find(b => b.id === buildingId);
    if (!building) {
        console.warn(`Building not found: ${buildingId}`);
        return null;
    }

    // Only create interiors for hero buildings
    if (!building.hero) {
        console.warn(`Building ${buildingId} is not a hero building`);
        return null;
    }

    const [bx, by, bz] = building.pos;
    const [bw, bh, bd] = building.size;
    const baseY = by + (bh * config.heightPercent);

    // Create interior room group
    const interiorGroup = new THREE.Group();
    interiorGroup.name = `interior-${buildingId}-${floor}`;
    interiorGroup.position.set(bx, baseY, bz);
    interiorGroup.userData = {
        buildingId,
        floor,
        theme: config.theme,
        clickable: true,
    };

    // Room dimensions
    const roomWidth = bw * INTERIOR_SCALE;
    const roomDepth = bd * INTERIOR_SCALE;
    const roomHeight = FLOOR_HEIGHT;

    // Build room components
    createFloor(interiorGroup, roomWidth, roomDepth, config);
    createCeiling(interiorGroup, roomWidth, roomDepth, config);
    createWalls(interiorGroup, roomWidth, roomDepth, roomHeight, config);
    createFurniture(interiorGroup, roomWidth, roomDepth, roomHeight, config, floor);
    createLighting(interiorGroup, roomWidth, roomDepth, roomHeight, config);
    createDataElements(interiorGroup, roomWidth, roomDepth, roomHeight, config, floor);

    scene.add(interiorGroup);
    return interiorGroup;
}

/**
 * Create all hero building interiors
 * @param {string} buildingId - Building ID
 * @param {THREE.Scene} scene - Scene to add to
 * @returns {Array<THREE.Group>} Array of interior groups
 */
export function createAllInteriors(buildingId, scene) {
    const interiors = [];
    for (const floor of ['ground', 'mid', 'roof']) {
        const interior = createInterior(buildingId, floor, scene);
        if (interior) interiors.push(interior);
    }
    return interiors;
}

// ── Room Components ──

function createFloor(group, width, depth, config) {
    const floorGeo = new THREE.BoxGeometry(width, 0.15, depth);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x0a0e18,
        emissive: config.primaryColor,
        emissiveIntensity: config.emissiveIntensity * 0.3,
        metalness: 0.8,
        roughness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = 0;
    group.add(floor);

    // Floor grid pattern
    const gridHelper = new THREE.GridHelper(width, 8, config.primaryColor, config.accentColor);
    gridHelper.position.y = 0.08;
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    group.add(gridHelper);
}

function createCeiling(group, width, depth, config) {
    const ceilingGeo = new THREE.BoxGeometry(width, 0.1, depth);
    const ceilingMat = new THREE.MeshStandardMaterial({
        color: 0x080c14,
        emissive: config.accentColor,
        emissiveIntensity: config.emissiveIntensity * 0.15,
        metalness: 0.6,
        roughness: 0.3,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.y = FLOOR_HEIGHT;
    group.add(ceiling);

    // Ceiling light strips
    const stripCount = 3;
    const stripWidth = width * 0.6;
    const stripDepth = 0.15;
    for (let i = 0; i < stripCount; i++) {
        const stripGeo = new THREE.BoxGeometry(stripWidth, 0.05, stripDepth);
        const stripMat = new THREE.MeshBasicMaterial({
            color: config.accentColor,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
        });
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.y = FLOOR_HEIGHT - 0.15;
        strip.position.z = (i - (stripCount - 1) / 2) * (depth * 0.35);
        group.add(strip);
    }
}

function createWalls(group, width, depth, height, config) {
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0x0c1020,
        emissive: config.primaryColor,
        emissiveIntensity: config.emissiveIntensity * 0.08,
        metalness: 0.7,
        roughness: 0.25,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
    });

    // Back wall (solid)
    const backWallGeo = new THREE.BoxGeometry(width, height, WALL_THICKNESS);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, height / 2, -depth / 2 + WALL_THICKNESS / 2);
    group.add(backWall);

    // Side walls (with openings)
    const sideWallHeight = height * 0.85;
    const sideWallGeo = new THREE.BoxGeometry(WALL_THICKNESS, sideWallHeight, depth * 0.7);
    
    // Left wall
    const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftWall.position.set(-width / 2 + WALL_THICKNESS / 2, sideWallHeight / 2 + height * 0.1, 0);
    group.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightWall.position.set(width / 2 - WALL_THICKNESS / 2, sideWallHeight / 2 + height * 0.1, 0);
    group.add(rightWall);

    // Front wall (low half-wall + open top)
    const frontWallGeo = new THREE.BoxGeometry(width, height * 0.3, WALL_THICKNESS);
    const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
    frontWall.position.set(0, height * 0.15, depth / 2 - WALL_THICKNESS / 2);
    group.add(frontWall);

    // Glowing edge strips on walls
    const edgeMat = new THREE.MeshBasicMaterial({
        color: config.accentColor,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
    });

    // Vertical corner strips
    const cornerPositions = [
        [-width / 2, depth / 2],
        [width / 2, depth / 2],
        [-width / 2, -depth / 2],
        [width / 2, -depth / 2],
    ];

    for (const [x, z] of cornerPositions) {
        const cornerGeo = new THREE.BoxGeometry(0.08, height, 0.08);
        const corner = new THREE.Mesh(cornerGeo, edgeMat);
        corner.position.set(x, height / 2, z);
        group.add(corner);
    }
}

function createFurniture(group, width, depth, height, config, floor) {
    const furnitureMat = new THREE.MeshStandardMaterial({
        color: 0x0a0e18,
        emissive: config.primaryColor,
        emissiveIntensity: config.emissiveIntensity * 0.15,
        metalness: 0.8,
        roughness: 0.2,
    });

    if (floor === 'ground') {
        // Ground floor: Command center consoles
        createConsole(group, width, depth, config, furnitureMat, 'command');
    } else if (floor === 'mid') {
        // Mid floor: Workflow stations
        createConsole(group, width, depth, config, furnitureMat, 'workflow');
    } else if (floor === 'roof') {
        // Roof floor: Analytics displays
        createConsole(group, width, depth, config, furnitureMat, 'analytics');
    }
}

function createConsole(group, width, depth, config, material, type) {
    // Central console table
    const tableWidth = width * 0.5;
    const tableDepth = depth * 0.35;
    const tableHeight = 0.8;

    const tableGeo = new THREE.BoxGeometry(tableWidth, tableHeight, tableDepth);
    const table = new THREE.Mesh(tableGeo, material);
    table.position.set(0, tableHeight / 2, 0);
    group.add(table);

    // Table legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, tableHeight, 6);
    const legPositions = [
        [-tableWidth / 2 + 0.3, -tableDepth / 2 + 0.3],
        [tableWidth / 2 - 0.3, -tableDepth / 2 + 0.3],
        [-tableWidth / 2 + 0.3, tableDepth / 2 - 0.3],
        [tableWidth / 2 - 0.3, tableDepth / 2 - 0.3],
    ];

    for (const [lx, lz] of legPositions) {
        const leg = new THREE.Mesh(legGeo, material);
        leg.position.set(lx, tableHeight / 2, lz);
        group.add(leg);
    }

    // Holographic displays above table
    const displayCount = type === 'analytics' ? 5 : type === 'workflow' ? 3 : 2;
    const displayWidth = tableWidth / (displayCount + 1);

    for (let i = 0; i < displayCount; i++) {
        const displayGeo = new THREE.PlaneGeometry(displayWidth * 0.7, 0.6);
        const displayMat = new THREE.MeshBasicMaterial({
            color: config.accentColor,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
        });
        const display = new THREE.Mesh(displayGeo, displayMat);
        const xOffset = (i - (displayCount - 1) / 2) * displayWidth;
        display.position.set(xOffset, tableHeight + 0.5, 0);
        display.rotation.x = -0.2;
        group.add(display);

        // Display stand
        const standGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4);
        const stand = new THREE.Mesh(standGeo, material);
        stand.position.set(xOffset, tableHeight + 0.25, 0);
        group.add(stand);
    }

    // Floor-mounted server racks (back of room)
    if (type === 'command' || type === 'workflow') {
        const rackCount = type === 'command' ? 4 : 3;
        const rackWidth = width * 0.12;
        const rackHeight = 1.8;
        const rackDepth = 0.4;

        for (let i = 0; i < rackCount; i++) {
            const rackGeo = new THREE.BoxGeometry(rackWidth, rackHeight, rackDepth);
            const rack = new THREE.Mesh(rackGeo, material);
            const xOffset = (i - (rackCount - 1) / 2) * (rackWidth * 1.3);
            rack.position.set(xOffset, rackHeight / 2, -depth / 2 + rackDepth);
            group.add(rack);

            // Rack lights (vertical strips)
            const lightStripGeo = new THREE.BoxGeometry(0.05, rackHeight * 0.8, 0.05);
            const lightStripMat = new THREE.MeshBasicMaterial({
                color: config.primaryColor,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
            });
            const lightStrip = new THREE.Mesh(lightStripGeo, lightStripMat);
            lightStrip.position.set(xOffset, rackHeight / 2, -depth / 2 + rackDepth + 0.2);
            group.add(lightStrip);
        }
    }
}

function createLighting(group, width, depth, height, config) {
    // Central pendant light
    const pendantGeo = new THREE.CylinderGeometry(0.3, 0.5, 0.8, 8);
    const pendantMat = new THREE.MeshBasicMaterial({
        color: config.accentColor,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
    });
    const pendant = new THREE.Mesh(pendantGeo, pendantMat);
    pendant.position.set(0, height - 0.6, 0);
    group.add(pendant);

    // Point light from pendant
    const pendantLight = new THREE.PointLight(config.accentColor, 2, 8);
    pendantLight.position.set(0, height - 0.8, 0);
    group.add(pendantLight);

    // Corner uplights
    const cornerPositions = [
        [-width / 2 + 0.5, -depth / 2 + 0.5],
        [width / 2 - 0.5, -depth / 2 + 0.5],
    ];

    for (const [x, z] of cornerPositions) {
        const uplight = new THREE.PointLight(config.primaryColor, 1.5, 6);
        uplight.position.set(x, 0.3, z);
        group.add(uplight);

        // Uplight housing
        const housingGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 8);
        const housingMat = new THREE.MeshStandardMaterial({
            color: 0x080a10,
            metalness: 0.9,
            roughness: 0.1,
        });
        const housing = new THREE.Mesh(housingGeo, housingMat);
        housing.position.set(x, 0.15, z);
        group.add(housing);
    }
}

function createDataElements(group, width, depth, height, config, floor) {
    // Floating data particles / holographic elements
    const particleCount = floor === 'roof' ? 30 : floor === 'mid' ? 20 : 15;
    const particleGeo = new THREE.SphereGeometry(0.04, 4, 4);
    const particleMat = new THREE.MeshBasicMaterial({
        color: config.accentColor,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(particleGeo, particleMat);
        particle.position.set(
            (Math.random() - 0.5) * width * 0.8,
            Math.random() * height * 0.7 + height * 0.15,
            (Math.random() - 0.5) * depth * 0.8
        );
        particle.userData = {
            floatSpeed: 0.5 + Math.random() * 0.5,
            floatOffset: Math.random() * Math.PI * 2,
        };
        group.add(particle);
    }

    // Data stream lines (vertical)
    const streamCount = floor === 'analytics' ? 8 : 5;
    const streamMat = new THREE.LineBasicMaterial({
        color: config.primaryColor,
        transparent: true,
        opacity: 0.15,
    });

    for (let i = 0; i < streamCount; i++) {
        const points = [];
        const x = (Math.random() - 0.5) * width * 0.6;
        const z = (Math.random() - 0.5) * depth * 0.6;
        points.push(new THREE.Vector3(x, 0.5, z));
        points.push(new THREE.Vector3(x, height - 0.5, z));

        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeo, streamMat);
        group.add(line);
    }

    // Floor-specific data elements
    if (floor === 'ground') {
        // Alert indicators (pulsing spheres)
        const alertGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const alertMat = new THREE.MeshBasicMaterial({
            color: 0xff2222,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
        });
        const alertPositions = [
            [-width / 3, -depth / 3],
            [width / 3, -depth / 3],
        ];
        for (const [x, z] of alertPositions) {
            const alert = new THREE.Mesh(alertGeo, alertMat);
            alert.position.set(x, 1.2, z);
            alert.userData = { pulse: true, pulseSpeed: 2 };
            group.add(alert);
        }
    } else if (floor === 'mid') {
        // Workflow flow lines (horizontal)
        const flowMat = new THREE.MeshBasicMaterial({
            color: config.accentColor,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
        });
        for (let i = 0; i < 3; i++) {
            const flowGeo = new THREE.PlaneGeometry(width * 0.6, 0.05);
            const flow = new THREE.Mesh(flowGeo, flowMat);
            flow.position.set(0, 1.0 + i * 0.4, 0);
            flow.rotation.x = Math.PI / 2;
            group.add(flow);
        }
    } else if (floor === 'roof') {
        // Analytics charts (floating rings)
        const ringMat = new THREE.MeshBasicMaterial({
            color: config.accentColor,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
        });
        for (let i = 0; i < 3; i++) {
            const ringGeo = new THREE.TorusGeometry(0.4 + i * 0.15, 0.03, 8, 24);
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(
                (i - 1) * 0.8,
                1.5,
                0
            );
            ring.rotation.x = Math.PI / 2;
            group.add(ring);
        }
    }
}

/**
 * Animate interior elements (call each frame)
 * @param {THREE.Group} interiorGroup - Interior group to animate
 * @param {number} time - Current time in seconds
 */
export function animateInterior(interiorGroup, time) {
    if (!interiorGroup) return;

    interiorGroup.traverse(obj => {
        if (obj.userData?.pulse) {
            obj.material.opacity = 0.5 + 0.5 * Math.sin(time * obj.userData.pulseSpeed);
        }
        if (obj.userData?.floatSpeed) {
            obj.position.y += Math.sin(time * obj.userData.floatSpeed + obj.userData.floatOffset) * 0.002;
        }
    });
}

/**
 * Get interior spawn position for camera
 * @param {string} buildingId - Building ID
 * @param {'ground'|'mid'|'roof'} floor - Floor level
 * @returns {Object|null} Position and target for camera or null
 */
export function getInteriorCameraPosition(buildingId, floor) {
    const config = FLOOR_CONFIG[floor];
    if (!config) return null;

    const building = window.BUILDINGS?.find(b => b.id === buildingId);
    if (!building) return null;

    const [bx, by, bz] = building.pos;
    const [bw, bh, bd] = building.size;
    const baseY = by + (bh * config.heightPercent);

    return {
        position: new THREE.Vector3(
            bx + 8,
            baseY + FLOOR_HEIGHT / 2 + 2,
            bz + 10
        ),
        target: new THREE.Vector3(
            bx,
            baseY + FLOOR_HEIGHT / 2,
            bz
        ),
        floor,
        buildingId,
    };
}
