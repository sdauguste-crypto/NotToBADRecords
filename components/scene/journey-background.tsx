'use client';

// Public entry point for the WebGL background. Zero props.
// - Probes WebGL support; renders the static CSS fallback when unavailable
//   (and flags <html data-journey-ready="fallback">).
// - Otherwise dynamic-imports the Canvas (ssr: false); the canvas itself sets
//   data-journey-ready="true" after its first rendered frame.

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import JourneyFallback from './journey-fallback';
import { probeWebGL } from './quality';

const JourneyCanvas = dynamic(() => import('./journey-canvas'), {
  ssr: false,
  loading: () => <JourneyFallback />,
});

export default function JourneyBackground() {
  const [status, setStatus] = useState<'pending' | 'webgl' | 'fallback'>(
    'pending',
  );

  useEffect(() => {
    if (probeWebGL()) {
      setStatus('webgl');
    } else {
      document.documentElement.dataset.journeyReady = 'fallback';
      setStatus('fallback');
    }
  }, []);

  return (
    <div className="fixed inset-0 -z-10" aria-hidden="true">
      {status === 'webgl' ? <JourneyCanvas /> : <JourneyFallback />}
    </div>
  );
}
