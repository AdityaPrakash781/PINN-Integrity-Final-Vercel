import { useEffect, useState } from 'react';
import DashboardLayout from './components/Layout/DashboardLayout';
import { usePipelineStore } from './store/usePipelineStore';
import { generateSegmentsFromBenchmarks } from './utils/generateSegments';
import { LOCATIONS } from './utils/locations';
import './index.css';

// ── Optional live backend (set VITE_API_URL in .env to enable) ────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? '';
const WS_URL   = import.meta.env.VITE_WS_URL  ?? '';

function tryConnectWebSocket(setWSConnected: (v: boolean) => void) {
    if (!WS_URL) return;
    try {
        const ws = new WebSocket(WS_URL);
        ws.onopen  = () => setWSConnected(true);
        ws.onclose = () => setWSConnected(false);
        ws.onerror = () => { /* silently ignore */ };
        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                const store = usePipelineStore.getState();
                if (msg.type === 'segment_update' && msg.data?.segment_id)
                    store.updateSegment(msg.data.segment_id, msg.data);
                else if (msg.type === 'cv_detection' && msg.data?.segment_id)
                    store.updateCV(msg.data);
                else if (msg.type === 'initial_data' && Array.isArray(msg.data))
                    store.setSegments(msg.data);
            } catch { /* ignore */ }
        };
    } catch { /* ignore */ }
}

function App() {
    const setSegments    = usePipelineStore(s => s.setSegments);
    const setWSConnected = usePipelineStore(s => s.setWSConnected);
    const locationId     = usePipelineStore(s => s.locationId);
    const segments       = usePipelineStore(s => s.segments);

    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    // ── Reload segments whenever locationId changes ───────────────────────────
    useEffect(() => {
        // If we already have segments for this location, skip (store was cleared on switch)
        if (segments.size > 0) return;

        setLoading(true);
        setError(null);

        const loc = LOCATIONS[locationId];

        (async () => {
            try {
                // 1. Try live backend first (if VITE_API_URL is set)
                if (API_BASE) {
                    const res = await fetch(`${API_BASE}/api/segments`);
                    if (res.ok) {
                        const data = await res.json();
                        setSegments(data);
                        setLoading(false);
                        return;
                    }
                }
                // 2. Fall back to static benchmarks.json (Vercel / offline)
                const data = await generateSegmentsFromBenchmarks(loc);
                setSegments(data);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to load pipeline data');
            } finally {
                setLoading(false);
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationId, segments.size]);

    // ── Optional real-time WebSocket ─────────────────────────────────────────
    useEffect(() => {
        tryConnectWebSocket(setWSConnected);
    }, [setWSConnected]);

    // ── Loading screen ───────────────────────────────────────────────────────
    if (loading) {
        const loc = LOCATIONS[locationId];
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a0e1a]">
                <div className="mb-6 relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-cyan-500/10 border-b-cyan-400 animate-spin"
                        style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
                </div>
                <p className="text-zinc-300 font-semibold tracking-widest text-sm uppercase">
                    Loading Pipeline Data
                </p>
                <p className="text-zinc-500 text-xs mt-2 font-mono">{loc.label}</p>
            </div>
        );
    }

    // ── Error screen ─────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a0e1a]">
                <div className="text-red-400 text-5xl mb-4">⚠</div>
                <p className="text-zinc-200 font-semibold text-lg mb-2">Failed to Load Pipeline Data</p>
                <p className="text-zinc-500 text-sm font-mono max-w-md text-center">{error}</p>
            </div>
        );
    }

    return <DashboardLayout />;
}

export default App;
