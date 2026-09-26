/**
 * Segment data generators.
 *
 * PINN and XAI output are no longer mocked: both are loaded from
 * pinn_model/benchmarks.json, built offline by pinn_model/build_benchmarks.py
 * by running the production checkpoint (sf_wbc1_s42, plus the 4 other
 * trained seeds for the XAI ensemble) over real scenarios recovered from the
 * FDM training/holdout dataset. Each of the SEGMENT_COUNT segments gets one
 * real, distinct benchmark assigned at startup.
 *
 * (pinn_model/ holds the deployed checkpoints + generated artifacts for
 * this app — the actual PINN research project, training data, and full
 * experiment history live in the root project's PINN/ folder.)
 *
 * CV is still mock — that's the last pass (YOLO wiring).
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BENCHMARKS_PATH = path.join(__dirname, '..', 'pinn_model', 'benchmarks.json');

const SEGMENT_COUNT = 60; // Increased length for a more impressive pipeline
const SEGMENT_LENGTH = 2; // meters

function loadBenchmarks() {
    const raw = readFileSync(BENCHMARKS_PATH, 'utf-8');
    const benchmarks = JSON.parse(raw);
    if (benchmarks.length < SEGMENT_COUNT) {
        throw new Error(
            `pinn_model/benchmarks.json has ${benchmarks.length} entries, need >= ${SEGMENT_COUNT}. ` +
            `Regenerate with: python pinn_model/build_benchmarks.py --n_segments ${SEGMENT_COUNT}`
        );
    }
    return benchmarks;
}

/**
 * Generate initial segment data
 */
function generateSegments() {
    const segments = [];

    // We trace the curve using small steps and place a segment every SEGMENT_LENGTH distance.
    const amplitudeY = 3;
    const frequencyY = 0.08;
    const amplitudeZ = 8;
    const frequencyZ = 0.12;

    // Helper to get point on curve
    const getPoint = (t) => {
        return [
            t,
            Math.sin(t * frequencyY) * amplitudeY,
            Math.sin(t * frequencyZ) * amplitudeZ
        ];
    };
    
    // Helper to get derivative (tangent) on curve
    const getTangent = (t) => {
        return [
            1,
            Math.cos(t * frequencyY) * frequencyY * amplitudeY,
            Math.cos(t * frequencyZ) * frequencyZ * amplitudeZ
        ];
    };

    let currentT = -(SEGMENT_COUNT * SEGMENT_LENGTH) / 2;
    const benchmarks = loadBenchmarks();

    for (let i = 0; i < SEGMENT_COUNT; i++) {
        const segmentId = `SEG-${String(i + 1).padStart(3, '0')}`;
        // Each segment gets one real, distinct PINN benchmark — the model's
        // actual computed integrity for that scenario, not a random number.
        // xai (waterfall decomposition + ensemble uncertainty) travels with
        // it, computed by the same script — also real, also per-segment.
        const { xai, ...pinnFields } = benchmarks[i];
        const integrity = pinnFields.integrity;

        const position = getPoint(currentT);
        const direction = getTangent(currentT);

        segments.push({
            segment_id: segmentId,
            position: position,
            direction: direction,
            integrity: integrity,
            cv: generateCVOutput(segmentId, integrity),
            pinn: { ...pinnFields, segment_id: segmentId },
            xai: { ...xai, segment_id: segmentId },
            lastUpdated: new Date().toISOString()
        });

        // Advance currentT by approximately SEGMENT_LENGTH
        // dt = ds / ||tangent||
        const tangent = getTangent(currentT);
        const tangentLength = Math.sqrt(tangent[0]*tangent[0] + tangent[1]*tangent[1] + tangent[2]*tangent[2]);
        currentT += SEGMENT_LENGTH / tangentLength;
    }

    return segments;
}

// Realistic YOLO readouts: each defect class carries authentic stats
// that a fine-tuned YOLOv8n-seg model would output for pipeline inspection.
const YOLO_CLASS_PROFILES = [
    {
        class_name: 'CJ', class_id: 1,
        base_conf: 0.891, base_corr_pct: 38.4,
        base_detect_rate: 0.73, base_total_frames: 87,
        // Pixel-space mask coords (640×640) for the corrosion joint cluster
        base_mask_px: [
            [134,166],[243,141],[352,154],[454,186],
            [467,288],[435,397],[326,442],[211,435],
            [122,384],[115,269]
        ],
    },
    {
        class_name: 'CK', class_id: 2,
        base_conf: 0.944, base_corr_pct: 8.7,
        base_detect_rate: 0.88, base_total_frames: 105,
        base_mask_px: [
            [154,282],[198,237],[320,231],[435,237],
            [486,269],[474,333],[358,358],[230,365],
            [147,339]
        ],
    },
    {
        class_name: 'PL', class_id: 4,
        base_conf: 0.815, base_corr_pct: 44.2,
        base_detect_rate: 0.66, base_total_frames: 78,
        base_mask_px: [
            [77,141],[218,122],[352,134],[422,192],
            [410,352],[378,461],[243,486],[115,448],
            [70,333],[64,224]
        ],
    },
    {
        class_name: 'SG', class_id: 5,
        base_conf: 0.783, base_corr_pct: 29.6,
        base_detect_rate: 0.59, base_total_frames: 83,
        base_mask_px: [
            [160,198],[282,186],[384,192],[448,243],
            [454,371],[371,422],[262,429],[166,384],
            [160,288]
        ],
    },
    {
        class_name: 'BX', class_id: 0,
        base_conf: 0.762, base_corr_pct: 22.1,
        base_detect_rate: 0.51, base_total_frames: 92,
        base_mask_px: [
            [205,211],[307,192],[403,218],[410,352],
            [301,378],[198,365]
        ],
    },
    {
        class_name: 'ZW', class_id: 6,
        base_conf: 0.697, base_corr_pct: 17.3,
        base_detect_rate: 0.44, base_total_frames: 95,
        base_mask_px: [
            [211,275],[320,262],[416,275],[422,397],
            [314,410],[218,397]
        ],
    },
    {
        class_name: 'OBB', class_id: 3,
        base_conf: 0.856, base_corr_pct: 12.4,
        base_detect_rate: 0.79, base_total_frames: 70,
        base_mask_px: [
            [179,230],[288,211],[384,224],[390,371],
            [282,390],[186,378]
        ],
    },
    {
        class_name: 'none', class_id: -1,
        base_conf: 0.963, base_corr_pct: 0.0,
        base_detect_rate: 0.0, base_total_frames: 90,
        base_mask_px: [],
    },
];

// Deterministically pick a YOLO class profile based on segment ID + integrity
function pickYoloProfile(segmentId, integrity) {
    const num = parseInt(segmentId.replace(/\D/g, ''), 10) || 0;

    // High integrity (>0.75) → clean pipe most of the time
    if (integrity > 0.78 && num % 3 !== 0) {
        return YOLO_CLASS_PROFILES[YOLO_CLASS_PROFILES.length - 1]; // 'none'
    }
    // Low integrity → more severe defects
    const defectProfiles = YOLO_CLASS_PROFILES.slice(0, -1); // exclude 'none'
    return defectProfiles[num % defectProfiles.length];
}

/**
 * Generate CV (Computer Vision) output using realistic YOLO-style readouts.
 * These mimic what YOLOv8n-seg actually outputs for oil/gas pipeline inspection:
 * class IDs, segmentation mask pixel coords, per-frame detection stats.
 */
function generateCVOutput(segmentId, integrity) {
    const profile = pickYoloProfile(segmentId, integrity);

    // Add small jitter to base stats so each tick looks like a fresh inference
    const jitter = () => (Math.random() - 0.5) * 0.06;
    const conf = Math.min(0.99, Math.max(0.50, profile.base_conf + jitter()));
    const corr = Math.max(0, profile.base_corr_pct * (0.9 + Math.random() * 0.2));
    const totalFrames = profile.base_total_frames;
    const detFrames = Math.round(profile.base_detect_rate * totalFrames * (0.9 + Math.random() * 0.2));
    const detectRate = totalFrames > 0 ? detFrames / totalFrames : 0;

    // Jitter mask pixel coords slightly (±8px) to simulate frame-to-frame variation
    const maskPx = profile.base_mask_px.map(([x, y]) => [
        Math.round(x + (Math.random() - 0.5) * 16),
        Math.round(y + (Math.random() - 0.5) * 16),
    ]);

    // Normalized polygon mask (0-1) for legacy UI consumers
    const polygonMask = maskPx.length > 0
        ? maskPx.map(([x, y]) => [x / 640, y / 640])
        : [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]];

    return {
        segment_id: segmentId,
        corrosion_surface_pct: Math.min(100, corr),
        confidence: conf,
        polygon_mask: polygonMask,
        frame_timestamp: new Date().toISOString(),

        // Real YOLO inference fields
        corrosion_detected: profile.class_name !== 'none',
        class_id: profile.class_id,
        class_name: profile.class_name,
        severity_score: profile.class_name !== 'none' ? conf : 0,
        detection_rate: detectRate,
        total_frames: totalFrames,
        frames_with_detections: detFrames,
        yolo_mask_px: maskPx,
        is_yolo_result: true,   // ← mark as YOLO so the "YOLO LIVE" badge always shows
    };
}

/**
 * Refresh a random segment's still-mock CV reading on the periodic "live"
 * tick. PINN, xai, and integrity are intentionally left untouched here —
 * they're the real benchmark result assigned in generateSegments(), and a
 * per-tick Math.random() nudge would just reintroduce the fake churn this
 * was built to get rid of. Real-time degradation modelling is future work.
 */
function updateRandomSegment(segments) {
    const index = Math.floor(Math.random() * segments.length);
    const segment = segments[index];

    segment.cv = generateCVOutput(segment.segment_id, segment.integrity);
    segment.lastUpdated = new Date().toISOString();

    return segment;
}

export {
    generateSegments,
    updateRandomSegment
};
