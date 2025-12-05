
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset() {
    // Clear potentially corrupted settings
    try {
        localStorage.removeItem('sata_system_settings');
    } catch (e) {
        console.warn("Could not clear localStorage", e);
    }
    // Force reload
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white p-6">
          <div className="bg-[#1e293b] p-8 rounded-lg shadow-xl max-w-md w-full border border-red-500/50">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Algo salió mal</h1>
            <p className="text-slate-300 mb-6">
              La aplicación ha encontrado un error crítico. Esto puede deberse a una configuración inválida de la base de datos o un error de red.
            </p>
            
            <div className="bg-slate-900 p-4 rounded text-xs font-mono text-red-300 mb-6 overflow-auto max-h-40">
                {this.state.error?.message || "Error desconocido"}
            </div>

            <button
              onClick={this.handleReset}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Borrar Configuración y Recargar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
