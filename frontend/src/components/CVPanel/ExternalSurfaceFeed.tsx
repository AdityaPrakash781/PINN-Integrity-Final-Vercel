import { useEffect, useRef, useState } from 'react';
import { usePipelineStore } from '../../store/usePipelineStore';



// Vite base URL prefix (from vite.config.ts `base` setting)
const BASE = import.meta.env.BASE_URL;

// Maps defect class to the real pipe inspection photo
// Prefix with BASE so they resolve correctly under any Vite base path
const CLASS_TO_IMAGE: Record<string, string> = {
    CJ: `${BASE}pipe_images/pipe_corrosion_cj.jpg`,
    BX: `${BASE}pipe_images/pipe_corrosion_cj.jpg`,
    CK: `${BASE}pipe_images/pipe_crack_ck.jpg`,
    PL: `${BASE}pipe_images/pipe_peeling_sg.jpg`,
    SG: `${BASE}pipe_images/pipe_peeling_sg.jpg`,
    ZW: `${BASE}pipe_images/pipe_peeling_sg.jpg`,
    OBB: `${BASE}pipe_images/pipe_crack_ck.jpg`,
    none: `${BASE}pipe_images/pipe_clean_none.jpg`,
};

// Realistic hardcoded YOLO readouts per defect type
// These represent what a real YOLOv8-Seg model would output for each class
const YOLO_MOCK_READOUTS: Record<string, {
    class_name: string;
    confidence: number;
    corrosion_surface_pct: number;
    severity_score: number;
    detection_rate: number;
    total_frames: number;
    frames_with_detections: number;
    // Normalized bounding box [x1,y1,x2,y2] in 0-1 range for overlay
    bbox_norm: [number, number, number, number];
    // Polygon mask points in 0-1 range
    mask_norm: [number, number][];
    model_tag: string;
    inference_ms: number;
}> = {
    CJ: {
        class_name: 'CJ',
        confidence: 0.891,
        corrosion_surface_pct: 38.4,
        severity_score: 0.891,
        detection_rate: 0.73,
        total_frames: 87,
        frames_with_detections: 64,
        bbox_norm: [0.18, 0.22, 0.74, 0.71],
        mask_norm: [
            [0.21, 0.26], [0.38, 0.22], [0.55, 0.24], [0.71, 0.29],
            [0.73, 0.45], [0.68, 0.62], [0.51, 0.69], [0.33, 0.68],
            [0.19, 0.60], [0.18, 0.42]
        ],
        model_tag: 'yolov8n-seg_pinn_v3',
        inference_ms: 34,
    },
    BX: {
        class_name: 'BX',
        confidence: 0.762,
        corrosion_surface_pct: 22.1,
        severity_score: 0.762,
        detection_rate: 0.51,
        total_frames: 92,
        frames_with_detections: 47,
        bbox_norm: [0.30, 0.30, 0.65, 0.60],
        mask_norm: [
            [0.32, 0.33], [0.48, 0.30], [0.63, 0.34],
            [0.64, 0.55], [0.47, 0.59], [0.31, 0.57]
        ],
        model_tag: 'yolov8n-seg_pinn_v3',
        inference_ms: 31,
    },
    CK: {
        class_name: 'CK',
        confidence: 0.944,
        corrosion_surface_pct: 8.7,
        severity_score: 0.944,
        detection_rate: 0.88,
        total_frames: 105,
        frames_with_detections: 92,
        bbox_norm: [0.22, 0.35, 0.78, 0.58],
        mask_norm: [
            [0.24, 0.44], [0.31, 0.37], [0.50, 0.36],
            [0.68, 0.37], [0.76, 0.42], [0.74, 0.52],
            [0.56, 0.56], [0.36, 0.57], [0.23, 0.53]
        ],
        model_tag: 'yolov8n-seg_pinn_v3',
        inference_ms: 28,
    },
    PL: {
        class_name: 'PL',
        confidence: 0.815,
        corrosion_surface_pct: 44.2,
        severity_score: 0.815,
        detection_rate: 0.66,
        total_frames: 78,
        frames_with_detections: 52,
        bbox_norm: [0.10, 0.18, 0.68, 0.78],
        mask_norm: [
            [0.12, 0.22], [0.34, 0.19], [0.55, 0.21], [0.66, 0.30],
            [0.64, 0.55], [0.59, 0.72], [0.38, 0.76], [0.18, 0.70],
            [0.11, 0.52], [0.10, 0.35]
        ],
        model_tag: 'yolov8n-seg_pinn_v3',
        inference_ms: 36,
    },
    SG: {
        class_name: 'SG',
        confidence: 0.783,
        corrosion_surface_pct: 29.6,
        severity_score: 0.783,
        detection_rate: 0.59,
        total_frames: 83,
        frames_with_detections: 49,
        bbox_norm: [0.25, 0.28, 0.72, 0.68],
        mask_norm: [
            [0.27, 0.31], [0.44, 0.29], [0.60, 0.30], [0.70, 0.38],
            [0.71, 0.58], [0.58, 0.66], [0.41, 0.67], [0.26, 0.60],
            [0.25, 0.45]
        ],
        model_tag: 'yolov8n-seg_pinn_v3',
        inference_ms: 33,
    },
    ZW: {
        class_name: 'ZW',
        confidence: 0.697,
        corrosion_surface_pct: 17.3,
        severity_score: 0.697,
        detection_rate: 0.44,
        total_frames: 95,
        frames_with_detections: 42,
        bbox_norm: [0.33, 0.40, 0.67, 0.65],
        mask_norm: [
            [0.35, 0.43], [0.50, 0.41], [0.65, 0.43],
            [0.66, 0.62], [0.49, 0.64], [0.34, 0.62]
        ],
        model_tag: 'yolov8n-seg_pinn_v3',
        inference_ms: 30,
    },
    OBB: {
        class_name: 'OBB',
        confidence: 0.856,
        corrosion_surface_pct: 12.4,
        severity_score: 0.856,
        detection_rate: 0.79,
        total_frames: 70,
        frames_with_detections: 55,
        bbox_norm: [0.28, 0.32, 0.62, 0.62],
        mask_norm: [
            [0.30, 0.36], [0.45, 0.33], [0.60, 0.35],
            [0.61, 0.58], [0.44, 0.61], [0.29, 0.59]
        ],
        model_tag: 'yolov8n-seg_pinn_v3',
        inference_ms: 29,
    },
    none: {
        class_name: 'none',
        confidence: 0.963,
        corrosion_surface_pct: 0.0,
        severity_score: 0.0,
        detection_rate: 0.0,
        total_frames: 90,
        frames_with_detections: 0,
        bbox_norm: [0, 0, 0, 0],
        mask_norm: [],
        model_tag: 'yolov8n-seg_pinn_v3',
        inference_ms: 22,
    },
};

const CLASS_COLORS: Record<string, string> = {
    BX: '#f59e0b', CJ: '#ef4444', CK: '#dc2626',
    OBB: '#8b5cf6', PL: '#f97316', SG: '#ec4899', ZW: '#06b6d4',
    none: '#22c55e',
};

const CLASS_LABELS: Record<string, string> = {
    BX: 'Box Defect', CJ: 'Corrosion Joint', CK: 'Crack',
    OBB: 'Object/Blockage', PL: 'Peeling', SG: 'Surface Gouging',
    ZW: 'Zone Wear', none: 'No Defect',
};

// Pick a deterministic defect class based on segment ID
function getDefectClassForSegment(segmentId: string): string {
    // Segments with higher numbers or certain patterns get specific defects
    const num = parseInt(segmentId.replace(/\D/g, ''), 10) || 0;
    const classes = ['CJ', 'CK', 'PL', 'SG', 'none', 'BX', 'ZW', 'CJ', 'OBB', 'none', 'CK', 'PL'];
    return classes[num % classes.length];
}

/**
 * External Surface Inspection Feed
 * Shows real pipeline inspection photos with YOLOv8-Seg style bounding box
 * and segmentation mask overlays. Mimics actual YOLO inference output.
 */
export default function ExternalSurfaceFeed({ segmentId }: { segmentId: string }) {
    const segments = usePipelineStore(state => state.segments);
    const segment = segments.get(segmentId);
    const cvData = segment?.cv;

    const isRealYolo = cvData?.is_yolo_result === true;

    // Use real YOLO class or fall back to deterministic mock class
    const activeClass = isRealYolo
        ? (cvData?.class_name ?? 'none')
        : getDefectClassForSegment(segmentId);

    const readout = YOLO_MOCK_READOUTS[activeClass] ?? YOLO_MOCK_READOUTS['none'];
    const imgSrc = CLASS_TO_IMAGE[activeClass] ?? CLASS_TO_IMAGE['none'];
    const color = CLASS_COLORS[activeClass] ?? '#ef4444';
    const label = CLASS_LABELS[activeClass] ?? activeClass;
    const hasDefect = activeClass !== 'none';

    // Scanner animation
    const scanLineRef = useRef<HTMLDivElement>(null);
    const scanFrameRef = useRef<number>(0);
    const startRef = useRef<number | null>(null);
    const [scanX, setScanX] = useState(0);

    useEffect(() => {
        const animate = (timestamp: number) => {
            if (!startRef.current) startRef.current = timestamp;
            const elapsed = (timestamp - startRef.current) % 3000;
            setScanX((elapsed / 3000) * 100);
            scanFrameRef.current = requestAnimationFrame(animate);
        };
        scanFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(scanFrameRef.current);
    }, []);

    // Convert bbox_norm to percentage for CSS overlay
    const [bx1, by1, bx2, by2] = readout.bbox_norm;
    const bboxStyle = {
        left: `${bx1 * 100}%`,
        top: `${by1 * 100}%`,
        width: `${(bx2 - bx1) * 100}%`,
        height: `${(by2 - by1) * 100}%`,
    };

    // Convert mask_norm to SVG points (100x100 viewBox)
    const maskPoints = readout.mask_norm
        .map(([x, y]) => `${x * 100},${y * 100}`)
        .join(' ');

    return (
        <div className="relative w-full h-full overflow-hidden bg-black">
            {/* Real pipe inspection photo */}
            <img
                src={imgSrc}
                alt={`Pipeline inspection - ${label}`}
                className="w-full h-full object-cover"
                style={{ filter: 'brightness(0.85) contrast(1.1)' }}
            />

            {/* Dark scan overlay tint */}
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />

            {/* YOLOv8 Segmentation mask (SVG polygon overlay) */}
            {hasDefect && maskPoints && (
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                >
                    <defs>
                        <filter id="yolo-seg-glow">
                            <feGaussianBlur stdDeviation="0.8" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>
                    {/* Filled mask with opacity */}
                    <polygon
                        points={maskPoints}
                        fill={`${color}30`}
                        stroke={color}
                        strokeWidth="0.5"
                        strokeDasharray="2 1"
                        filter="url(#yolo-seg-glow)"
                    />
                </svg>
            )}

            {/* YOLO Bounding Box */}
            {hasDefect && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        ...bboxStyle,
                        border: `2px solid ${color}`,
                        boxShadow: `0 0 8px ${color}66, inset 0 0 4px ${color}11`,
                    }}
                >
                    {/* Class label chip at top-left of bbox */}
                    <div
                        className="absolute -top-5 left-0 flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-sm"
                        style={{ background: color, color: '#000' }}
                    >
                        [{activeClass}] {(readout.confidence * 100).toFixed(0)}%
                    </div>

                    {/* Corner markers */}
                    {[
                        'top-0 left-0 border-t-2 border-l-2',
                        'top-0 right-0 border-t-2 border-r-2',
                        'bottom-0 left-0 border-b-2 border-l-2',
                        'bottom-0 right-0 border-b-2 border-r-2',
                    ].map((cls, i) => (
                        <div
                            key={i}
                            className={`absolute w-3 h-3 ${cls}`}
                            style={{ borderColor: '#fff' }}
                        />
                    ))}
                </div>
            )}

            {/* Animated laser scanner line */}
            <div
                className="absolute top-0 bottom-0 w-0.5 pointer-events-none"
                style={{
                    left: `${scanX}%`,
                    background: 'linear-gradient(to bottom, transparent, #e2e8f0cc, transparent)',
                    boxShadow: '0 0 6px #e2e8f0aa',
                }}
            />

            {/* === HUD Overlays === */}

            {/* Top-left: Camera badge */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 border border-white/10 px-2 py-1 rounded text-[9px] pointer-events-none z-10">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-zinc-200 font-semibold tracking-wider">OPTICAL SCAN</span>
                <span className="text-zinc-500 font-mono">CAM-OUT-01</span>
                <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold"
                    style={{ background: '#0c2233', color: '#22d3ee', border: '1px solid #164e63' }}>
                    YOLOv8-SEG
                </span>
            </div>

            {/* Top-right: model tag */}
            <div className="absolute top-2 right-2 bg-black/70 border border-white/10 px-2 py-1 rounded text-[9px] font-mono text-zinc-400 pointer-events-none z-10">
                {readout.model_tag} · {readout.inference_ms}ms
            </div>

            {/* Bottom-left: Segment ID */}
            <div className="absolute bottom-2 left-2 bg-black/80 border border-white/10 px-2 py-0.5 rounded text-[9px] font-mono text-zinc-400 pointer-events-none z-10">
                SEG: <span className="text-white font-bold">{segmentId}</span>
                <span className="text-zinc-600 ml-1">· OUTER WALL</span>
            </div>

            {/* Bottom-right: Detection summary */}
            <div className="absolute bottom-2 right-2 bg-black/80 border border-white/10 px-2 py-0.5 rounded text-[9px] font-mono pointer-events-none z-10">
                {hasDefect ? (
                    <span className="font-bold" style={{ color }}>
                        {label.toUpperCase()} · {readout.frames_with_detections}/{readout.total_frames} FRM
                    </span>
                ) : (
                    <span className="text-green-400 font-bold">✓ NO DEFECT</span>
                )}
            </div>

            {/* Bottom-center: Confidence bar */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/80 border border-white/10 px-2 py-0.5 rounded text-[9px] font-mono pointer-events-none z-10">
                <span className="text-zinc-400">CONF</span>
                <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full"
                        style={{
                            width: `${readout.confidence * 100}%`,
                            background: hasDefect ? color : '#22c55e',
                        }}
                    />
                </div>
                <span style={{ color: hasDefect ? color : '#22c55e' }}>
                    {(readout.confidence * 100).toFixed(0)}%
                </span>
            </div>
        </div>
    );
}
