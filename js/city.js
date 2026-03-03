/**
 * city.js — Procedural 3D city with 4 fully explorable districts
 * 
 * Every district is a real 3D environment with buildings, streets, lighting.
 * Operations Hub = most detailed (hero buildings with interiors)
 * Other 3 = simpler geometry but still full 3D cities
 */
import * as THREE from 'three';

// ── District Definitions ──
export const DISTRICTS = {
    operations: {
        name: 'Operations Hub',
        center: [40, 0, 40],
        color: 0x00e0ff,
        accent: 0xff00cc,
        style: 'cyberpunk',
        active: true,
        // Neon-soaked sci-fi — glowing edges, hex columns, data streams
    },
    customer: {
        name: 'Customer Journey',
        center: [-40, 0, 40],
        color: 0xff8844,
        accent: 0xffcc44,
        style: 'playful',
        active: true,
        // Warm, welcoming — rounded shapes, warm lighting, inviting
    },
    business: {
        name: 'Business Journey',
        center: [-40, 0, -40],
        color: 0x4488ff,
        accent: 0x88bbdd,
        style: 'corporate',
        active: true,
        // Clean corporate — rectangular towers, cool blues, structured grid
    },
    employee: {
        name: 'Employee Journey',
        center: [40, 0, -40],
        color: 0x44cc66,
        accent: 0x88ddaa,
        style: 'organic',
        active: true,
        // Nature-tech — organic shapes, greens, rounded organic forms
    },
};

// ── Building Registry ──
// All buildings are real 3D structures. Hero buildings get extra detail.
export const BUILDINGS = [
    // ═══ OPERATIONS HUB — Cyberpunk ═══
    { id: 'scheduling', name: 'Scheduling', district: 'operations', pos: [32, 0, 36], size: [6, 14, 6], hero: true, beacon: 'green', shape: 'hex' },
    { id: 'projects', name: 'Project Management', district: 'operations', pos: [48, 0, 36], size: [6, 12, 6], hero: true, beacon: 'green', shape: 'hex' },
    { id: 'ops-qc', name: 'Quality Control', district: 'operations', pos: [40, 0, 28], size: [5, 9, 5], shape: 'hex' },
    { id: 'ops-status', name: 'Live Status', district: 'operations', pos: [32, 0, 48], size: [5, 10, 5], shape: 'hex' },
    { id: 'ops-inventory', name: 'Inventory', district: 'operations', pos: [48, 0, 48], size: [4, 7, 4], shape: 'hex' },
    { id: 'ops-fleet', name: 'Fleet Mgmt', district: 'operations', pos: [40, 0, 54], size: [4, 6, 4], shape: 'hex' },
    { id: 'ops-safety', name: 'Safety', district: 'operations', pos: [52, 0, 42], size: [3, 5, 3], shape: 'hex' },
    { id: 'ops-comms', name: 'Comms Tower', district: 'operations', pos: [28, 0, 42], size: [3, 16, 3], shape: 'hex' },
    // Small accent structures
    { id: 'ops-s1', name: 'Relay A', district: 'operations', pos: [36, 0, 32], size: [2, 4, 2], shape: 'hex' },
    { id: 'ops-s2', name: 'Relay B', district: 'operations', pos: [44, 0, 32], size: [2, 3, 2], shape: 'hex' },
    { id: 'ops-s3', name: 'Node C', district: 'operations', pos: [54, 0, 34], size: [2, 5, 2], shape: 'hex' },

    // ═══ CUSTOMER JOURNEY — Playful / Warm ═══
    { id: 'cust-leads', name: 'Lead Generation', district: 'customer', pos: [-34, 0, 34], size: [6, 10, 6], shape: 'round' },
    { id: 'cust-sales', name: 'Sales Floor', district: 'customer', pos: [-46, 0, 34], size: [6, 9, 6], shape: 'round' },
    { id: 'cust-onboard', name: 'Onboarding', district: 'customer', pos: [-34, 0, 46], size: [5, 7, 5], shape: 'round' },
    { id: 'cust-support', name: 'Support Center', district: 'customer', pos: [-46, 0, 46], size: [5, 8, 5], shape: 'round' },
    { id: 'cust-feedback', name: 'Feedback Hub', district: 'customer', pos: [-40, 0, 54], size: [4, 6, 4], shape: 'round' },
    { id: 'cust-loyalty', name: 'Loyalty', district: 'customer', pos: [-52, 0, 40], size: [4, 5, 4], shape: 'round' },
    { id: 'cust-ads', name: 'Advertising', district: 'customer', pos: [-28, 0, 40], size: [4, 7, 4], shape: 'round' },
    { id: 'cust-reviews', name: 'Reviews', district: 'customer', pos: [-40, 0, 28], size: [3, 5, 3], shape: 'round' },
    { id: 'cust-s1', name: 'Kiosk A', district: 'customer', pos: [-38, 0, 38], size: [2, 3, 2], shape: 'round' },
    { id: 'cust-s2', name: 'Kiosk B', district: 'customer', pos: [-50, 0, 50], size: [2, 4, 2], shape: 'round' },

    // ═══ BUSINESS JOURNEY — Corporate / Clean ═══
    { id: 'biz-finance', name: 'Finance Tower', district: 'business', pos: [-34, 0, -34], size: [6, 14, 6], shape: 'box' },
    { id: 'biz-strategy', name: 'Strategy', district: 'business', pos: [-46, 0, -34], size: [6, 11, 6], shape: 'box' },
    { id: 'biz-vendors', name: 'Vendor Mgmt', district: 'business', pos: [-34, 0, -46], size: [5, 8, 5], shape: 'box' },
    { id: 'biz-legal', name: 'Legal & Compliance', district: 'business', pos: [-46, 0, -46], size: [5, 9, 5], shape: 'box' },
    { id: 'biz-growth', name: 'Growth Planning', district: 'business', pos: [-40, 0, -54], size: [4, 7, 4], shape: 'box' },
    { id: 'biz-data', name: 'Data Analytics', district: 'business', pos: [-52, 0, -40], size: [4, 10, 4], shape: 'box' },
    { id: 'biz-exec', name: 'Executive Suite', district: 'business', pos: [-28, 0, -40], size: [4, 12, 4], shape: 'box' },
    { id: 'biz-s1', name: 'Archive A', district: 'business', pos: [-38, 0, -28], size: [3, 5, 3], shape: 'box' },
    { id: 'biz-s2', name: 'Archive B', district: 'business', pos: [-50, 0, -50], size: [2, 4, 2], shape: 'box' },
    { id: 'biz-s3', name: 'Annex', district: 'business', pos: [-30, 0, -50], size: [2, 6, 2], shape: 'box' },

    // ═══ EMPLOYEE JOURNEY — Organic / Nature-Tech ═══
    { id: 'emp-hiring', name: 'Hiring Hall', district: 'employee', pos: [34, 0, -34], size: [6, 9, 6], shape: 'organic' },
    { id: 'emp-training', name: 'Training Center', district: 'employee', pos: [46, 0, -34], size: [6, 8, 6], shape: 'organic' },
    { id: 'emp-culture', name: 'Culture Lab', district: 'employee', pos: [34, 0, -46], size: [5, 7, 5], shape: 'organic' },
    { id: 'emp-perf', name: 'Performance', district: 'employee', pos: [46, 0, -46], size: [5, 8, 5], shape: 'organic' },
    { id: 'emp-wellness', name: 'Wellness', district: 'employee', pos: [40, 0, -54], size: [5, 6, 5], shape: 'organic' },
    { id: 'emp-dev', name: 'Development', district: 'employee', pos: [52, 0, -40], size: [4, 9, 4], shape: 'organic' },
    { id: 'emp-lounge', name: 'Lounge', district: 'employee', pos: [28, 0, -40], size: [4, 5, 4], shape: 'organic' },
    { id: 'emp-garden', name: 'Garden', district: 'employee', pos: [40, 0, -28], size: [6, 2, 6], shape: 'organic' },
    { id: 'emp-s1', name: 'Bench A', district: 'employee', pos: [38, 0, -38], size: [2, 3, 2], shape: 'organic' },
    { id: 'emp-s2', name: 'Bench B', district: 'employee', pos: [50, 0, -50], size: [2, 4, 2], shape: 'organic' },
];

// ── City Builder ──

export function createCity(scene) {
    const cityGroup = new THREE.Group();
    cityGroup.name = 'city';

    // Ground
    const groundGeo = new THREE.PlaneGeometry(250, 250);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x060810, roughness: 0.95, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    cityGroup.add(ground);

    // Subtle grid
    const grid = new THREE.GridHelper(250, 125, 0x0c0c20, 0x080814);
    cityGroup.add(grid);

    // Central hub
    createCentralHub(cityGroup);

    // District environments
    for (const [key, dist] of Object.entries(DISTRICTS)) {
        createDistrictEnvironment(cityGroup, key, dist);
    }

    // Connecting roads (glowing lanes between districts)
    createRoads(cityGroup);

    // Buildings
    const buildingMeshes = {};
    for (const bld of BUILDINGS) {
        const dist = DISTRICTS[bld.district];
        const mesh = createBuilding(bld, dist);
        cityGroup.add(mesh);
        buildingMeshes[bld.id] = { mesh, data: bld, district: dist };
    }

    scene.add(cityGroup);
    return { cityGroup, buildingMeshes };
}

// ── Central Hub ──
function createCentralHub(parent) {
    // Raised platform
    const platformGeo = new THREE.CylinderGeometry(12, 14, 1, 32);
    const platformMat = new THREE.MeshStandardMaterial({
        color: 0x0c1020, emissive: 0x112244, emissiveIntensity: 0.3,
        metalness: 0.7, roughness: 0.2,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = 0.5;
    parent.add(platform);

    // Hub beacon (central pillar of light)
    const beaconGeo = new THREE.CylinderGeometry(0.3, 1, 20, 8, 1, true);
    const beaconMat = new THREE.MeshBasicMaterial({
        color: 0x4488ff, transparent: true, opacity: 0.15,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 11;
    parent.add(beacon);

    // Hub light
    const hubLight = new THREE.PointLight(0x4488ff, 3, 30);
    hubLight.position.y = 5;
    parent.add(hubLight);

    // Ring markers pointing to each district
    for (const dist of Object.values(DISTRICTS)) {
        const angle = Math.atan2(dist.center[2], dist.center[0]);
        const arrowGeo = new THREE.ConeGeometry(0.5, 2, 4);
        const arrowMat = new THREE.MeshBasicMaterial({
            color: dist.color, transparent: true, opacity: 0.4,
            blending: THREE.AdditiveBlending,
        });
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.position.set(Math.cos(angle) * 13, 1, Math.sin(angle) * 13);
        arrow.rotation.z = -Math.PI / 2;
        arrow.rotation.y = -angle;
        parent.add(arrow);
    }
}

// ── District Environments ──
function createDistrictEnvironment(parent, key, dist) {
    const cx = dist.center[0], cz = dist.center[2];

    // District ground slab (raised slightly, colored)
    const slabGeo = new THREE.BoxGeometry(34, 0.3, 34);
    const slabMat = new THREE.MeshStandardMaterial({
        color: 0x0a0e18,
        emissive: dist.color,
        emissiveIntensity: 0.05,
        metalness: 0.4,
        roughness: 0.6,
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(cx, 0.15, cz);
    parent.add(slab);

    // Edge glow strips (4 sides)
    const edgeMat = new THREE.MeshBasicMaterial({
        color: dist.color, transparent: true, opacity: 0.25,
        blending: THREE.AdditiveBlending,
    });
    const stripW = 34, stripH = 0.1, stripD = 0.15;
    const offsets = [
        [0, 0.35, 17, 0],   // front
        [0, 0.35, -17, 0],  // back
        [17, 0.35, 0, Math.PI / 2],  // right
        [-17, 0.35, 0, Math.PI / 2], // left
    ];
    for (const [ox, oy, oz, rot] of offsets) {
        const stripGeo = new THREE.BoxGeometry(stripW, stripH, stripD);
        const strip = new THREE.Mesh(stripGeo, edgeMat);
        strip.position.set(cx + ox, oy, cz + oz);
        if (rot) strip.rotation.y = rot;
        parent.add(strip);
    }

    // Street lamps (district-colored point lights around the perimeter)
    const lampPositions = [
        [cx - 14, 4, cz - 14], [cx + 14, 4, cz - 14],
        [cx - 14, 4, cz + 14], [cx + 14, 4, cz + 14],
        [cx, 4, cz - 16], [cx, 4, cz + 16],
    ];
    for (const lp of lampPositions) {
        const lamp = new THREE.PointLight(dist.color, 0.8, 18);
        lamp.position.set(...lp);
        parent.add(lamp);

        // Lamp post
        const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 4, 4);
        const postMat = new THREE.MeshBasicMaterial({ color: dist.color, transparent: true, opacity: 0.2 });
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(lp[0], 2, lp[2]);
        parent.add(post);

        // Lamp head glow
        const glowGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: dist.color, transparent: true, opacity: 0.6,
            blending: THREE.AdditiveBlending,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(lp[0], lp[1], lp[2]);
        parent.add(glow);
    }

    // Style-specific details
    if (key === 'operations') addCyberpunkDetails(parent, cx, cz, dist);
    else if (key === 'customer') addPlayfulDetails(parent, cx, cz, dist);
    else if (key === 'business') addCorporateDetails(parent, cx, cz, dist);
    else if (key === 'employee') addOrganicDetails(parent, cx, cz, dist);
}

// ── Style-specific district details ──

function addCyberpunkDetails(parent, cx, cz, dist) {
    // Data stream tubes (glowing lines between building positions)
    const streamMat = new THREE.MeshBasicMaterial({
        color: dist.accent, transparent: true, opacity: 0.15,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const streams = [
        [[cx - 8, 1, cz - 4], [cx + 8, 1, cz + 4]],
        [[cx - 4, 1, cz - 8], [cx + 4, 1, cz + 12]],
    ];
    for (const [start, end] of streams) {
        const curve = new THREE.LineCurve3(new THREE.Vector3(...start), new THREE.Vector3(...end));
        const tubeGeo = new THREE.TubeGeometry(curve, 8, 0.06, 4, false);
        parent.add(new THREE.Mesh(tubeGeo, streamMat));
    }

    // Holographic floor ring
    const holoGeo = new THREE.TorusGeometry(10, 0.05, 4, 64);
    const holoMat = new THREE.MeshBasicMaterial({
        color: dist.color, transparent: true, opacity: 0.12,
        blending: THREE.AdditiveBlending,
    });
    const holo = new THREE.Mesh(holoGeo, holoMat);
    holo.rotation.x = -Math.PI / 2;
    holo.position.set(cx, 0.4, cz);
    parent.add(holo);
}

function addPlayfulDetails(parent, cx, cz, dist) {
    // Warm ground accents — scattered glowing circles
    const dotMat = new THREE.MeshBasicMaterial({
        color: dist.accent, transparent: true, opacity: 0.08,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 8; i++) {
        const r = 4 + Math.random() * 10;
        const a = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
        const dotGeo = new THREE.CircleGeometry(0.8 + Math.random() * 1.2, 16);
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(cx + Math.cos(a) * r, 0.35, cz + Math.sin(a) * r);
        parent.add(dot);
    }

    // Warm ambient light in center
    const warmLight = new THREE.PointLight(dist.accent, 1.5, 25);
    warmLight.position.set(cx, 3, cz);
    parent.add(warmLight);
}

function addCorporateDetails(parent, cx, cz, dist) {
    // Clean grid lines on the district floor
    const lineMat = new THREE.LineBasicMaterial({
        color: dist.color, transparent: true, opacity: 0.08,
    });
    for (let i = -14; i <= 14; i += 4) {
        const pts1 = [new THREE.Vector3(cx + i, 0.36, cz - 16), new THREE.Vector3(cx + i, 0.36, cz + 16)];
        const pts2 = [new THREE.Vector3(cx - 16, 0.36, cz + i), new THREE.Vector3(cx + 16, 0.36, cz + i)];
        parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts1), lineMat));
        parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), lineMat));
    }
}

function addOrganicDetails(parent, cx, cz, dist) {
    // "Trees" — simple cones in green
    const treeMat = new THREE.MeshStandardMaterial({
        color: 0x226633, emissive: dist.color, emissiveIntensity: 0.1,
        roughness: 0.8,
    });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
    const treePositions = [
        [cx - 12, cz - 12], [cx + 12, cz - 12], [cx - 12, cz + 12],
        [cx + 12, cz + 12], [cx - 6, cz + 14], [cx + 6, cz - 14],
        [cx + 14, cz], [cx - 14, cz + 6],
    ];
    for (const [tx, tz] of treePositions) {
        const h = 2 + Math.random() * 3;
        // Trunk
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, h * 0.4, 4), trunkMat);
        trunk.position.set(tx, h * 0.2 + 0.3, tz);
        parent.add(trunk);
        // Canopy
        const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.8 + Math.random() * 0.5, h * 0.7, 6), treeMat);
        canopy.position.set(tx, h * 0.4 + h * 0.35 + 0.3, tz);
        parent.add(canopy);
    }

    // Soft green ambient
    const greenLight = new THREE.PointLight(dist.color, 1, 25);
    greenLight.position.set(cx, 3, cz);
    parent.add(greenLight);
}

// ── Roads between districts and hub ──
function createRoads(parent) {
    const roadMat = new THREE.MeshBasicMaterial({
        color: 0x141828, transparent: true, opacity: 0.6,
    });
    const laneMat = new THREE.MeshBasicMaterial({
        color: 0x4488ff, transparent: true, opacity: 0.08,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });

    for (const dist of Object.values(DISTRICTS)) {
        const cx = dist.center[0], cz = dist.center[2];
        const angle = Math.atan2(cz, cx);
        const len = Math.sqrt(cx * cx + cz * cz) - 14; // from hub edge to district edge

        // Road surface
        const roadGeo = new THREE.PlaneGeometry(3, len);
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.rotation.z = -angle + Math.PI / 2;
        road.position.set(
            Math.cos(angle) * (14 + len / 2),
            0.02,
            Math.sin(angle) * (14 + len / 2)
        );
        parent.add(road);

        // Center lane stripe
        const laneGeo = new THREE.PlaneGeometry(0.15, len);
        const lane = new THREE.Mesh(laneGeo, laneMat);
        lane.rotation.x = -Math.PI / 2;
        lane.rotation.z = -angle + Math.PI / 2;
        lane.position.set(
            Math.cos(angle) * (14 + len / 2),
            0.03,
            Math.sin(angle) * (14 + len / 2)
        );
        parent.add(lane);
    }
}

// ── Building Construction ──

function createBuilding(bld, dist) {
    const [w, h, d] = bld.size;
    const group = new THREE.Group();
    group.name = bld.id;
    group.position.set(bld.pos[0], 0.3, bld.pos[2]); // sit on raised slab

    const shape = bld.shape || 'box';

    if (bld.hero) {
        buildHeroBuilding(group, bld, dist, w, h, d);
    } else if (shape === 'hex') {
        buildCyberpunkBlock(group, bld, dist, w, h);
    } else if (shape === 'round') {
        buildPlayfulBlock(group, bld, dist, w, h);
    } else if (shape === 'box') {
        buildCorporateBlock(group, bld, dist, w, h, d);
    } else if (shape === 'organic') {
        buildOrganicBlock(group, bld, dist, w, h);
    }

    return group;
}

// ── Hero Building (Operations) ──
function buildHeroBuilding(group, bld, dist, w, h, d) {
    // Main body — hex column
    const bodyGeo = new THREE.CylinderGeometry(w / 2 * 0.9, w / 2, h, 6);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x0c1020,
        emissive: dist.color, emissiveIntensity: 0.2,
        metalness: 0.6, roughness: 0.3,
        transparent: true, opacity: 0.92,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.userData = { buildingId: bld.id, clickable: true };
    group.add(body);

    // Glowing wireframe edges
    const edgesGeo = new THREE.EdgesGeometry(bodyGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: dist.color, transparent: true, opacity: 0.6 });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    edges.position.y = h / 2;
    group.add(edges);

    // Window bands
    const windowCount = Math.floor(h / 2);
    for (let i = 0; i < windowCount; i++) {
        const wy = (i + 1) * (h / (windowCount + 1));
        const ringGeo = new THREE.TorusGeometry(w / 2 * 0.92, 0.06, 4, 6);
        const ringMat = new THREE.MeshBasicMaterial({
            color: dist.color, transparent: true,
            opacity: 0.25 + Math.random() * 0.25,
            blending: THREE.AdditiveBlending,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = wy;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
    }

    // Antenna / spire
    const spireGeo = new THREE.CylinderGeometry(0.05, 0.2, 3, 4);
    const spireMat = new THREE.MeshBasicMaterial({ color: dist.color, transparent: true, opacity: 0.5 });
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.y = h + 1.5;
    group.add(spire);

    // Roof beacon
    const beaconColor = bld.beacon === 'green' ? 0x00ff88 : bld.beacon === 'amber' ? 0xffaa00 : 0xff4444;
    const beaconGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: beaconColor, transparent: true, opacity: 0.9 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = h + 3.2;
    group.add(beacon);

    const beaconLight = new THREE.PointLight(beaconColor, 2.5, 18);
    beaconLight.position.y = h + 3.2;
    group.add(beaconLight);

    // Base glow ring
    const baseGeo = new THREE.TorusGeometry(w / 2 + 0.8, 0.12, 4, 6);
    const baseMat = new THREE.MeshBasicMaterial({
        color: dist.color, transparent: true, opacity: 0.15,
        blending: THREE.AdditiveBlending,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.05;
    group.add(base);

    // Building light casting down
    const bldLight = new THREE.PointLight(dist.color, 1.5, 12);
    bldLight.position.y = h;
    group.add(bldLight);
}

// ── Cyberpunk blocks (non-hero, operations district) ──
function buildCyberpunkBlock(group, bld, dist, w, h) {
    const bodyGeo = new THREE.CylinderGeometry(w / 2 * 0.85, w / 2, h, 6);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x0a0e1a, emissive: dist.color, emissiveIntensity: 0.1,
        metalness: 0.5, roughness: 0.35, transparent: true, opacity: 0.88,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.userData = { buildingId: bld.id, clickable: true };
    group.add(body);

    // Edge wireframe
    const edgesGeo = new THREE.EdgesGeometry(bodyGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: dist.color, transparent: true, opacity: 0.3 });
    group.add(new THREE.LineSegments(edgesGeo, edgesMat).translateY(h / 2));

    // 2-3 window bands
    const bands = Math.max(2, Math.floor(h / 3));
    for (let i = 0; i < bands; i++) {
        const wy = (i + 1) * (h / (bands + 1));
        const ringGeo = new THREE.TorusGeometry(w / 2 * 0.87, 0.04, 4, 6);
        const ringMat = new THREE.MeshBasicMaterial({
            color: dist.color, transparent: true, opacity: 0.15 + Math.random() * 0.15,
            blending: THREE.AdditiveBlending,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = wy; ring.rotation.x = Math.PI / 2;
        group.add(ring);
    }

    // Top light
    const topLight = new THREE.PointLight(dist.color, 0.6, 8);
    topLight.position.y = h + 0.5;
    group.add(topLight);
}

// ── Playful / Rounded blocks (customer district) ──
function buildPlayfulBlock(group, bld, dist, w, h) {
    // Rounded cylinder with dome top
    const bodyGeo = new THREE.CylinderGeometry(w / 2, w / 2, h * 0.85, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x1a1210, emissive: dist.color, emissiveIntensity: 0.12,
        metalness: 0.2, roughness: 0.5, transparent: true, opacity: 0.9,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h * 0.85 / 2;
    body.userData = { buildingId: bld.id, clickable: true };
    group.add(body);

    // Dome cap
    const domeGeo = new THREE.SphereGeometry(w / 2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
        color: 0x1a1210, emissive: dist.accent, emissiveIntensity: 0.15,
        metalness: 0.3, roughness: 0.4,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = h * 0.85;
    group.add(dome);

    // Warm window dots (scattered on surface)
    const dotCount = Math.floor(h * 1.5);
    for (let i = 0; i < dotCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const wy = 1 + Math.random() * (h * 0.75);
        const dotGeo = new THREE.CircleGeometry(0.15, 6);
        const dotMat = new THREE.MeshBasicMaterial({
            color: dist.accent, transparent: true,
            opacity: 0.2 + Math.random() * 0.3,
            blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        });
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(
            Math.cos(angle) * (w / 2 + 0.01),
            wy,
            Math.sin(angle) * (w / 2 + 0.01)
        );
        dot.lookAt(dot.position.x * 2, wy, dot.position.z * 2);
        group.add(dot);
    }

    const topLight = new THREE.PointLight(dist.accent, 0.5, 8);
    topLight.position.y = h;
    group.add(topLight);
}

// ── Corporate / Box blocks (business district) ──
function buildCorporateBlock(group, bld, dist, w, h, d) {
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x0c1018, emissive: dist.color, emissiveIntensity: 0.08,
        metalness: 0.6, roughness: 0.25, transparent: true, opacity: 0.92,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.userData = { buildingId: bld.id, clickable: true };
    group.add(body);

    // Clean edge wireframe
    const edgesGeo = new THREE.EdgesGeometry(bodyGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: dist.color, transparent: true, opacity: 0.2 });
    group.add(new THREE.LineSegments(edgesGeo, edgesMat).translateY(h / 2));

    // Window grid (horizontal bands, evenly spaced)
    const floors = Math.floor(h / 1.5);
    for (let i = 0; i < floors; i++) {
        const wy = (i + 0.8) * (h / floors);
        // Front and back window strips
        for (const side of [-1, 1]) {
            const stripGeo = new THREE.PlaneGeometry(w * 0.85, 0.3);
            const stripMat = new THREE.MeshBasicMaterial({
                color: dist.color, transparent: true,
                opacity: 0.08 + Math.random() * 0.12,
                blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
            });
            const strip = new THREE.Mesh(stripGeo, stripMat);
            strip.position.set(0, wy, side * (d / 2 + 0.01));
            group.add(strip);
        }
    }

    // Roof edge accent
    const roofGeo = new THREE.BoxGeometry(w + 0.2, 0.1, d + 0.2);
    const roofMat = new THREE.MeshBasicMaterial({
        color: dist.color, transparent: true, opacity: 0.15,
        blending: THREE.AdditiveBlending,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h;
    group.add(roof);

    const topLight = new THREE.PointLight(dist.color, 0.4, 8);
    topLight.position.y = h + 0.5;
    group.add(topLight);
}

// ── Organic / Nature-tech blocks (employee district) ──
function buildOrganicBlock(group, bld, dist, w, h) {
    // Tapered cylinder (wider base, narrower top) — organic feel
    const bodyGeo = new THREE.CylinderGeometry(w / 2 * 0.6, w / 2, h, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x101a10, emissive: dist.color, emissiveIntensity: 0.1,
        metalness: 0.2, roughness: 0.6, transparent: true, opacity: 0.9,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.userData = { buildingId: bld.id, clickable: true };
    group.add(body);

    // Organic edge glow (soft wireframe)
    const edgesGeo = new THREE.EdgesGeometry(bodyGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: dist.color, transparent: true, opacity: 0.15 });
    group.add(new THREE.LineSegments(edgesGeo, edgesMat).translateY(h / 2));

    // Vine-like spiraling bands
    const spiralCount = 2;
    for (let s = 0; s < spiralCount; s++) {
        const points = [];
        const turns = 1.5 + Math.random();
        for (let i = 0; i <= 30; i++) {
            const t = i / 30;
            const angle = t * Math.PI * 2 * turns + s * Math.PI;
            const r = w / 2 * (1 - t * 0.35) + 0.05;
            const y = t * h;
            points.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const vineGeo = new THREE.TubeGeometry(curve, 30, 0.04, 4, false);
        const vineMat = new THREE.MeshBasicMaterial({
            color: dist.color, transparent: true, opacity: 0.2,
            blending: THREE.AdditiveBlending,
        });
        group.add(new THREE.Mesh(vineGeo, vineMat));
    }

    // Top leaf / bloom
    const leafGeo = new THREE.SphereGeometry(w / 2 * 0.5, 8, 6);
    const leafMat = new THREE.MeshStandardMaterial({
        color: 0x228844, emissive: dist.color, emissiveIntensity: 0.15,
        roughness: 0.7,
    });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.y = h + w / 4;
    leaf.scale.y = 0.5;
    group.add(leaf);

    const topLight = new THREE.PointLight(dist.color, 0.4, 8);
    topLight.position.y = h;
    group.add(topLight);
}
