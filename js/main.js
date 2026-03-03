/**
 * main.js — Bath Foundry 3D Dashboard entry point
 * Tech spike: scene, camera rails, procedural city, perf counters
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { createCity, BUILDINGS, DISTRICTS } from './city.js?v=1';
import { CameraSystem } from './camera.js?v=1';

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

// ── Lighting ──
scene.add(new THREE.AmbientLight(0x0a0a14, 0.4));
const dirLight = new THREE.DirectionalLight(0x334466, 0.6);
dirLight.position.set(20, 40, 20);
scene.add(dirLight);

// ── City ──
const { cityGroup, buildingMeshes } = createCity(scene);

// ── Camera System ──
const cam = new CameraSystem(camera, renderer);

// ── Raycasting ──
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-999, -999);

renderer.domElement.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
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
                // Already at this building — zoom back to district
                cam.goToDistrict(bld.district);
            } else {
                cam.goToBuilding(bld);
            }
        }
    }
});

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

    // Bind clicks
    breadcrumb.querySelectorAll('.crumb').forEach(el => {
        el.addEventListener('click', () => {
            const action = el.dataset.action;
            if (action === 'city') cam.goToCity();
            else if (action === 'district') cam.goToDistrict(el.dataset.key);
        });
    });
};

// ── Dock ──
document.querySelectorAll('.dock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const bld = BUILDINGS.find(b => b.id === target);
        if (bld) cam.goToBuilding(bld);
    });
});

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

// ── Perf Counters ──
const fpsEl = document.getElementById('fps');
const drawsEl = document.getElementById('draws');
const trisEl = document.getElementById('tris');
let frameCount = 0;
let lastFpsTime = performance.now();

// ── Animation Loop ──
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const t = performance.now() / 1000;

    cam.update(t);

    // Animate hero building beacons (pulse)
    for (const [id, entry] of Object.entries(buildingMeshes)) {
        if (entry.data.hero) {
            const beacon = entry.mesh.children.find(c => c.geometry?.type === 'SphereGeometry');
            if (beacon) {
                beacon.material.opacity = 0.6 + 0.4 * Math.sin(t * 3 + entry.data.position[0]);
            }
        }
    }

    composer.render();

    // FPS counter
    frameCount++;
    const now = performance.now();
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

console.log('Bath Foundry Dashboard v0.1 — Tech Spike');
