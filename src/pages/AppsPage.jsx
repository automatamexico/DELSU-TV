// src/pages/AppsPage.jsx
import React, { useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Link } from "react-router-dom";

export default function AppsPage() {
  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/apps`;
  }, []);

  // Ajusta estas rutas a tus assets reales
  const logoTop = "/logo-delsu.png";      // o el que uses arriba
  const hispanaLogo = "/hispanatv-logo.png";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex flex-col items-center text-center">
          {/* Imagen superior */}
          <div className="rounded-2xl overflow-hidden shadow-md bg-white">
            <img
              src={logoTop}
              alt="HispanaTV Apps"
              className="h-28 sm:h-32 w-auto object-contain p-3"
              loading="lazy"
              decoding="async"
            />
          </div>

          <h1 className="mt-8 text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            HISPANATV
          </h1>

          <p className="mt-4 text-gray-600 text-base sm:text-lg max-w-xl">
            Descarga las apps Android de nuestros canales.
          </p>

          {/* Botón */}
          <div className="mt-8">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full px-8 py-3 bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition shadow"
            >
              ⬇️ Descargar App
            </Link>

            <div className="mt-2 text-sm text-gray-500">(Android APK)</div>
          </div>

          {/* QR */}
          <div className="mt-10 text-gray-700">
            <div className="text-base font-semibold">O escanea el código QR:</div>

            <div className="mt-4 inline-flex items-center justify-center bg-white p-5 rounded-2xl shadow">
              <QRCodeCanvas value={pageUrl} size={180} includeMargin />
            </div>

            <div className="mt-3 text-xs text-gray-500 break-all">{pageUrl}</div>
          </div>

          {/* Footer */}
          <div className="mt-12 flex flex-col items-center">
            <img
              src={hispanaLogo}
              alt="HispanaTV"
              className="h-10 w-auto object-contain"
              loading="lazy"
              decoding="async"
            />
            <div className="mt-2 text-sm text-gray-600">Desarrollado por</div>
          </div>
        </div>
      </div>
    </div>
  );
}
