// src/pages/TestStreamPage.js
import React from 'react';

export default function TestStreamPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-4">
      <h1 className="text-2xl font-bold">Test Page OK</h1>
      <p>Hora: {new Date().toLocaleString()}</p>
      <p>Location: <code>{typeof window !== 'undefined' ? window.location.href : ''}</code></p>
      <p className="opacity-80">
        Si ves esta página, el enrutador funciona. Si tu Home queda en blanco,
        mira el error en la pantalla roja del <strong>ErrorBoundary</strong> o la consola.
      </p>
    </div>
  );
}
