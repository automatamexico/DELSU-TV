// src/components/ErrorBoundary.jsx
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Error capturado:", error, info);
    this.setState({ info });
  }

  handleReload = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center bg-black text-white p-6">
          <div className="max-w-xl w-full border border-gray-800 rounded-xl bg-gray-900/60 p-5">
            <h1 className="text-xl font-bold mb-2">Ups, algo se rompió 😅</h1>
            <p className="text-sm opacity-80 mb-4">
              Detectamos un error en la interfaz. Revisa la consola del navegador para detalles.
            </p>
            <pre className="text-xs p-3 rounded bg-black/50 overflow-auto max-h-56 border border-gray-800 mb-4">
              {String(this.state.error)}
            </pre>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-700 transition"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
