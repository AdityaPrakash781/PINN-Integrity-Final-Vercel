/**
 * Client-side segment generator — Vercel-compatible port of server/mockData.js
 *
 * Loads benchmarks.json (real PINN output, pre-computed offline) via fetch,
 * then builds the 60-segment pipeline using the same curve math and YOLO
 * class profiles as the Express server. No backend required.
 */
import type { SegmentData, CVOutput } from '../types';

const SEGMENT_COUNT = 60;
const SEGMENT_LENGTH = 2; // metres

// ── Curve helpers ──────────────────────────────────────────────────────────────
const amplitudeY = 3, frequencyY = 0.08;
const amplitudeZ = 8, frequencyZ = 0.12;

function getPoint(t: number): [number, number, number] {
    return [t, Math.sin(t * frequencyY) * amplitudeY, Math.sin(t * frequencyZ) * amplitudeZ];
}
function getTangent(t: number): [number, number, number] {
    return [1, Math.cos(t * frequencyY) * frequencyY * amplitudeY, Math.cos(t * frequencyZ) * frequencyZ * amplitudeZ];
}

// ── YOLO class profiles (mirrors server/mockData.js) ──────────────────────────
const YOLO_CLASS_PROFILES = [
    { class_name: 'CJ', class_id: 1, base_conf: 0.891, base_corr_pct: 38.4, base_detect_rate: 0.73, base_total_frames: 87,
      base_mask_px: [[134,166],[243,141],[352,154],[454,186],[467,288],[435,397],[326,442],[211,435],[122,384],[115,269]] },
    { class_name: 'CK', class_id: 2, base_conf: 0.944, base_corr_pct: 8.7,  base_detect_rate: 0.88, base_total_frames: 105,
      base_mask_px: [[154,282],[198,237],[320,231],[435,237],[486,269],[474,333],[358,358],[230,365],[147,339]] },
    { class_name: 'PL', class_id: 4, base_conf: 0.815, base_corr_pct: 44.2, base_detect_rate: 0.66, base_total_frames: 78,
      base_mask_px: [[77,141],[218,122],[352,134],[422,192],[410,352],[378,461],[243,486],[115,448],[70,333],[64,224]] },
    { class_name: 'SG', class_id: 5, base_conf: 0.783, base_corr_pct: 29.6, base_detect_rate: 0.59, base_total_frames: 83,
      base_mask_px: [[160,198],[282,186],[384,192],[448,243],[454,371],[371,422],[262,429],[166,384],[160,288]] },
    { class_name: 'BX', class_id: 0, base_conf: 0.762, base_corr_pct: 22.1, base_detect_rate: 0.51, base_total_frames: 92,
      base_mask_px: [[205,211],[307,192],[403,218],[410,352],[301,378],[198,365]] },
    { class_name: 'ZW', class_id: 6, base_conf: 0.697, base_corr_pct: 17.3, base_detect_rate: 0.44, base_total_frames: 95,
      base_mask_px: [[211,275],[320,262],[416,275],[422,397],[314,410],[218,397]] },
    { class_name: 'OBB', class_id: 3, base_conf: 0.856, base_corr_pct: 12.4, base_detect_rate: 0.79, base_total_frames: 70,
      base_mask_px: [[179,230],[288,211],[384,224],[390,371],[282,390],[186,378]] },
    { class_name: 'none', class_id: -1, base_conf: 0.963, base_corr_pct: 0.0, base_detect_rate: 0.0, base_total_frames: 90,
      base_mask_px: [] as number[][] },
];

function pickYoloProfile(segmentId: string, integrity: number) {
    const num = parseInt(segmentId.replace(/\D/g, ''), 10) || 0;
    if (integrity > 0.78 && num % 3 !== 0) return YOLO_CLASS_PROFILES[YOLO_CLASS_PROFILES.length - 1];
    const defect = YOLO_CLASS_PROFILES.slice(0, -1);
    return defect[num % defect.length];
}

function generateCVOutput(segmentId: string, integrity: number): CVOutput {
    const profile = pickYoloProfile(segmentId, integrity);
    const jitter = () => (Math.random() - 0.5) * 0.06;
    const conf = Math.min(0.99, Math.max(0.50, profile.base_conf + jitter()));
    const corr = Math.max(0, profile.base_corr_pct * (0.9 + Math.random() * 0.2));
    const totalFrames = profile.base_total_frames;
    const detFrames = Math.round(profile.base_detect_rate * totalFrames * (0.9 + Math.random() * 0.2));
    const maskPx = profile.base_mask_px.map(([x, y]) => [
        Math.round(x + (Math.random() - 0.5) * 16),
        Math.round(y + (Math.random() - 0.5) * 16),
    ]);
    const polygonMask = maskPx.length > 0
        ? maskPx.map(([x, y]) => [x / 640, y / 640])
        : [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]];

    return {
        segment_id: segmentId,
        corrosion_surface_pct: Math.min(100, corr),
        confidence: conf,
        polygon_mask: polygonMask,
        frame_timestamp: new Date().toISOString(),
        corrosion_detected: profile.class_name !== 'none',
        class_id: profile.class_id,
        class_name: profile.class_name,
        severity_score: profile.class_name !== 'none' ? conf : 0,
        detection_rate: totalFrames > 0 ? detFrames / totalFrames : 0,
        total_frames: totalFrames,
        frames_with_detections: detFrames,
        yolo_mask_px: maskPx,
        is_yolo_result: true,
    };
}

/**
 * Fetch benchmarks.json and generate all pipeline segments.
 * Returns a flat array ready to pass to usePipelineStore.setSegments().
 */
export async function generateSegmentsFromBenchmarks(): Promise<SegmentData[]> {
    const base = import.meta.env.BASE_URL;
    const res = await fetch(`${base}benchmarks.json`);
    if (!res.ok) throw new Error(`Failed to load benchmarks.json: ${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const benchmarks: any[] = await res.json();

    if (benchmarks.length < SEGMENT_COUNT) {
        throw new Error(`benchmarks.json has ${benchmarks.length} entries, need >= ${SEGMENT_COUNT}`);
    }

    const segments: SegmentData[] = [];
    let currentT = -(SEGMENT_COUNT * SEGMENT_LENGTH) / 2;

    for (let i = 0; i < SEGMENT_COUNT; i++) {
        const segmentId = `SEG-${String(i + 1).padStart(3, '0')}`;
        const { xai, ...pinnFields } = benchmarks[i];
        const integrity: number = pinnFields.integrity;

        const position = getPoint(currentT);
        const direction = getTangent(currentT);

        segments.push({
            segment_id: segmentId,
            position,
            direction,
            integrity,
            cv: generateCVOutput(segmentId, integrity),
            pinn: { ...pinnFields, segment_id: segmentId },
            xai: { ...xai, segment_id: segmentId },
            lastUpdated: new Date().toISOString(),
        });

        const tangent = getTangent(currentT);
        const tangentLength = Math.sqrt(tangent[0] ** 2 + tangent[1] ** 2 + tangent[2] ** 2);
        currentT += SEGMENT_LENGTH / tangentLength;
    }

    return segments;
}
