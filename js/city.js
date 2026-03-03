/**
 * city.js — Procedural city layout
 * 
 * 4 districts arranged around a central plaza.
 * Operations Hub (SE quadrant) is detailed; others are placeholder blocks.
 */
import * as THREE from 'three';

// District definitions
export const DISTRICTS = {
    operations: {
        name: 'Operations Hub',
        center: [30, 0, 30],
        color: 0x00e0ff,     // cyan neon
        accent: 0xff00cc,    // magenta
        style: 'cyberpunk',
        active: true,
    },
    customer: {
        name: 'Customer Journey',
        center: [-30, 0, 30],
        color: 0xff8844,
        accent: 0xffcc00,
        style: 'playful',
        active: false,
    },
    business: {
        name: 'Business Journey',
        center: [-30, 0, -30],
        color: 0x4488ff,
        accent: 0x88aacc,
        style: 'corporate',
        active: false,
    },
    employee: {
        name: 'Employee Journey',
        center: [30, 0, -30],
        color: 0x44cc66,
        accent: 0x88ddaa,
        style: 'organic',
        active: false,
    },
};

// Building registry — hero buildings have detail, placeholders are simple blocks
export const BUILDINGS = [
    // ── Operations Hub (detailed) ──
    {
        id: 'scheduling',
        name: 'Scheduling',
        district: 'operations',
        position: [22, 0, 28],
        size: [6, 12, 6],
        hero: true,
        beacon: 'green',
    },
    {
        id: 'projects',
        name: 'Project Management',
        district: 'operations',
        position: [38, 0, 28],
        size: [6, 10, 6],
        hero: true,
        beacon: 'green',
    },
    // Operations placeholder buildings
    { id: 'ops-qc', name: 'Quality Control', district: 'operations', position: [30, 0, 20], size: [4, 6, 4], hero: false },
    { id: 'ops-status', name: 'Live Status', district: 'operations', position: [22, 0, 38], size: [4, 7, 4], hero: false },
    { id: 'ops-inventory', name: 'Inventory', district: 'operations', position: [38, 0, 38], size: [4, 5, 4], hero: false },
    { id: 'ops-fleet', name: 'Fleet', district: 'operations', position: [30, 0, 42], size: [3, 4, 3], hero: false },

    // ── Customer Journey (placeholders) ──
    { id: 'cust-leads', name: 'Lead Gen', district: 'customer', position: [-28, 0, 28], size: [5, 8, 5], hero: false },
    { id: 'cust-sales', name: 'Sales', district: 'customer', position: [-35, 0, 32], size: [4, 7, 4], hero: false },
    { id: 'cust-onboard', name: 'Onboarding', district: 'customer', position: [-28, 0, 36], size: [4, 5, 4], hero: false },
    { id: 'cust-support', name: 'Support', district: 'customer', position: [-35, 0, 24], size: [3, 6, 3], hero: false },

    // ── Business Journey (placeholders) ──
    { id: 'biz-finance', name: 'Finance', district: 'business', position: [-28, 0, -28], size: [5, 9, 5], hero: false },
    { id: 'biz-strategy', name: 'Strategy', district: 'business', position: [-35, 0, -32], size: [4, 7, 4], hero: false },
    { id: 'biz-vendors', name: 'Vendors', district: 'business', position: [-28, 0, -36], size: [4, 5, 4], hero: false },
    { id: 'biz-growth', name: 'Growth', district: 'business', position: [-35, 0, -24], size: [3, 6, 3], hero: false },

    // ── Employee Journey (placeholders) ──
    { id: 'emp-hiring', name: 'Hiring', district: 'employee', position: [28, 0, -28], size: [5, 7, 5], hero: false },
    { id: 'emp-training', name: 'Training', district: 'employee', position: [35, 0, -32], size: [4, 6, 4], hero: false },
    { id: 'emp-culture', name: 'Culture', district: 'employee', position: [28, 0, -36], size: [4, 5, 4], hero: false },
    { id: 'emp-perf', name: 'Performance', district: 'employee', position: [35, 0, -24], size: [3, 6, 3], hero: false },
];

export function createCity(scene) {
    const cityGroup = new THREE.Group();
    cityGroup.name = 'city';

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x080810,
        roughness: 0.95,
        metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    cityGroup.add(ground);

    // Grid
    const grid = new THREE.GridHelper(200, 100, 0x111128, 0x0a0a1a);
    grid.position.y = 0;
    cityGroup.add(grid);

    // Central plaza (ring road / hub)
    const plazaGeo = new THREE.RingGeometry(8, 10, 64);
    const plazaMat = new THREE.MeshBasicMaterial({
        color: 0x182030,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
    });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.02;
    cityGroup.add(plaza);

    // District ground markers
    for (const [key, dist] of Object.entries(DISTRICTS)) {
        const markerGeo = new THREE.PlaneGeometry(30, 30);
        const markerMat = new THREE.MeshBasicMaterial({
            color: dist.color,
            transparent: true,
            opacity: dist.active ? 0.04 : 0.015,
            side: THREE.DoubleSide,
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(dist.center[0], 0.01, dist.center[2]);
        cityGroup.add(marker);

        // District border
        const borderGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(30, 30));
        const borderMat = new THREE.LineBasicMaterial({
            color: dist.color,
            transparent: true,
            opacity: dist.active ? 0.2 : 0.06,
        });
        const border = new THREE.LineSegments(borderGeo, borderMat);
        border.rotation.x = -Math.PI / 2;
        border.position.set(dist.center[0], 0.02, dist.center[2]);
        cityGroup.add(border);
    }

    // Roads connecting districts to center
    const roadMat = new THREE.MeshBasicMaterial({
        color: 0x1a2030,
        transparent: true,
        opacity: 0.5,
    });
    for (const dist of Object.values(DISTRICTS)) {
        const dx = dist.center[0] > 0 ? 1 : -1;
        const dz = dist.center[2] > 0 ? 1 : -1;
        // Road from center toward district
        const roadGeo = new THREE.PlaneGeometry(2, 25);
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(dx * 12.5, 0.015, dz * 12.5);
        road.rotation.z = Math.atan2(dist.center[0], dist.center[2]);
        cityGroup.add(road);
    }

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

function createBuilding(bld, dist) {
    const [w, h, d] = bld.size;
    const group = new THREE.Group();
    group.name = bld.id;
    group.position.set(bld.position[0], 0, bld.position[2]);

    if (bld.hero) {
        // Hero building — detailed geometry
        // Main body (hex column for cyberpunk feel)
        const bodyGeo = new THREE.CylinderGeometry(w / 2 * 0.9, w / 2, h, 6);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x0c1020,
            emissive: dist.color,
            emissiveIntensity: 0.15,
            metalness: 0.6,
            roughness: 0.3,
            transparent: true,
            opacity: 0.9,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = h / 2;
        body.userData = { buildingId: bld.id, clickable: true };
        group.add(body);

        // Glowing edges
        const edgesGeo = new THREE.EdgesGeometry(bodyGeo);
        const edgesMat = new THREE.LineBasicMaterial({
            color: dist.color,
            transparent: true,
            opacity: 0.5,
        });
        const edges = new THREE.LineSegments(edgesGeo, edgesMat);
        edges.position.y = h / 2;
        group.add(edges);

        // Window strips (instanced horizontal bands)
        const windowCount = Math.floor(h / 2);
        for (let i = 0; i < windowCount; i++) {
            const wy = (i + 1) * (h / (windowCount + 1));
            const ringGeo = new THREE.TorusGeometry(w / 2 * 0.92, 0.08, 4, 6);
            const ringMat = new THREE.MeshBasicMaterial({
                color: dist.color,
                transparent: true,
                opacity: 0.3 + Math.random() * 0.2,
                blending: THREE.AdditiveBlending,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.y = wy;
            ring.rotation.x = Math.PI / 2;
            group.add(ring);
        }

        // Roof beacon
        const beaconColor = bld.beacon === 'green' ? 0x00ff88 : bld.beacon === 'amber' ? 0xffaa00 : 0xff4444;
        const beaconGeo = new THREE.SphereGeometry(0.3, 8, 8);
        const beaconMat = new THREE.MeshBasicMaterial({
            color: beaconColor,
            transparent: true,
            opacity: 0.9,
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.y = h + 0.5;
        group.add(beacon);

        // Beacon light
        const beaconLight = new THREE.PointLight(beaconColor, 2, 15);
        beaconLight.position.y = h + 0.5;
        group.add(beaconLight);

        // Base glow
        const baseGeo = new THREE.CircleGeometry(w / 2 + 1, 6);
        const baseMat = new THREE.MeshBasicMaterial({
            color: dist.color,
            transparent: true,
            opacity: 0.06,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.rotation.x = -Math.PI / 2;
        base.position.y = 0.02;
        group.add(base);
    } else {
        // Placeholder building — simple box
        const bodyGeo = new THREE.BoxGeometry(w, h, d);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x0a0e18,
            emissive: dist.color,
            emissiveIntensity: dist.active ? 0.06 : 0.02,
            metalness: 0.5,
            roughness: 0.4,
            transparent: true,
            opacity: dist.active ? 0.8 : 0.4,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = h / 2;
        body.userData = { buildingId: bld.id, clickable: true };
        group.add(body);

        // Subtle edge outline
        const edgesGeo = new THREE.EdgesGeometry(bodyGeo);
        const edgesMat = new THREE.LineBasicMaterial({
            color: dist.color,
            transparent: true,
            opacity: dist.active ? 0.15 : 0.05,
        });
        const edges = new THREE.LineSegments(edgesGeo, edgesMat);
        edges.position.y = h / 2;
        group.add(edges);
    }

    return group;
}
