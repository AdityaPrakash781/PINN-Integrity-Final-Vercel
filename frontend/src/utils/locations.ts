/**
 * Location definitions for the Pipeline Digital Twin.
 *
 * Each location has:
 *  - A display name and metadata shown in the UI
 *  - A 3-D curve shape (amplitude/frequency) for the pipeline scene
 *  - A segment count and length
 *  - A benchmark shuffle offset (so the same benchmarks.json is reused
 *    but each location gets a distinct, deterministic slice of data)
 *  - A YOLO class weight bias (makes one location skew toward certain defects)
 */

export interface LocationConfig {
    id: 'alpha' | 'bravo';
    label: string;
    sublabel: string;
    region: string;
    operatorId: string;
    pipelineName: string;
    material: string;
    diameterIn: number;       // inches
    pressureBar: number;
    installYear: number;
    segmentCount: number;
    segmentLength: number;    // metres
    // 3-D sine-curve shape params
    amplitudeY: number;
    frequencyY: number;
    amplitudeZ: number;
    frequencyZ: number;
    // Benchmark slice: skip the first `benchmarkOffset` entries so
    // the two locations use different parts of benchmarks.json
    benchmarkOffset: number;
    // Multiplicative integrity bias (< 1 = more degraded overall)
    integrityBias: number;
    // YOLO class order rotation (shifts which defect appears on which segment)
    yoloRotation: number;
    // Map pin colour shown in the selector UI
    accentColor: string;
}

export const LOCATIONS: Record<LocationConfig['id'], LocationConfig> = {
    alpha: {
        id: 'alpha',
        label: 'Permian Basin — Alpha Line',
        sublabel: 'West Texas, USA',
        region: 'North America',
        operatorId: 'OP-TX-441',
        pipelineName: 'Midland–Odessa Trunk Line A',
        material: 'API 5L X65 Carbon Steel',
        diameterIn: 20,
        pressureBar: 68,
        installYear: 2004,
        segmentCount: 60,
        segmentLength: 2,
        // Gentle S-curve — the original shape
        amplitudeY: 3,
        frequencyY: 0.08,
        amplitudeZ: 8,
        frequencyZ: 0.12,
        benchmarkOffset: 0,
        integrityBias: 1.0,
        yoloRotation: 0,
        accentColor: '#3b82f6',   // blue
    },
    bravo: {
        id: 'bravo',
        label: 'Gulf Coast — Bravo Line',
        sublabel: 'Louisiana Offshore, USA',
        region: 'North America',
        operatorId: 'OP-LA-807',
        pipelineName: 'Morgan City Subsea Lateral B',
        material: 'API 5L X70 Carbon Steel (FBE coated)',
        diameterIn: 16,
        pressureBar: 82,
        installYear: 1998,
        segmentCount: 48,
        segmentLength: 2.5,
        // Tighter, more aggressive S-curve — visually distinct layout
        amplitudeY: 5,
        frequencyY: 0.13,
        amplitudeZ: 12,
        frequencyZ: 0.07,
        benchmarkOffset: 120,     // use a different slice of benchmarks.json
        integrityBias: 0.82,      // older pipeline — overall slightly more degraded
        yoloRotation: 3,          // rotate class profiles → different defect mix
        accentColor: '#f59e0b',   // amber
    },
};

export const DEFAULT_LOCATION: LocationConfig['id'] = 'alpha';
