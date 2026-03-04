/**
 * data.js — Data integration layer for Bath Foundry 3D Dashboard
 *
 * Provides mock business data for building visualizations.
 * getData(buildingId) returns current data for a specific building.
 * getKPIs() returns dashboard-wide metrics.
 * Simulates live changes every 5 seconds.
 */

// ── Static Data (loaded once) ──
let scheduleData = null;
let projectsData = null;

async function loadStaticData() {
    try {
        const [schedResp, projResp] = await Promise.all([
            fetch('data/mock-schedule.json'),
            fetch('data/mock-projects.json'),
        ]);
        scheduleData = await schedResp.json();
        projectsData = await projResp.json();
        console.log('[data] Loaded mock schedule and project data');
    } catch (err) {
        console.warn('[data] Failed to load JSON, using inline fallback', err);
        scheduleData = FALLBACK_SCHEDULE;
        projectsData = FALLBACK_PROJECTS;
    }
}

// Inline fallback if fetch fails (e.g. file:// protocol)
const FALLBACK_SCHEDULE = {
    date: '2026-03-04',
    crews: [
        { id: 'crew-alpha', name: 'Alpha Crew', lead: 'Marcus Davis', members: ['Marcus Davis', 'Jake Hernandez', 'Tyler Ross'], status: 'on-site' },
        { id: 'crew-bravo', name: 'Bravo Crew', lead: 'Diana Chen', members: ['Diana Chen', 'Sam Whitaker', 'Chris Bell'], status: 'on-site' },
        { id: 'crew-charlie', name: 'Charlie Crew', lead: 'Rob Tanaka', members: ['Rob Tanaka', 'Alex Ruiz'], status: 'en-route' },
        { id: 'crew-delta', name: 'Delta Crew', lead: 'Brianna Holt', members: ['Brianna Holt', 'Eli Vance', 'Maya Nguyen'], status: 'staging' },
    ],
    jobs: [
        { id: 'job-001', type: 'Tub Refinish', client: 'Sanderson Residence', crew: 'crew-alpha', startTime: '08:00', endTime: '11:30', status: 'in-progress' },
        { id: 'job-002', type: 'Tile Resurfacing', client: 'Comfort Inn Downtown', crew: 'crew-bravo', startTime: '07:30', endTime: '14:00', status: 'in-progress' },
        { id: 'job-003', type: 'Tub Refinish', client: 'Gutierrez Residence', crew: 'crew-charlie', startTime: '10:00', endTime: '13:00', status: 'scheduled' },
        { id: 'job-004', type: 'Countertop Refinish', client: 'Park East Apartments', crew: 'crew-delta', startTime: '09:00', endTime: '12:00', status: 'scheduled' },
        { id: 'job-005', type: 'Shower Resurfacing', client: 'McNally Residence', crew: 'crew-alpha', startTime: '13:00', endTime: '16:00', status: 'scheduled' },
        { id: 'job-006', type: 'Tub & Tile Combo', client: 'Hampton Suites Lakeway', crew: 'crew-bravo', startTime: '15:00', endTime: '18:00', status: 'scheduled' },
    ],
    utilization: { overall: 87, byHour: [60, 75, 100, 100, 88, 88, 100, 100, 75, 50] },
};

const FALLBACK_PROJECTS = {
    projects: [
        { id: 'proj-001', name: 'Hampton Suites Renovation', client: 'Hampton Hospitality Group', stage: 'in-progress', completion: 65, budget: 28500, spent: 18200 },
        { id: 'proj-002', name: 'Vista Ridge HOA Common Areas', client: 'Vista Ridge HOA', stage: 'in-progress', completion: 40, budget: 15000, spent: 5800 },
        { id: 'proj-003', name: 'Park East Apartment Turns', client: 'Park East Management', stage: 'in-progress', completion: 25, budget: 9200, spent: 2100 },
        { id: 'proj-004', name: 'Lakeway Estate Master Bath', client: 'Richardson Family', stage: 'planning', completion: 10, budget: 6800, spent: 0 },
        { id: 'proj-005', name: 'Downtown Condo Flip', client: 'Redline Properties LLC', stage: 'complete', completion: 100, budget: 4500, spent: 4200 },
    ],
    pipeline: { planning: 2, inProgress: 3, complete: 1, totalValue: 64000 },
};


// ── Simulation State ──
// Tracks simulated changes over time

let simTick = 0;
const SIM_INTERVAL_MS = 5000;
let simTimer = null;

// Activity level per building (0-1), drives visual reactivity
const activityLevels = {};

// Events per minute per building, drives window brightness
const eventsPerMinute = {};

// Beacon status per building: 'green' | 'amber' | 'red'
const beaconStatus = {};

function initSimulation() {
    // Seed initial values
    activityLevels['scheduling'] = 0.7;
    activityLevels['projects'] = 0.5;

    eventsPerMinute['scheduling'] = 12;
    eventsPerMinute['projects'] = 6;

    beaconStatus['scheduling'] = 'green';
    beaconStatus['projects'] = 'green';

    simTimer = setInterval(simulateTick, SIM_INTERVAL_MS);
    console.log('[data] Simulation started — updating every', SIM_INTERVAL_MS / 1000, 's');
}

function simulateTick() {
    simTick++;

    // Scheduling building: fluctuate activity based on "time of day"
    const phase = (simTick % 20) / 20; // 0-1 cycle over ~100 seconds
    const schedActivity = 0.4 + 0.5 * Math.sin(phase * Math.PI); // peaks mid-cycle
    activityLevels['scheduling'] = clamp(schedActivity + jitter(0.1), 0, 1);
    eventsPerMinute['scheduling'] = Math.round(4 + schedActivity * 16 + jitter(3));

    // Projects building: slower fluctuation
    const projActivity = 0.3 + 0.4 * Math.sin(phase * Math.PI * 0.7 + 1);
    activityLevels['projects'] = clamp(projActivity + jitter(0.08), 0, 1);
    eventsPerMinute['projects'] = Math.round(2 + projActivity * 10 + jitter(2));

    // Beacon logic:
    // Scheduling: red if utilization drops below 50, amber below 75
    const utilization = getScheduleUtilization();
    if (utilization < 50) beaconStatus['scheduling'] = 'red';
    else if (utilization < 75) beaconStatus['scheduling'] = 'amber';
    else beaconStatus['scheduling'] = 'green';

    // Projects: amber if any project is overbudget, red if >2
    const overbudget = countOverbudgetProjects();
    if (overbudget >= 2) beaconStatus['projects'] = 'red';
    else if (overbudget >= 1) beaconStatus['projects'] = 'amber';
    else beaconStatus['projects'] = 'green';

    // Simulate occasional status changes in schedule
    if (scheduleData && simTick % 4 === 0) {
        simulateJobStatusChange();
    }
}

function simulateJobStatusChange() {
    if (!scheduleData?.jobs) return;
    // Randomly advance one scheduled job to in-progress, or complete one
    const scheduled = scheduleData.jobs.filter(j => j.status === 'scheduled');
    const inProgress = scheduleData.jobs.filter(j => j.status === 'in-progress');

    if (scheduled.length > 0 && Math.random() > 0.5) {
        const job = scheduled[Math.floor(Math.random() * scheduled.length)];
        job.status = 'in-progress';
    } else if (inProgress.length > 0 && Math.random() > 0.6) {
        const job = inProgress[Math.floor(Math.random() * inProgress.length)];
        job.status = 'complete';
    }

    // Reset completed jobs back to scheduled after a while (loop the sim)
    const complete = scheduleData.jobs.filter(j => j.status === 'complete');
    if (complete.length >= 4) {
        for (const j of complete) j.status = 'scheduled';
    }
}

function getScheduleUtilization() {
    if (!scheduleData?.utilization) return 87;
    // Add some noise to base utilization
    return clamp(scheduleData.utilization.overall + jitter(15), 0, 100);
}

function countOverbudgetProjects() {
    if (!projectsData?.projects) return 0;
    return projectsData.projects.filter(p => p.spent > p.budget).length;
}

// ── Public API ──

/**
 * Get current data for a specific building
 * @param {string} buildingId - 'scheduling' or 'projects'
 * @returns {Object} Building-specific data payload
 */
export function getData(buildingId) {
    if (buildingId === 'scheduling') {
        return {
            type: 'scheduling',
            jobs: scheduleData?.jobs || FALLBACK_SCHEDULE.jobs,
            crews: scheduleData?.crews || FALLBACK_SCHEDULE.crews,
            utilization: getScheduleUtilization(),
            activity: activityLevels['scheduling'] || 0.5,
            eventsPerMinute: eventsPerMinute['scheduling'] || 8,
            beacon: beaconStatus['scheduling'] || 'green',
            todayJobCount: (scheduleData?.jobs || FALLBACK_SCHEDULE.jobs).length,
            inProgressCount: (scheduleData?.jobs || FALLBACK_SCHEDULE.jobs).filter(j => j.status === 'in-progress').length,
            completedCount: (scheduleData?.jobs || FALLBACK_SCHEDULE.jobs).filter(j => j.status === 'complete').length,
        };
    }

    if (buildingId === 'projects') {
        const projects = projectsData?.projects || FALLBACK_PROJECTS.projects;
        const activeProjects = projects.filter(p => p.stage !== 'complete');
        const avgCompletion = activeProjects.length
            ? Math.round(activeProjects.reduce((sum, p) => sum + p.completion, 0) / activeProjects.length)
            : 0;

        return {
            type: 'projects',
            projects,
            activeCount: activeProjects.length,
            avgCompletion,
            pipeline: projectsData?.pipeline || FALLBACK_PROJECTS.pipeline,
            activity: activityLevels['projects'] || 0.4,
            eventsPerMinute: eventsPerMinute['projects'] || 4,
            beacon: beaconStatus['projects'] || 'green',
            totalBudget: projects.reduce((s, p) => s + (p.budget || 0), 0),
            totalSpent: projects.reduce((s, p) => s + (p.spent || 0), 0),
        };
    }

    // Generic building — minimal data
    return {
        type: 'generic',
        activity: 0.3 + jitter(0.1),
        eventsPerMinute: Math.round(2 + jitter(2)),
        beacon: 'green',
    };
}

/**
 * Get dashboard-wide KPIs
 * @returns {Object} KPI metrics
 */
export function getKPIs() {
    const schedData = getData('scheduling');
    const projData = getData('projects');

    return {
        revenue: {
            label: 'Monthly Revenue',
            value: 47200 + Math.round(jitter(2000)),
            target: 55000,
            unit: '$',
            trend: 'up',
        },
        activeJobs: {
            label: 'Active Jobs Today',
            value: schedData.todayJobCount,
            inProgress: schedData.inProgressCount,
            completed: schedData.completedCount,
        },
        scheduleUtilization: {
            label: 'Schedule Utilization',
            value: Math.round(schedData.utilization),
            unit: '%',
            target: 85,
            status: schedData.beacon,
        },
        customerSatisfaction: {
            label: 'Customer Satisfaction',
            value: (4.6 + jitter(0.2)).toFixed(1),
            unit: '/ 5.0',
            trend: 'stable',
        },
        activeProjects: {
            label: 'Active Projects',
            value: projData.activeCount,
            avgCompletion: projData.avgCompletion,
        },
        budgetHealth: {
            label: 'Budget Health',
            totalBudget: projData.totalBudget,
            totalSpent: projData.totalSpent,
            ratio: projData.totalBudget > 0
                ? Math.round((projData.totalSpent / projData.totalBudget) * 100)
                : 0,
            unit: '%',
        },
    };
}

/**
 * Get visual reactivity data for building rendering
 * @param {string} buildingId
 * @returns {Object} { activity, eventsPerMinute, beacon }
 */
export function getVisualData(buildingId) {
    return {
        activity: activityLevels[buildingId] ?? 0.3,
        eventsPerMinute: eventsPerMinute[buildingId] ?? 2,
        beacon: beaconStatus[buildingId] ?? 'green',
    };
}

/**
 * Get formatted schedule lines for interior screen display
 * @returns {Array<string>} Lines of text for canvas texture
 */
export function getScheduleDisplayLines() {
    const jobs = scheduleData?.jobs || FALLBACK_SCHEDULE.jobs;
    const lines = ['── TODAY\'S SCHEDULE ──', ''];

    for (const job of jobs) {
        const statusIcon = job.status === 'in-progress' ? '▶'
            : job.status === 'complete' ? '✓'
            : '○';
        lines.push(`${statusIcon} ${job.startTime} ${job.type}`);
        lines.push(`  ${job.client}`);

        const crew = (scheduleData?.crews || FALLBACK_SCHEDULE.crews).find(c => c.id === job.crew);
        if (crew) lines.push(`  ${crew.name} — ${crew.lead}`);
        lines.push('');
    }

    return lines;
}

/**
 * Get formatted project lines for interior screen display
 * @returns {Array<string>} Lines of text for canvas texture
 */
export function getProjectDisplayLines() {
    const projects = (projectsData?.projects || FALLBACK_PROJECTS.projects)
        .filter(p => p.stage !== 'complete');
    const lines = ['── ACTIVE PROJECTS ──', ''];

    for (const proj of projects) {
        const bar = renderBar(proj.completion, 10);
        lines.push(`${proj.name}`);
        lines.push(`  ${bar} ${proj.completion}%`);
        lines.push(`  ${proj.client}`);

        const budgetPct = proj.budget > 0 ? Math.round((proj.spent / proj.budget) * 100) : 0;
        lines.push(`  Budget: $${(proj.spent / 1000).toFixed(1)}k / $${(proj.budget / 1000).toFixed(1)}k (${budgetPct}%)`);
        lines.push('');
    }

    return lines;
}


// ── Initialization ──

/**
 * Initialize the data layer — call once at startup
 * @returns {Promise<void>}
 */
export async function initData() {
    await loadStaticData();
    initSimulation();
    console.log('[data] Data layer initialized');
}

/**
 * Stop simulation (cleanup)
 */
export function stopSimulation() {
    if (simTimer) clearInterval(simTimer);
    simTimer = null;
}


// ── Utilities ──

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function jitter(magnitude) {
    return (Math.random() - 0.5) * 2 * magnitude;
}

function renderBar(pct, width) {
    const filled = Math.round((pct / 100) * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
}
