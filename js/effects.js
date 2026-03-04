/**
 * effects.js — Visual effects, particles, and performance systems
 * 
 * - Ambient dust mote particle field
 * - Data stream particles between Operations Hub buildings
 * - District name labels (floating CSS2DRenderer or sprite-based)
 * - Atmospheric haze gradient
 * - Central hub holographic ring
 * - Auto-degrade performance system
 */
import * as THREE from 'three';

// ── Auto-Degrade Performance System ──

const PERF_CONFIG = {
    targetFPS: 45,
    sampleFrames: 60,
    degradeLevels: [
        { bloom: [0.5, 0.3, 0.3], particles: 1.0, label: 'high' },
        { bloom: [0.3, 0.2, 0.4], particles: 0.6, label: 'medium' },
        { bloom: [0.15, 0.1, 0.5], particles: 0.3, label: 'low' },
        { bloom: [0, 0, 0], particles: 0.1, label: 'minimal' },
    ],
};

export class PerformanceMonitor {
    constructor(bloomPass) {
        this.bloomPass = bloomPass;
        this.frameTimes = [];
        this.currentLevel = 0;
        this.lastCheckTime = 0;
        this.particleScale = 1.0;
    }

    recordFrame(deltaMs) {
        this.frameTimes.push(deltaMs);
        if (this.frameTimes.length > PERF_CONFIG.sampleFrames) {
            this.frameTimes.shift();
        }
    }

    check(time) {
        if (time - this.lastCheckTime < 2) return; // check every 2s
        this.lastCheckTime = time;

        if (this.frameTimes.length < PERF_CONFIG.sampleFrames) return;

        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        const avgFPS = 1000 / avgFrameTime;

        if (avgFPS < PERF_CONFIG.targetFPS && this.currentLevel < PERF_CONFIG.degradeLevels.length - 1) {
            this.currentLevel++;
            this._applyLevel();
        } else if (avgFPS > PERF_CONFIG.targetFPS + 10 && this.currentLevel > 0) {
            // Recover if performance improves
            this.currentLevel--;
            this._applyLevel();
        }
    }

    _applyLevel() {
        const level = PERF_CONFIG.degradeLevels[this.currentLevel];
        if (this.bloomPass) {
            this.bloomPass.strength = level.bloom[0];
            this.bloomPass.radius = level.bloom[1];
            this.bloomPass.threshold = level.bloom[2];
        }
        this.particleScale = level.particles;
    }
}

// ── Ambient Dust Motes ──

export function createDustMotes(scene, count = 300) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 160;
        positions[i * 3 + 1] = 0.5 + Math.random() * 25;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 160;

        velocities[i * 3] = (Math.random() - 0.5) * 0.02;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

        sizes[i] = 0.05 + Math.random() * 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        color: 0x88aacc,
        size: 0.12,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    particles.name = 'dust-motes';
    particles.userData.velocities = velocities;
    scene.add(particles);
    return particles;
}

export function animateDustMotes(dustMotes, time) {
    if (!dustMotes) return;
    const positions = dustMotes.geometry.attributes.position.array;
    const velocities = dustMotes.userData.velocities;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
        const ix = i * 3;
        // Gentle drift + subtle sine wobble
        positions[ix] += velocities[ix] + Math.sin(time * 0.3 + i) * 0.003;
        positions[ix + 1] += velocities[ix + 1] + Math.sin(time * 0.2 + i * 0.5) * 0.002;
        positions[ix + 2] += velocities[ix + 2] + Math.cos(time * 0.25 + i * 0.3) * 0.003;

        // Wrap around bounds
        if (positions[ix] > 80) positions[ix] = -80;
        if (positions[ix] < -80) positions[ix] = 80;
        if (positions[ix + 1] > 30) positions[ix + 1] = 0.5;
        if (positions[ix + 1] < 0.3) positions[ix + 1] = 25;
        if (positions[ix + 2] > 80) positions[ix + 2] = -80;
        if (positions[ix + 2] < -80) positions[ix + 2] = 80;
    }

    dustMotes.geometry.attributes.position.needsUpdate = true;
}

// ── Data Stream Particles (between Operations Hub buildings) ──

export function createDataStreams(scene, buildingMeshes) {
    const streams = [];
    // Define stream paths between hero buildings
    const streamPairs = [
        ['scheduling', 'projects'],
        ['scheduling', 'ops-status'],
        ['projects', 'ops-qc'],
    ];

    for (const [fromId, toId] of streamPairs) {
        const fromEntry = buildingMeshes[fromId];
        const toEntry = buildingMeshes[toId];
        if (!fromEntry || !toEntry) continue;

        const fromPos = new THREE.Vector3(fromEntry.data.pos[0], fromEntry.data.size[1] * 0.6, fromEntry.data.pos[2]);
        const toPos = new THREE.Vector3(toEntry.data.pos[0], toEntry.data.size[1] * 0.6, toEntry.data.pos[2]);

        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const offsets = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            offsets[i] = i / particleCount;
            // Initialize along the path
            const t = offsets[i];
            positions[i * 3] = fromPos.x + (toPos.x - fromPos.x) * t;
            positions[i * 3 + 1] = fromPos.y + (toPos.y - fromPos.y) * t + Math.sin(t * Math.PI) * 3;
            positions[i * 3 + 2] = fromPos.z + (toPos.z - fromPos.z) * t;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x00e0ff,
            size: 0.15,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
        });

        const points = new THREE.Points(geometry, material);
        points.name = `data-stream-${fromId}-${toId}`;
        points.userData = { fromPos, toPos, offsets, particleCount };
        scene.add(points);
        streams.push(points);
    }

    return streams;
}

export function animateDataStreams(streams, time) {
    for (const stream of streams) {
        const { fromPos, toPos, offsets, particleCount } = stream.userData;
        const positions = stream.geometry.attributes.position.array;
        const speed = 0.15;

        for (let i = 0; i < particleCount; i++) {
            const t = (offsets[i] + time * speed) % 1;
            positions[i * 3] = fromPos.x + (toPos.x - fromPos.x) * t;
            positions[i * 3 + 1] = fromPos.y + (toPos.y - fromPos.y) * t + Math.sin(t * Math.PI) * 3;
            positions[i * 3 + 2] = fromPos.z + (toPos.z - fromPos.z) * t;
        }

        stream.geometry.attributes.position.needsUpdate = true;
    }
}

// ── District Name Labels (Sprite-based) ──

export function createDistrictLabels(scene, districts) {
    const labels = [];

    for (const [key, dist] of Object.entries(districts)) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow effect
        ctx.shadowColor = '#' + dist.color.toString(16).padStart(6, '0');
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#' + dist.color.toString(16).padStart(6, '0');
        ctx.globalAlpha = 0.8;
        ctx.fillText(dist.name.toUpperCase(), 256, 32);

        // Second pass for sharper text
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.5;
        ctx.fillText(dist.name.toUpperCase(), 256, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthTest: false,
        });

        const sprite = new THREE.Sprite(material);
        sprite.position.set(dist.center[0], 22, dist.center[2]);
        sprite.scale.set(18, 2.25, 1);
        sprite.name = `label-${key}`;

        scene.add(sprite);
        labels.push(sprite);
    }

    return labels;
}

export function animateDistrictLabels(labels, time) {
    for (const label of labels) {
        label.position.y = 22 + Math.sin(time * 0.5 + label.position.x * 0.1) * 0.3;
    }
}

// ── Atmospheric Haze ──

export function createAtmosphericHaze(scene) {
    // Ground-level fog plane
    const hazeGeo = new THREE.PlaneGeometry(250, 250, 1, 1);
    const hazeMat = new THREE.MeshBasicMaterial({
        color: 0x040810,
        transparent: true,
        opacity: 0.35,
        blending: THREE.NormalBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    const haze = new THREE.Mesh(hazeGeo, hazeMat);
    haze.rotation.x = -Math.PI / 2;
    haze.position.y = 0.1;
    haze.name = 'ground-haze';
    scene.add(haze);

    // Mid-level volumetric haze layers
    for (let i = 0; i < 3; i++) {
        const layerGeo = new THREE.PlaneGeometry(200, 200, 1, 1);
        const layerMat = new THREE.MeshBasicMaterial({
            color: 0x060a14,
            transparent: true,
            opacity: 0.08 - i * 0.02,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        const layer = new THREE.Mesh(layerGeo, layerMat);
        layer.rotation.x = -Math.PI / 2;
        layer.position.y = 2 + i * 4;
        layer.name = `haze-layer-${i}`;
        scene.add(layer);
    }
}

// ── Central Hub Holographic Ring ──

export function createHubHoloRing(scene) {
    const group = new THREE.Group();
    group.name = 'hub-holo-ring';
    group.position.set(0, 8, 0);

    // Main ring
    const ringGeo = new THREE.TorusGeometry(8, 0.08, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Inner ring
    const innerGeo = new THREE.TorusGeometry(6, 0.05, 8, 48);
    const innerMat = new THREE.MeshBasicMaterial({
        color: 0x6688cc,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = Math.PI / 2;
    group.add(inner);

    // Tick marks around ring
    const tickCount = 24;
    for (let i = 0; i < tickCount; i++) {
        const angle = (i / tickCount) * Math.PI * 2;
        const tickGeo = new THREE.BoxGeometry(0.06, 0.06, 0.8);
        const tickMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
        });
        const tick = new THREE.Mesh(tickGeo, tickMat);
        tick.position.set(Math.cos(angle) * 8, 0, Math.sin(angle) * 8);
        tick.rotation.y = -angle;
        group.add(tick);
    }

    // Outer glow ring
    const outerGeo = new THREE.TorusGeometry(10, 0.04, 8, 64);
    const outerMat = new THREE.MeshBasicMaterial({
        color: 0x2244aa,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    outer.rotation.x = Math.PI / 2;
    group.add(outer);

    scene.add(group);
    return group;
}

export function animateHubHoloRing(holoRing, time) {
    if (!holoRing) return;
    holoRing.rotation.y = time * 0.15;
    // Subtle bobbing
    holoRing.position.y = 8 + Math.sin(time * 0.4) * 0.3;

    // Pulse opacity on inner ring
    const inner = holoRing.children[1];
    if (inner && inner.material) {
        inner.material.opacity = 0.2 + 0.1 * Math.sin(time * 1.5);
    }
}

// ── Hover Highlight System ──

export class HoverHighlight {
    constructor() {
        this.currentHover = null;
        this.hoverIntensity = 0;
        this.targetIntensity = 0;
        this.originalEmissive = new Map();
    }

    setHovered(mesh) {
        if (mesh === this.currentHover) return;

        // Restore previous
        if (this.currentHover) {
            this._restoreEmissive(this.currentHover);
        }

        this.currentHover = mesh;
        this.hoverIntensity = 0;
        this.targetIntensity = mesh ? 1 : 0;

        if (mesh) {
            this._storeEmissive(mesh);
        }
    }

    _storeEmissive(mesh) {
        mesh.traverse(child => {
            if (child.isMesh && child.material && child.material.emissiveIntensity !== undefined) {
                if (!this.originalEmissive.has(child.uuid)) {
                    this.originalEmissive.set(child.uuid, child.material.emissiveIntensity);
                }
            }
        });
    }

    _restoreEmissive(mesh) {
        mesh.traverse(child => {
            if (child.isMesh && child.material && this.originalEmissive.has(child.uuid)) {
                child.material.emissiveIntensity = this.originalEmissive.get(child.uuid);
                this.originalEmissive.delete(child.uuid);
            }
        });
    }

    update(dt) {
        // Smooth interpolation
        this.hoverIntensity += (this.targetIntensity - this.hoverIntensity) * Math.min(1, dt * 6);

        if (this.currentHover && this.hoverIntensity > 0.01) {
            this.currentHover.traverse(child => {
                if (child.isMesh && child.material && this.originalEmissive.has(child.uuid)) {
                    const base = this.originalEmissive.get(child.uuid);
                    child.material.emissiveIntensity = base + this.hoverIntensity * 0.4;
                }
            });
        }
    }
}

// ── Improved Road Visuals ──

export function createImprovedRoads(parent, districts) {
    const roadGroup = new THREE.Group();
    roadGroup.name = 'roads-improved';

    const roadMat = new THREE.MeshBasicMaterial({
        color: 0x141828,
        transparent: true,
        opacity: 0.7,
    });

    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x2244aa,
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    });

    for (const dist of Object.values(districts)) {
        const cx = dist.center[0], cz = dist.center[2];
        const angle = Math.atan2(cz, cx);
        const len = Math.sqrt(cx * cx + cz * cz) - 14;

        // Main road surface
        const roadGeo = new THREE.PlaneGeometry(3.5, len);
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.rotation.z = -angle + Math.PI / 2;
        road.position.set(
            Math.cos(angle) * (14 + len / 2),
            0.02,
            Math.sin(angle) * (14 + len / 2)
        );
        roadGroup.add(road);

        // Road edge glow (both sides)
        for (const side of [-1, 1]) {
            const edgeGeo = new THREE.PlaneGeometry(0.1, len);
            const edge = new THREE.Mesh(edgeGeo, glowMat.clone());
            edge.material.opacity = 0.12;
            edge.rotation.x = -Math.PI / 2;
            edge.rotation.z = -angle + Math.PI / 2;

            const perpX = -Math.sin(angle) * 1.75 * side;
            const perpZ = Math.cos(angle) * 1.75 * side;
            edge.position.set(
                Math.cos(angle) * (14 + len / 2) + perpX,
                0.03,
                Math.sin(angle) * (14 + len / 2) + perpZ
            );
            roadGroup.add(edge);
        }

        // Dashed center line
        const dashCount = Math.floor(len / 2);
        const dashLen = 1.0;
        const gapLen = 1.0;
        for (let i = 0; i < dashCount; i++) {
            const t = (i * (dashLen + gapLen) + dashLen / 2) / len;
            if (t > 1) break;

            const dashGeo = new THREE.PlaneGeometry(0.12, dashLen);
            const dashMat = new THREE.MeshBasicMaterial({
                color: 0x4488ff,
                transparent: true,
                opacity: 0.15,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
            });
            const dash = new THREE.Mesh(dashGeo, dashMat);
            dash.rotation.x = -Math.PI / 2;
            dash.rotation.z = -angle + Math.PI / 2;

            const d = 14 + t * len;
            dash.position.set(
                Math.cos(angle) * d,
                0.035,
                Math.sin(angle) * d
            );
            roadGroup.add(dash);
        }
    }

    parent.add(roadGroup);
    return roadGroup;
}
