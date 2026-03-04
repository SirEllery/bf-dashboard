/**
 * camera.js — Camera rail system with 3 zoom tiers
 * 
 * Tier 1: City overview (all 4 districts visible)
 * Tier 2: District focus (one district fills view)
 * Tier 3: Building interior (close-up on single building)
 * 
 * Smooth transitions with easing (~0.8s district, ~0.4s building)
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DISTRICTS } from './city.js';
import { getInteriorCameraPosition } from './interiors.js';

const EASE = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // cubic ease in-out

// Camera presets per zoom tier
const PRESETS = {
    city: {
        position: new THREE.Vector3(0, 80, 85),
        target: new THREE.Vector3(0, 0, 0),
        duration: 0.8,
    },
    district: {
        // Dynamic — computed from district center
        heightOffset: 30,
        distanceOffset: 35,
        duration: 0.8,
    },
    building: {
        // Dynamic — computed from building position
        heightOffset: 12,
        distanceOffset: 14,
        duration: 0.4,
    },
};

export class CameraSystem {
    constructor(camera, renderer) {
        this.camera = camera;
        this.controls = new OrbitControls(camera, renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 120;
        this.controls.maxPolarAngle = Math.PI * 0.48;
        this.controls.zoomSpeed = 1.0;
        this.controls.panSpeed = 0.8;

        // Current state
        this.currentTier = 'city';
        this.currentDistrict = null;
        this.currentBuilding = null;

        // Transition animation
        this._transitioning = false;
        this._transitionStart = 0;
        this._transitionDuration = 0;
        this._fromPos = new THREE.Vector3();
        this._toPos = new THREE.Vector3();
        this._fromTarget = new THREE.Vector3();
        this._toTarget = new THREE.Vector3();
        this._onComplete = null;

        // Breadcrumb callback
        this.onTierChange = null;

        // Set initial position
        this.camera.position.copy(PRESETS.city.position);
        this.controls.target.copy(PRESETS.city.target);
    }

    /** Navigate to city overview */
    goToCity() {
        this._transition(
            PRESETS.city.position,
            PRESETS.city.target,
            PRESETS.city.duration,
            () => {
                this.currentTier = 'city';
                this.currentDistrict = null;
                this.currentBuilding = null;
                this._notifyTierChange();
            }
        );
    }

    /** Navigate to a district */
    goToDistrict(districtKey) {
        const dist = DISTRICTS[districtKey];
        if (!dist) return;

        const center = new THREE.Vector3(dist.center[0], 0, dist.center[2]);
        const preset = PRESETS.district;
        const pos = new THREE.Vector3(
            center.x + preset.distanceOffset * 0.5,
            preset.heightOffset,
            center.z + preset.distanceOffset
        );

        this._transition(pos, center, preset.duration, () => {
            this.currentTier = 'district';
            this.currentDistrict = districtKey;
            this.currentBuilding = null;
            this._notifyTierChange();
        });
    }

    /** Navigate to a building */
    goToBuilding(buildingData) {
        if (!buildingData) return;

        const p = buildingData.pos || buildingData.position;
        const bPos = new THREE.Vector3(p[0], 0, p[2]);
        const preset = PRESETS.building;
        const pos = new THREE.Vector3(
            bPos.x + preset.distanceOffset * 0.6,
            buildingData.size[1] + preset.heightOffset,
            bPos.z + preset.distanceOffset * 0.8
        );
        const target = new THREE.Vector3(bPos.x, buildingData.size[1] * 0.5, bPos.z);

        this._transition(pos, target, preset.duration, () => {
            this.currentTier = 'building';
            this.currentBuilding = buildingData.id;
            this._notifyTierChange();
        });
    }

    /** Navigate to a specific floor inside a hero building */
    goToFloor(buildingId, floor) {
        const cameraData = getInteriorCameraPosition(buildingId, floor);
        if (!cameraData) return;

        const preset = PRESETS.building;
        const pos = cameraData.position;
        const target = cameraData.target;

        this._transition(pos, target, preset.duration * 0.8, () => {
            this.currentTier = 'interior';
            this.currentBuilding = buildingId;
            this.currentFloor = floor;
            this._notifyTierChange();
        });
    }

    /** Update — call every frame */
    update(time) {
        if (this._transitioning) {
            const elapsed = time - this._transitionStart;
            let t = Math.min(elapsed / this._transitionDuration, 1);
            t = EASE(t);

            this.camera.position.lerpVectors(this._fromPos, this._toPos, t);
            this.controls.target.lerpVectors(this._fromTarget, this._toTarget, t);

            if (t >= 1) {
                this._transitioning = false;
                if (this._onComplete) this._onComplete();
            }
        }

        this.controls.update();
    }

    /** Tour mode — scripted camera path through key points */
    async runTour() {
        const stops = [
            { pos: new THREE.Vector3(0, 80, 85), target: new THREE.Vector3(0, 0, 0), hold: 2000 },
            { pos: new THREE.Vector3(55, 35, 60), target: new THREE.Vector3(40, 0, 40), hold: 2500 },
            { pos: new THREE.Vector3(38, 18, 46), target: new THREE.Vector3(32, 7, 36), hold: 2500 },
            { pos: new THREE.Vector3(54, 16, 46), target: new THREE.Vector3(48, 6, 36), hold: 2000 },
            { pos: new THREE.Vector3(-55, 35, 60), target: new THREE.Vector3(-40, 0, 40), hold: 1500 },
            { pos: new THREE.Vector3(-55, 35, -55), target: new THREE.Vector3(-40, 0, -40), hold: 1500 },
            { pos: new THREE.Vector3(55, 35, -55), target: new THREE.Vector3(40, 0, -40), hold: 1500 },
            { pos: new THREE.Vector3(0, 80, 85), target: new THREE.Vector3(0, 0, 0), hold: 500 },
        ];

        for (const stop of stops) {
            await this._transitionAsync(stop.pos, stop.target, 1.2);
            await this._wait(stop.hold);
        }

        this.currentTier = 'city';
        this.currentDistrict = null;
        this.currentBuilding = null;
        this._notifyTierChange();
    }

    // ── Internal ──

    _transition(toPos, toTarget, duration, onComplete) {
        this._fromPos.copy(this.camera.position);
        this._toPos.copy(toPos);
        this._fromTarget.copy(this.controls.target);
        this._toTarget.copy(toTarget);
        this._transitionDuration = duration;
        this._transitionStart = performance.now() / 1000;
        this._transitioning = true;
        this._onComplete = onComplete;
    }

    _transitionAsync(toPos, toTarget, duration) {
        return new Promise(resolve => {
            this._transition(toPos, toTarget, duration, resolve);
        });
    }

    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _notifyTierChange() {
        if (this.onTierChange) {
            this.onTierChange(this.currentTier, this.currentDistrict, this.currentBuilding);
        }
    }
}
