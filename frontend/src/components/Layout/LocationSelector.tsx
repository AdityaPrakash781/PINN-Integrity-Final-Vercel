import { useState, useRef, useEffect } from 'react';
import { usePipelineStore } from '../../store/usePipelineStore';
import { LOCATIONS } from '../../utils/locations';
import type { LocationConfig } from '../../utils/locations';

const LOCATION_LIST = Object.values(LOCATIONS) as LocationConfig[];

/**
 * Dropdown selector for switching between pipeline locations.
 * Switching clears the segment store → App.tsx re-fetches for the new location.
 */
export default function LocationSelector() {
    const locationId  = usePipelineStore(s => s.locationId);
    const setLocation = usePipelineStore(s => s.setLocation);
    const current     = LOCATIONS[locationId];

    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (id: LocationConfig['id']) => {
        if (id !== locationId) setLocation(id);
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative">
            {/* Trigger button */}
            <button
                type="button"
                id="location-selector-btn"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium
                           transition-colors hover:bg-surface-sunken"
                style={{ borderColor: 'var(--color-line)', background: 'var(--color-surface)' }}
            >
                {/* Coloured dot */}
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: current.accentColor }} />

                <span className="text-ink max-w-[140px] truncate hidden sm:block">
                    {current.label}
                </span>
                <span className="text-ink sm:hidden">{current.id.toUpperCase()}</span>

                {/* Chevron */}
                <svg
                    className={`w-3 h-3 text-ink-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown panel */}
            {open && (
                <div
                    className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl border shadow-xl overflow-hidden"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-line)' }}
                >
                    <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: 'var(--color-line)' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                            Select Pipeline Location
                        </p>
                    </div>

                    {LOCATION_LIST.map(loc => {
                        const isActive = loc.id === locationId;
                        return (
                            <button
                                key={loc.id}
                                type="button"
                                id={`location-option-${loc.id}`}
                                onClick={() => handleSelect(loc.id)}
                                className="w-full text-left px-3 py-3 flex items-start gap-3
                                           transition-colors hover:bg-surface-sunken"
                                style={{ background: isActive ? 'var(--color-surface-sunken)' : undefined }}
                            >
                                {/* Accent bar */}
                                <span
                                    className="shrink-0 mt-1 w-2.5 h-2.5 rounded-full"
                                    style={{ background: loc.accentColor }}
                                />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-ink truncate">
                                            {loc.label}
                                        </span>
                                        {isActive && (
                                            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded"
                                                style={{ background: loc.accentColor + '22', color: loc.accentColor }}>
                                                ACTIVE
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-ink-muted mt-0.5">{loc.sublabel}</p>

                                    {/* Metadata row */}
                                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                        {[
                                            { k: 'Pipeline', v: loc.pipelineName },
                                            { k: 'Material', v: loc.material },
                                            { k: 'Ø', v: `${loc.diameterIn}"` },
                                            { k: 'Pressure', v: `${loc.pressureBar} bar` },
                                            { k: 'Installed', v: String(loc.installYear) },
                                            { k: 'Segments', v: String(loc.segmentCount) },
                                        ].map(({ k, v }) => (
                                            <span key={k} className="text-[9px] font-mono text-ink-muted">
                                                <span className="text-ink-soft">{k}:</span> {v}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Checkmark */}
                                {isActive && (
                                    <svg className="shrink-0 w-4 h-4 mt-0.5" style={{ color: loc.accentColor }}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                            d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
