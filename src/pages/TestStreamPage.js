// src/pages/TestStreamPage.js
import React from 'react';
import VideoPlayer from '../components/VideoPlayer';

export default function TestStreamPage() {
  // TU URL ORIGINAL (la misma que guardas en Supabase)
  const raw = 'https://2-fss-2.streamhoster.com/pl_118/206854-6567938-1/chunklist.m3u8';

  return (
    <div className="min-h-screen bg-black text-white p-4 space-y-4">
      <h1 className="text-xl font-bold">Test HLS</h1>

      <div className="text-sm">
        <div className="opacity-80">URL original:</div>
        <code className="break-all">{raw}</code>
      </div>

      <VideoPlayer src={raw} debug />

      <div className="text-sm">
        <a
          className="underline"
          href={`/hls/https/2-fss-2.streamhoster.com/pl_118/206854-6567938-1/chunklist.m3u8`}
          target="_blank"
          rel="noreferrer"
        >
          Abrir playlist vía proxy en nueva pestaña
        </a>
      </div>
    </div>
  );
}
