/**
 * panel.js — Building detail panel system
 * 
 * Slide-in side panel showing building info, metrics, and status.
 * Hero buildings (scheduling, projects) get rich data views.
 * Non-hero buildings show basic info.
 */

import { BUILDINGS, DISTRICTS } from './city.js?v=3';
import { getData, getKPIs, getVisualData } from './data.js?v=1';

// ── DOM refs ──
const panel = document.getElementById('detail-panel');
const closeBtn = document.getElementById('detail-close');
const nameEl = document.getElementById('detail-name');
const districtEl = document.getElementById('detail-district');
const iconEl = document.getElementById('detail-icon');
const beaconEl = document.getElementById('detail-beacon');
const bodyEl = document.getElementById('detail-body');

let currentBuildingId = null;
let refreshTimer = null;

// ── Building icon map ──
const BUILDING_ICONS = {
    'scheduling': '📅',
    'projects': '📋',
    'ops-qc': '✅',
    'ops-status': '📡',
    'ops-inventory': '📦',
    'ops-fleet': '🚚',
    'ops-safety': '🛡️',
    'ops-comms': '📡',
    'cust-leads': '🎯',
    'cust-sales': '💰',
    'cust-onboard': '🤝',
    'cust-support': '🎧',
    'cust-feedback': '💬',
    'cust-loyalty': '⭐',
    'cust-ads': '📢',
    'cust-reviews': '⭐',
    'biz-finance': '💹',
    'biz-strategy': '🧭',
    'biz-vendors': '🔗',
    'biz-legal': '⚖️',
    'biz-growth': '📈',
    'biz-data': '📊',
    'biz-exec': '🏛️',
    'emp-hiring': '👥',
    'emp-training': '🎓',
    'emp-culture': '🎨',
    'emp-perf': '📐',
    'emp-wellness': '💚',
    'emp-dev': '🔧',
    'emp-lounge': '☕',
    'emp-garden': '🌿',
};

// ── Beacon symbols ──
const BEACON_SYMBOL = {
    green: '🟢',
    amber: '🟡',
    red: '🔴',
};

/**
 * Open the detail panel for a building
 * @param {string} buildingId
 */
export function openPanel(buildingId) {
    const bld = BUILDINGS.find(b => b.id === buildingId);
    if (!bld) return;

    currentBuildingId = buildingId;
    const dist = DISTRICTS[bld.district];

    // Header
    nameEl.textContent = bld.name;
    districtEl.textContent = dist.name;
    iconEl.textContent = BUILDING_ICONS[buildingId] || '🏢';
    iconEl.style.borderColor = `#${dist.color.toString(16).padStart(6, '0')}40`;
    iconEl.style.background = `#${dist.color.toString(16).padStart(6, '0')}12`;

    // Beacon
    const visual = getVisualData(buildingId);
    beaconEl.textContent = BEACON_SYMBOL[visual.beacon] || '';

    // Body content
    renderBody(bld, dist);

    // Show panel
    panel.classList.remove('hidden');

    // Auto-refresh data every 5s for hero buildings
    clearInterval(refreshTimer);
    if (bld.hero) {
        refreshTimer = setInterval(() => {
            if (currentBuildingId === buildingId) {
                const freshVisual = getVisualData(buildingId);
                beaconEl.textContent = BEACON_SYMBOL[freshVisual.beacon] || '';
                renderBody(bld, dist);
            }
        }, 5000);
    }
}

/**
 * Close the detail panel
 */
export function closePanel() {
    panel.classList.add('hidden');
    currentBuildingId = null;
    clearInterval(refreshTimer);
}

/**
 * Check if panel is open
 * @returns {boolean}
 */
export function isPanelOpen() {
    return !panel.classList.contains('hidden');
}

/**
 * Get the currently displayed building ID
 * @returns {string|null}
 */
export function getCurrentBuildingId() {
    return currentBuildingId;
}

// ── Close button handler ──
closeBtn.addEventListener('click', closePanel);

// Escape handling is in main.js (unified priority)

// ── Render Functions ──

function renderBody(bld, dist) {
    if (bld.id === 'scheduling') {
        renderSchedulingPanel(bld, dist);
    } else if (bld.id === 'projects') {
        renderProjectsPanel(bld, dist);
    } else {
        renderGenericPanel(bld, dist);
    }
}

function renderHeroActions(bld) {
    return `<div class="dp-section">
        <button class="dp-enter-btn" onclick="window._enterBuildingInterior('${bld.id}')">
            ⬇ Enter Building Interior
        </button>
    </div>`;
}

function renderSchedulingPanel(bld, dist) {
    const data = getData('scheduling');

    let html = renderHeroActions(bld);

    // KPI grid
    html += `<div class="dp-section">
        <div class="dp-section-title">Today's Metrics</div>
        <div class="dp-kpi-grid">
            <div class="dp-kpi">
                <div class="dp-kpi-label">Utilization</div>
                <div class="dp-kpi-value ${data.beacon}">${Math.round(data.utilization)}%</div>
                <div class="dp-kpi-sub">target 85%</div>
            </div>
            <div class="dp-kpi">
                <div class="dp-kpi-label">Jobs Today</div>
                <div class="dp-kpi-value">${data.todayJobCount}</div>
                <div class="dp-kpi-sub">${data.inProgressCount} active · ${data.completedCount} done</div>
            </div>
            <div class="dp-kpi">
                <div class="dp-kpi-label">Events/min</div>
                <div class="dp-kpi-value">${data.eventsPerMinute}</div>
                <div class="dp-kpi-sub">system activity</div>
            </div>
            <div class="dp-kpi">
                <div class="dp-kpi-label">Activity</div>
                <div class="dp-kpi-value">${Math.round(data.activity * 100)}%</div>
                <div class="dp-progress"><div class="dp-progress-fill cyan" style="width: ${data.activity * 100}%"></div></div>
            </div>
        </div>
    </div>`;

    // Crew status
    html += `<div class="dp-section">
        <div class="dp-section-title">Crews</div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">`;
    for (const crew of data.crews) {
        html += `<div class="dp-crew-badge">
            <span class="dp-crew-dot ${crew.status}"></span>
            ${crew.name}
        </div>`;
    }
    html += `</div></div>`;

    // Job list
    html += `<div class="dp-section">
        <div class="dp-section-title">Schedule</div>`;
    for (const job of data.jobs) {
        const statusClass = job.status.replace(' ', '-');
        html += `<div class="dp-list-item ${statusClass}">
            <div class="dp-item-name">${job.type}
                <span class="dp-item-status ${statusClass}">${job.status}</span>
            </div>
            <div class="dp-item-meta">${job.client} · ${job.startTime}–${job.endTime}</div>
        </div>`;
    }
    html += `</div>`;

    bodyEl.innerHTML = html;
}

function renderProjectsPanel(bld, dist) {
    const data = getData('projects');

    let html = renderHeroActions(bld);

    // KPI grid
    const budgetPct = data.totalBudget > 0 ? Math.round((data.totalSpent / data.totalBudget) * 100) : 0;
    const budgetColor = budgetPct > 90 ? 'red' : budgetPct > 75 ? 'amber' : 'green';

    html += `<div class="dp-section">
        <div class="dp-section-title">Portfolio Metrics</div>
        <div class="dp-kpi-grid">
            <div class="dp-kpi">
                <div class="dp-kpi-label">Active Projects</div>
                <div class="dp-kpi-value">${data.activeCount}</div>
                <div class="dp-kpi-sub">${data.avgCompletion}% avg completion</div>
            </div>
            <div class="dp-kpi">
                <div class="dp-kpi-label">Budget Used</div>
                <div class="dp-kpi-value ${budgetColor}">${budgetPct}%</div>
                <div class="dp-progress"><div class="dp-progress-fill ${budgetColor}" style="width: ${budgetPct}%"></div></div>
            </div>
            <div class="dp-kpi">
                <div class="dp-kpi-label">Total Budget</div>
                <div class="dp-kpi-value">$${(data.totalBudget / 1000).toFixed(1)}k</div>
                <div class="dp-kpi-sub">$${(data.totalSpent / 1000).toFixed(1)}k spent</div>
            </div>
            <div class="dp-kpi">
                <div class="dp-kpi-label">Pipeline</div>
                <div class="dp-kpi-value">${data.pipeline.totalValue ? '$' + (data.pipeline.totalValue / 1000).toFixed(0) + 'k' : '—'}</div>
                <div class="dp-kpi-sub">${data.pipeline.planning} planning · ${data.pipeline.inProgress} active</div>
            </div>
        </div>
    </div>`;

    // Project list
    html += `<div class="dp-section">
        <div class="dp-section-title">Projects</div>`;
    for (const proj of data.projects) {
        const stageClass = proj.stage === 'in-progress' ? 'in-progress' : proj.stage;
        const barColor = proj.completion >= 80 ? 'green' : proj.completion >= 40 ? 'cyan' : 'amber';
        const budgetItemPct = proj.budget > 0 ? Math.round((proj.spent / proj.budget) * 100) : 0;

        html += `<div class="dp-list-item ${stageClass}">
            <div class="dp-item-name">${proj.name}
                <span class="dp-item-status ${stageClass}">${proj.stage}</span>
            </div>
            <div class="dp-item-meta">${proj.client} · $${(proj.spent / 1000).toFixed(1)}k / $${(proj.budget / 1000).toFixed(1)}k (${budgetItemPct}%)</div>
            <div class="dp-progress"><div class="dp-progress-fill ${barColor}" style="width: ${proj.completion}%"></div></div>
        </div>`;
    }
    html += `</div>`;

    bodyEl.innerHTML = html;
}

function renderGenericPanel(bld, dist) {
    const visual = getVisualData(bld.id);

    let html = '';

    // Basic info
    html += `<div class="dp-section">
        <div class="dp-section-title">Building Info</div>
        <div class="dp-info-row">
            <span class="dp-info-label">District</span>
            <span class="dp-info-value">${dist.name}</span>
        </div>
        <div class="dp-info-row">
            <span class="dp-info-label">Status</span>
            <span class="dp-info-value">${BEACON_SYMBOL[visual.beacon] || '🟢'} ${visual.beacon}</span>
        </div>
        <div class="dp-info-row">
            <span class="dp-info-label">Type</span>
            <span class="dp-info-value">${bld.hero ? 'Hero' : 'Standard'}</span>
        </div>
        <div class="dp-info-row">
            <span class="dp-info-label">Shape</span>
            <span class="dp-info-value" style="text-transform: capitalize;">${bld.shape || 'box'}</span>
        </div>
        <div class="dp-info-row">
            <span class="dp-info-label">Size</span>
            <span class="dp-info-value">${bld.size[0]}×${bld.size[1]}×${bld.size[2]}</span>
        </div>
    </div>`;

    // Activity
    html += `<div class="dp-section">
        <div class="dp-section-title">Activity</div>
        <div class="dp-kpi-grid">
            <div class="dp-kpi">
                <div class="dp-kpi-label">Activity</div>
                <div class="dp-kpi-value">${Math.round(visual.activity * 100)}%</div>
                <div class="dp-progress"><div class="dp-progress-fill cyan" style="width: ${visual.activity * 100}%"></div></div>
            </div>
            <div class="dp-kpi">
                <div class="dp-kpi-label">Events/min</div>
                <div class="dp-kpi-value">${visual.eventsPerMinute}</div>
            </div>
        </div>
    </div>`;

    // Location
    html += `<div class="dp-section">
        <div class="dp-section-title">Position</div>
        <div class="dp-info-row">
            <span class="dp-info-label">Coordinates</span>
            <span class="dp-info-value" style="font-family: 'Courier New', monospace; font-size: 11px;">[${bld.pos.join(', ')}]</span>
        </div>
    </div>`;

    bodyEl.innerHTML = html;
}
