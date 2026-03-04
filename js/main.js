/**
 * main.js — Bath Foundry 3D Dashboard entry point
 * v0.3 — Polish + Performance Optimization
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { createCity, BUILDINGS, DISTRICTS } from './city.js?v=3';
import { CameraSystem } from './camera.js?v=3';
import { createInterior, animateInterior, FLOOR_CONFIG } from './interiors.js?v=1';
import { initData, getData, getKPIs, getVisualData, getScheduleDisplayLines, getProjectDisplayLines } from './data.js?v=1';
import {
    PerformanceMonitor,
    createDustMotes, animateDustMotes,
    createDataStreams, animateDataStreams,
    createDistrictLabels, animateDistrictLabels,
    createAtmosphericHaze,
    createHubHoloRing, animateHubHoloRing,
    HoverHighlight,
    createImprovedRoads,
} from './effects.js?v=1';
import { openPanel, closePanel, isPanelOpen, getCurrentBuildingId } from './panel.js?v=1';

// ── Loading Screen ──
const loadingOverlay = document.getElementById('loading-overlay');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');

function updateLoading(pct, msg) {
    if (loadingBar) loadingBar.style.width = pct + '%';
    if (loadingText) loadingText.textContent = msg;
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => { loadingOverlay.style.display = 'none'; }, 600);
    }
}

updateLoading(10, 'Initializing renderer...');

// ── Scene Setup ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 0.8;
document.getElementById('canvas-container').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020208);
scene.fog = new THREE.FogExp2(0x020208, 0.004);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);

// ── Post-processing ──
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5, 0.3, 0.3
);
composer.addPass(bloom);

updateLoading(20, 'Building city...');

// ── Lighting ──
scene.add(new THREE.AmbientLight(0x0a0a14, 0.4));
const dirLight = new THREE.DirectionalLight(0x334466, 0.6);
dirLight.position.set(20, 40, 20);
scene.add(dirLight);

// ── City ──
const { cityGroup, buildingMeshes } = createCity(scene);

// Expose BUILDINGS globally for interiors.js
window.BUILDINGS = BUILDINGS;

updateLoading(40, 'Creating effects...');

// ── Improved Roads ──
createImprovedRoads(cityGroup, DISTRICTS);

// ── Effects Systems ──
const dustMotes = createDustMotes(scene, 250);
const dataStreams = createDataStreams(scene, buildingMeshes);
const districtLabels = createDistrictLabels(scene, DISTRICTS);
createAtmosphericHaze(scene);
const hubHoloRing = createHubHoloRing(scene);
const hoverHighlight = new HoverHighlight();
const perfMonitor = new PerformanceMonitor(bloom);

updateLoading(60, 'Setting up camera...');

// ── Camera System ──
const cam = new CameraSystem(camera, renderer);

// ── Interior Rooms (for hero buildings) ──
const activeInteriors = new Map();
let currentInteriorBuilding = null;

// ── Raycasting ──
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-999, -999);

// ── Hover Tooltip ──
const tooltip = document.getElementById('hover-tooltip');
let hoveredBuildingId = null;

renderer.domElement.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    // Update tooltip position
    if (tooltip && hoveredBuildingId) {
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top = (e.clientY - 10) + 'px';
    }
});

renderer.domElement.addEventListener('click', (e) => {
    raycaster.setFromCamera(mouse, camera);
    const clickables = [];
    scene.traverse(obj => {
        if (obj.isMesh && obj.userData.clickable) clickables.push(obj);
    });
    const hits = raycaster.intersectObjects(clickables);
    if (hits.length > 0) {
        const buildingId = hits[0].object.userData.buildingId;
        const bld = BUILDINGS.find(b => b.id === buildingId);
        if (bld) {
            if (cam.currentTier === 'building' && cam.currentBuilding === buildingId) {
                // Already focused on this building — open detail panel
                openPanel(buildingId);
                if (bld.hero) {
                    // Third click on hero building → enter interior
                    if (isPanelOpen() && getCurrentBuildingId() === buildingId) {
                        // Panel already showing this building, enter interior
                        enterBuildingInterior(buildingId);
                    }
                }
            } else if (cam.currentTier === 'interior' && cam.currentBuilding === buildingId) {
                exitBuildingInterior();
            } else {
                // Navigate to building and open panel
                cam.goToBuilding(bld);
                openPanel(buildingId);
            }
        }
    } else {
        // Clicked empty space — close panel if open
        if (isPanelOpen()) {
            closePanel();
        }
    }
});

// ── Hover Detection (runs in animate loop) ──
let lastHoverCheck = 0;

function updateHover(t) {
    if (t - lastHoverCheck < 0.1) return; // throttle to 10Hz
    lastHoverCheck = t;

    raycaster.setFromCamera(mouse, camera);
    const clickables = [];
    scene.traverse(obj => {
        if (obj.isMesh && obj.userData.clickable) clickables.push(obj);
    });
    const hits = raycaster.intersectObjects(clickables);

    if (hits.length > 0) {
        const buildingId = hits[0].object.userData.buildingId;
        const bld = BUILDINGS.find(b => b.id === buildingId);

        if (buildingId !== hoveredBuildingId) {
            hoveredBuildingId = buildingId;
            // Find building group mesh
            const entry = buildingMeshes[buildingId];
            hoverHighlight.setHovered(entry ? entry.mesh : null);

            // Update tooltip
            if (tooltip && bld) {
                const visual = getVisualData(buildingId);
                const statusDot = visual.beacon === 'green' ? '🟢' : visual.beacon === 'amber' ? '🟡' : '🔴';
                tooltip.innerHTML = `<strong>${bld.name}</strong><br><span class="tooltip-district">${DISTRICTS[bld.district].name}</span><br>${statusDot} ${visual.beacon}`;
                tooltip.classList.remove('hidden');
            }
        }

        renderer.domElement.style.cursor = 'pointer';
    } else {
        if (hoveredBuildingId) {
            hoveredBuildingId = null;
            hoverHighlight.setHovered(null);
            if (tooltip) tooltip.classList.add('hidden');
        }
        renderer.domElement.style.cursor = 'default';
    }
}

// ── Breadcrumb ──
const breadcrumb = document.getElementById('breadcrumb');

cam.onTierChange = (tier, district, building) => {
    let html = `<span class="crumb ${tier === 'city' ? 'active' : ''}" data-level="city" data-action="city">City</span>`;

    if (district) {
        const dist = DISTRICTS[district];
        html += `<span class="crumb-sep">›</span>`;
        html += `<span class="crumb ${tier === 'district' ? 'active' : ''}" data-level="district" data-action="district" data-key="${district}">${dist.name}</span>`;
    }

    if (building) {
        const bld = BUILDINGS.find(b => b.id === building);
        html += `<span class="crumb-sep">›</span>`;
        html += `<span class="crumb active" data-level="building">${bld?.name || building}</span>`;
    }

    breadcrumb.innerHTML = html;

    breadcrumb.querySelectorAll('.crumb').forEach(el => {
        el.addEventListener('click', () => {
            const action = el.dataset.action;
            if (action === 'city') cam.goToCity();
            else if (action === 'district') cam.goToDistrict(el.dataset.key);
        });
    });

    // Show/hide floor selector based on tier
    const floorSelector = document.getElementById('floor-selector');
    if (tier === 'interior') {
        floorSelector.classList.remove('hidden');
        floorSelector.querySelectorAll('.floor-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.floor === cam.currentFloor) {
                btn.classList.add('active');
            }
        });
    } else {
        floorSelector.classList.add('hidden');
    }
};

// ── Dock ──
document.querySelectorAll('.dock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const bld = BUILDINGS.find(b => b.id === target);
        if (bld) cam.goToBuilding(bld);
    });
});

// ── Interior Navigation ──

function enterBuildingInterior(buildingId) {
    const buildingEntry = buildingMeshes[buildingId];
    if (buildingEntry) {
        buildingEntry.mesh.visible = false;
    }

    if (!activeInteriors.has(buildingId)) {
        const interiors = {
            ground: createInterior(buildingId, 'ground', scene),
            mid: createInterior(buildingId, 'mid', scene),
            roof: createInterior(buildingId, 'roof', scene),
        };
        activeInteriors.set(buildingId, interiors);
    }

    const interiors = activeInteriors.get(buildingId);
    for (const floor of Object.values(interiors)) {
        if (floor) floor.visible = true;
    }

    cam.goToFloor(buildingId, 'ground');
    currentInteriorBuilding = buildingId;

    updateInteriorScreens();
}

function exitBuildingInterior() {
    if (!currentInteriorBuilding) return;

    const interiors = activeInteriors.get(currentInteriorBuilding);
    if (interiors) {
        for (const floor of Object.values(interiors)) {
            if (floor) floor.visible = false;
        }
    }

    const buildingEntry = buildingMeshes[currentInteriorBuilding];
    if (buildingEntry) {
        buildingEntry.mesh.visible = true;
    }

    const bld = BUILDINGS.find(b => b.id === currentInteriorBuilding);
    if (bld) cam.goToBuilding(bld);

    currentInteriorBuilding = null;
}

function goToFloor(floorKey) {
    if (!currentInteriorBuilding) return;
    const interiors = activeInteriors.get(currentInteriorBuilding);
    if (!interiors || !interiors[floorKey]) return;

    for (const [key, floor] of Object.entries(interiors)) {
        if (floor) floor.visible = (key === floorKey);
    }

    cam.goToFloor(currentInteriorBuilding, floorKey);
}

// ── Command Palette ──
const palette = document.getElementById('cmd-palette');
const cmdInput = document.getElementById('cmd-input');
const cmdResults = document.getElementById('cmd-results');

const searchItems = [
    ...BUILDINGS.map(b => ({
        label: b.name,
        hint: DISTRICTS[b.district].name,
        action: () => cam.goToBuilding(b),
    })),
    ...Object.entries(DISTRICTS).map(([key, d]) => ({
        label: d.name,
        hint: 'District',
        action: () => cam.goToDistrict(key),
    })),
    { label: 'City Overview', hint: 'Navigation', action: () => cam.goToCity() },
    { label: 'Morning Tour', hint: 'Tour Mode', action: () => cam.runTour() },
];

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        palette.classList.toggle('hidden');
        if (!palette.classList.contains('hidden')) {
            cmdInput.value = '';
            cmdInput.focus();
            renderCmdResults('');
        }
    }
    if (e.key === 'Escape' && !palette.classList.contains('hidden')) {
        palette.classList.add('hidden');
    }
    // Number keys for quick nav (1-4 = districts)
    if (document.activeElement.tagName !== 'INPUT' && !e.ctrlKey && !e.metaKey) {
        const districtKeys = ['operations', 'customer', 'business', 'employee'];
        const num = parseInt(e.key);
        if (num >= 1 && num <= 4) cam.goToDistrict(districtKeys[num - 1]);
        if (e.key === '0') cam.goToCity();
    }
});

cmdInput.addEventListener('input', () => renderCmdResults(cmdInput.value));
cmdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const selected = cmdResults.querySelector('.cmd-item.selected') || cmdResults.querySelector('.cmd-item');
        if (selected) selected.click();
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...cmdResults.querySelectorAll('.cmd-item')];
        const current = items.findIndex(i => i.classList.contains('selected'));
        items.forEach(i => i.classList.remove('selected'));
        const next = e.key === 'ArrowDown'
            ? Math.min(current + 1, items.length - 1)
            : Math.max(current - 1, 0);
        if (items[next]) items[next].classList.add('selected');
    }
});

function renderCmdResults(query) {
    const q = query.toLowerCase();
    const filtered = q ? searchItems.filter(i => i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q)) : searchItems;

    cmdResults.innerHTML = filtered.slice(0, 10).map((item, i) => `
        <div class="cmd-item ${i === 0 ? 'selected' : ''}" data-idx="${i}">
            <span class="label">${item.label}</span>
            <span class="hint">${item.hint}</span>
        </div>
    `).join('');

    cmdResults.querySelectorAll('.cmd-item').forEach((el, i) => {
        el.addEventListener('click', () => {
            filtered[i].action();
            palette.classList.add('hidden');
        });
    });
}

// ── Tour Button ──
document.getElementById('tour-btn').addEventListener('click', () => cam.runTour());

// ── Floor Selector Buttons ──
document.querySelectorAll('.floor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const floor = btn.dataset.floor;
        goToFloor(floor);
    });
});

// ── Data Layer Initialization ──
updateLoading(70, 'Loading data...');

initData().then(() => {
    console.log('Data layer ready — buildings will react to data');
    updateInteriorScreens();
    updateLoading(100, 'Ready');
    hideLoading();
});

// ── Data-Driven Building Visuals ──

const BEACON_COLORS = {
    green: 0x00ff88,
    amber: 0xffaa00,
    red: 0xff4444,
};

let lastDataUpdateTime = 0;
const DATA_UPDATE_INTERVAL = 5; // seconds

const screenTextures = {};

function updateBuildingVisuals(t) {
    for (const [id, entry] of Object.entries(buildingMeshes)) {
        if (!entry.data.hero) continue;

        const visual = getVisualData(id);

        // 1. Beacon color change
        const beaconColor = BEACON_COLORS[visual.beacon] || BEACON_COLORS.green;
        entry.mesh.traverse(child => {
            if (child.isMesh && child.geometry?.type === 'SphereGeometry' && child.position.y > 10) {
                child.material.color.setHex(beaconColor);
            }
            if (child.isLight && child.position.y > 10) {
                child.color.setHex(beaconColor);
            }
        });

        // 2. Window brightness based on events per minute
        const brightness = Math.min(1, visual.eventsPerMinute / 20);
        entry.mesh.traverse(child => {
            if (child.isMesh && child.geometry?.type === 'TorusGeometry') {
                child.material.opacity = 0.15 + brightness * 0.45;
            }
        });

        // 3. Building height pulse based on activity level
        const baseScale = 1.0;
        const pulseAmount = visual.activity * 0.03;
        const scale = baseScale + pulseAmount * Math.sin(t * 2 + (entry.data.pos[0] || 0));
        entry.mesh.scale.y = scale;

        // 4. Emissive intensity based on activity
        entry.mesh.traverse(child => {
            if (child.isMesh && child.material?.emissiveIntensity !== undefined) {
                if (child.geometry?.type === 'CylinderGeometry' && child.userData?.buildingId) {
                    child.material.emissiveIntensity = 0.1 + visual.activity * 0.3;
                }
            }
        });
    }
}

function createScreenTexture(lines, primaryColor, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width || 512;
    canvas.height = height || 512;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = 'rgba(4, 8, 16, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = primaryColor || '#00e0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // Scan line effect
    ctx.strokeStyle = 'rgba(0, 224, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let y = 0; y < canvas.height; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Text
    const fontSize = 14;
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = 'top';

    let y = 16;
    for (const line of lines) {
        if (line.startsWith('──')) {
            ctx.fillStyle = primaryColor || '#00e0ff';
            ctx.font = `bold ${fontSize + 2}px monospace`;
            ctx.fillText(line, 16, y);
            ctx.font = `${fontSize}px monospace`;
        } else if (line.startsWith('▶')) {
            ctx.fillStyle = '#ffaa00';
            ctx.fillText(line, 16, y);
        } else if (line.startsWith('✓')) {
            ctx.fillStyle = '#00ff88';
            ctx.fillText(line, 16, y);
        } else if (line.startsWith('○')) {
            ctx.fillStyle = '#668899';
            ctx.fillText(line, 16, y);
        } else if (line.startsWith('  ')) {
            ctx.fillStyle = '#445566';
            ctx.fillText(line, 16, y);
        } else if (line.includes('█') || line.includes('░')) {
            ctx.fillStyle = '#88ccff';
            ctx.fillText(line, 16, y);
        } else {
            ctx.fillStyle = '#aabbcc';
            ctx.fillText(line, 16, y);
        }
        y += fontSize + 4;
        if (y > canvas.height - 20) break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function updateInteriorScreens() {
    for (const [buildingId, interiors] of activeInteriors) {
        const ground = interiors.ground;
        if (!ground) continue;

        let lines, color;
        if (buildingId === 'scheduling') {
            lines = getScheduleDisplayLines();
            color = '#ff4422';
        } else if (buildingId === 'projects') {
            lines = getProjectDisplayLines();
            color = '#ff4422';
        } else {
            continue;
        }

        const texture = createScreenTexture(lines, color);

        const oldTex = screenTextures[buildingId];
        if (oldTex) oldTex.dispose();
        screenTextures[buildingId] = texture;

        ground.traverse(child => {
            if (child.isMesh && child.geometry?.type === 'PlaneGeometry') {
                child.material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.85,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide,
                });
            }
        });
    }
}

// ── Perf Counters ──
const fpsEl = document.getElementById('fps');
const drawsEl = document.getElementById('draws');
const trisEl = document.getElementById('tris');
let frameCount = 0;
let lastFpsTime = performance.now();

// ── Animation Loop ──
const clock = new THREE.Clock();
let lastFrameTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    const t = performance.now() / 1000;
    const now = performance.now();
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    cam.update(t);

    // Performance monitor
    perfMonitor.recordFrame(now - (now - dt * 1000));
    perfMonitor.check(t);

    // Hover detection
    updateHover(t);

    // Hover highlight smooth update
    hoverHighlight.update(dt);

    // Effects animations
    animateDustMotes(dustMotes, t);
    animateDataStreams(dataStreams, t);
    animateDistrictLabels(districtLabels, t);
    animateHubHoloRing(hubHoloRing, t);

    // Data-driven building visuals
    if (t - lastDataUpdateTime > DATA_UPDATE_INTERVAL) {
        lastDataUpdateTime = t;
        updateInteriorScreens();
    }
    updateBuildingVisuals(t);

    // Animate hero building beacons (opacity pulse)
    for (const [id, entry] of Object.entries(buildingMeshes)) {
        if (entry.data.hero) {
            const beacon = entry.mesh.children.find(c => c.geometry?.type === 'SphereGeometry');
            if (beacon) {
                const pos = entry.data.pos || entry.data.position || [0, 0, 0];
                beacon.material.opacity = 0.6 + 0.4 * Math.sin(t * 3 + (pos[0] || 0));
            }
        }
    }

    // Animate active interiors
    if (currentInteriorBuilding && activeInteriors.has(currentInteriorBuilding)) {
        const interiors = activeInteriors.get(currentInteriorBuilding);
        for (const floor of Object.values(interiors)) {
            if (floor && floor.visible) {
                animateInterior(floor, t);
            }
        }
    }

    composer.render();

    // FPS counter
    frameCount++;
    if (now - lastFpsTime >= 1000) {
        const fps = Math.round(frameCount / ((now - lastFpsTime) / 1000));
        fpsEl.textContent = fps + ' fps';
        drawsEl.textContent = renderer.info.render.calls + ' draws';
        trisEl.textContent = (renderer.info.render.triangles / 1000).toFixed(1) + 'K tris';
        frameCount = 0;
        lastFpsTime = now;
    }
}

animate();

// ── Resize ──
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

console.log('Bath Foundry Dashboard v0.3 — Polish + Performance');
