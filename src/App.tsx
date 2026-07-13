import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Cpu, 
  Layers, 
  Activity, 
  AlertTriangle, 
  Calendar, 
  ArrowRight, 
  Search, 
  Package, 
  ShieldCheck, 
  Sparkles,
  CheckCircle,
  Database,
  ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MOCK_SCANS, InventoryScan } from "./types/inventory";
import UploadScanModal from "./components/inventory/upload-modal";
import ReportDetail from "./components/inventory/report-detail";

// Import our beautiful custom generated image
import mockWarehouseImg from "./assets/images/mock_warehouse_1783951947353.jpg";

export default function App() {
  const [scans, setScans] = useState<InventoryScan[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("smartinventory_scans");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to load scans from localStorage:", e);
        }
      }
    }
    return MOCK_SCANS;
  });
  
  const [activeRoute, setActiveRoute] = useState<{ path: "dashboard" | "report"; id?: string }>({
    path: "dashboard"
  });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [committedScans, setCommittedScans] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("smartinventory_committed");
      if (saved) {
        try {
          return new Set(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load committed scans from localStorage:", e);
        }
      }
    }
    return new Set(["scan-001"]);
  });

  // Synchronize scans list with localStorage
  React.useEffect(() => {
    localStorage.setItem("smartinventory_scans", JSON.stringify(scans));
  }, [scans]);

  // Synchronize committed scans set with localStorage
  React.useEffect(() => {
    localStorage.setItem("smartinventory_committed", JSON.stringify(Array.from(committedScans)));
  }, [committedScans]);

  // Filter scans chronologically (newest first)
  const filteredScans = useMemo(() => {
    return scans.filter(scan => {
      const matchQuery = scan.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         scan.warehouseSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         scan.detecciones.some(d => d.item.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchQuery;
    });
  }, [scans, searchQuery]);

  // Calculate high-fidelity real-time metrics
  const totalItemsStored = useMemo(() => {
    // Only sum committed scans to simulate stock commit workflow
    let total = 0;
    scans.forEach(scan => {
      if (committedScans.has(scan.id)) {
        total += scan.detecciones.reduce((acc, curr) => acc + curr.cantidad, 0);
      }
    });
    return total;
  }, [scans, committedScans]);

  const activeAlertsCount = useMemo(() => {
    // Alert triggers if a scan has > 25 "cajas" (heavy stack warning) or high density
    let alerts = 0;
    scans.forEach(scan => {
      const cajasCount = scan.detecciones.find(d => d.item.toLowerCase() === "cajas")?.cantidad || 0;
      if (cajasCount > 25) {
        alerts += 1;
      }
    });
    return alerts;
  }, [scans]);

  const activeScan = useMemo(() => {
    if (activeRoute.path === "report" && activeRoute.id) {
      return scans.find(s => s.id === activeRoute.id) || scans[0];
    }
    return null;
  }, [activeRoute, scans]);

  const handleScanCreated = (newScan: InventoryScan) => {
    setScans(prev => [newScan, ...prev]);
    setIsUploadModalOpen(false);
    // Automatically transition route to details view for the new scan
    setActiveRoute({ path: "report", id: newScan.id });
  };

  const handleCommitStock = async (scanId: string) => {
    const scanToCommit = scans.find(s => s.id === scanId);
    if (!scanToCommit) return;

    // Vuelve a la lógica original: solo actualiza el estado en el frontend.
    setCommittedScans(prev => new Set(prev).add(scanId));
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans relative overflow-x-hidden antialiased selection:bg-teal-500/30 selection:text-teal-200">
      
      {/* Premium Glassmorphism Background Glow Textures */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] rounded-full bg-sky-500/5 blur-[150px] pointer-events-none" />
      
      {/* Decorative Technical Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Main Container */}
      <div className="relative flex flex-col min-h-screen">
        
        {/* Navigation Bar */}
        <nav className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-slate-800 bg-slate-950/50 sticky top-0 z-40 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <div 
              onClick={() => setActiveRoute({ path: "dashboard" })}
              className="flex items-center space-x-3 cursor-pointer group"
              id="app-branding"
            >
              <div className="w-8 h-8 bg-cyan-600 rounded flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
                <div className="w-4 h-4 border-2 border-white"></div>
              </div>
              <div>
                <span className="font-serif text-xl font-bold tracking-tight text-slate-100 block">SmartInventory</span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500 block">YOLOv8 Vision Core</span>
              </div>
            </div>

            {/* Custom geometric navigation links */}
            <div className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span 
                onClick={() => setActiveRoute({ path: "dashboard" })}
                className={`cursor-pointer transition-colors hover:text-slate-100 py-5 border-b-2 ${activeRoute.path === "dashboard" ? "text-cyan-400 border-cyan-400" : "border-transparent"}`}
              >
                Dashboard
              </span>
              <span className="cursor-not-allowed opacity-40 hover:text-slate-300 transition-colors">Inventory</span>
              <span className="cursor-not-allowed opacity-40 hover:text-slate-300 transition-colors">Audit Reports</span>
              <span className="cursor-not-allowed opacity-40 hover:text-slate-300 transition-colors">Settings</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors shadow-lg shadow-cyan-950 flex items-center space-x-1"
              id="new-scan-trigger-btn"
            >
              <Plus className="h-4 w-4" />
              <span>[+] New Visual Scan</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-850 border border-slate-700/60 hidden sm:block"></div>
          </div>
        </nav>

        {/* View Switcher Container */}
        <main className="flex-grow py-8 px-4 md:px-8">
          <AnimatePresence mode="wait">
            {activeRoute.path === "dashboard" ? (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-8 max-w-7xl mx-auto"
                id="dashboard-container"
              >
                {/* Hero / Header greeting info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-3xl font-medium tracking-tight text-white">
                      Panel de Monitoreo
                    </h2>
                    <p className="text-sm text-slate-400">
                      Gestione y supervise existencias físicas en tiempo real mediante análisis fotográfico con Inteligencia Artificial.
                    </p>
                  </div>
                  
                  {/* Search query box */}
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Buscar por item, ID o resumen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                      id="search-scans-input"
                    />
                  </div>
                </div>

                {/* Top Section: 3-Column Metric Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="metrics-grid">
                  
                  {/* Metric 1: Total Items Stored */}
                  <div className="glass p-6 rounded-xl flex flex-col justify-between teal-glow relative overflow-hidden transition-all duration-300 hover:scale-[1.01]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between mb-4">
                      <div className="rounded-xl bg-teal-950 p-2.5 text-teal-400 border border-teal-500/20">
                        <Package className="h-6 w-6" />
                      </div>
                      <span className="font-mono text-[10px] uppercase text-teal-500 font-bold bg-teal-950/40 px-2 py-0.5 rounded border border-teal-500/20">
                        STOCK ACTIVO
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 block uppercase tracking-widest font-semibold">Total Items Stored</span>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <span className="text-4xl font-extrabold font-sans text-white tracking-tight">
                        {totalItemsStored.toLocaleString()}
                      </span>
                      <span className="text-xs text-emerald-400 font-medium flex items-center">
                        <ArrowUpRight className="h-3 w-3 mr-0.5" />
                        Committed
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono">
                      Sumatoria de auditorías validadas y comprometidas
                    </p>
                  </div>

                  {/* Metric 2: Scans Completed */}
                  <div className="glass p-6 rounded-xl flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:scale-[1.01]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between mb-4">
                      <div className="rounded-xl bg-sky-950 p-2.5 text-sky-400 border border-sky-500/20">
                        <Layers className="h-6 w-6" />
                      </div>
                      <span className="font-mono text-[10px] uppercase text-sky-500 font-bold bg-sky-950/40 px-2 py-0.5 rounded border border-sky-500/20">
                        TOTAL SCANS
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 block uppercase tracking-widest font-semibold">Scans Completed</span>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <span className="text-4xl font-extrabold font-sans text-white tracking-tight">
                        {scans.length}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">histórico</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono">
                      Auditorías por detección YOLOv8 registradas
                    </p>
                  </div>

                  {/* Metric 3: Active Alerts */}
                  <div className="glass p-6 rounded-xl flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:scale-[1.01]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between mb-4">
                      <div className="rounded-xl bg-amber-950 p-2.5 text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="h-6 w-6 animate-pulse" />
                      </div>
                      <span className="font-mono text-[10px] uppercase text-amber-500 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                        ALERTA DE SEGURIDAD
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 block uppercase tracking-widest font-semibold">Active Alerts</span>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <span className="text-4xl font-extrabold font-sans text-amber-400 tracking-tight">
                        {activeAlertsCount.toString().padStart(2, '0')}
                      </span>
                      <span className="text-xs text-amber-500 font-medium bg-amber-950/30 px-2 py-0.5 rounded-full">
                        Alta Densidad
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 font-mono">
                      Estanterías zona norte superan límite recomendado (&gt;25)
                    </p>
                  </div>

                </div>

                {/* Center Section: Chronological Data Table listing past audits */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4.5 w-4.5 text-teal-400" />
                      <span className="font-mono text-xs uppercase tracking-widest text-slate-400 font-bold">Bitácora de Auditorías Visuales</span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">Mostrando {filteredScans.length} registros</span>
                  </div>

                  <div className="glass rounded-2xl overflow-hidden flex flex-col teal-glow">
                    <table className="w-full text-left border-collapse" id="audits-log-table">
                      <thead>
                        <tr className="border-b border-slate-850 bg-slate-900/40 font-mono text-xs text-slate-400">
                          <th className="py-4 px-6 font-semibold uppercase">ID Auditoría</th>
                          <th className="py-4 px-6 font-semibold uppercase">Fecha</th>
                          <th className="py-4 px-6 font-semibold uppercase">Conteo de Objetos</th>
                          <th className="py-4 px-6 font-semibold uppercase">Estado Inventario</th>
                          <th className="py-4 px-6 font-semibold uppercase">Resumen de Escaneo</th>
                          <th className="py-4 px-6 font-semibold text-right uppercase">Análisis</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/60 text-sm">
                        {filteredScans.length > 0 ? (
                          filteredScans.map((scan) => {
                            const isCommitted = committedScans.has(scan.id);

                            return (
                              <tr 
                                key={scan.id}
                                onClick={() => setActiveRoute({ path: "report", id: scan.id })}
                                className="hover:bg-slate-800/20 transition-colors cursor-pointer group"
                              >
                                <td className="py-5 px-6 font-mono font-bold text-white group-hover:text-teal-400 transition-colors">
                                  {scan.id}
                                </td>
                                <td className="py-5 px-6 text-slate-300 font-mono text-xs">
                                  <div className="flex items-center space-x-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                    <span>{scan.fecha}</span>
                                  </div>
                                </td>
                                <td className="py-5 px-6">
                                  <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                                    {scan.detecciones.map((d, index) => (
                                      <span 
                                        key={index} 
                                        className="font-mono text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-850 text-slate-300"
                                      >
                                        {d.cantidad} <span className="text-slate-500">{d.item}</span>
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-5 px-6">
                                  {isCommitted ? (
                                    <span className="inline-flex items-center space-x-1 font-mono text-[10px] font-semibold text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded border border-teal-500/20">
                                      <CheckCircle className="h-3 w-3" />
                                      <span>COMPROMETIDO</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center space-x-1 font-mono text-[10px] font-semibold text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-500/20">
                                      <Database className="h-3 w-3 animate-pulse" />
                                      <span>PENDIENTE</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-5 px-6 text-slate-400 text-xs max-w-xs truncate font-sans">
                                  {scan.warehouseSummary}
                                </td>
                                <td className="py-5 px-6 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveRoute({ path: "report", id: scan.id });
                                    }}
                                    className="inline-flex items-center space-x-1.5 text-xs font-mono text-teal-400 hover:text-teal-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80 group-hover:border-teal-500/40 group-hover:bg-slate-900/50 transition-all"
                                  >
                                    <span>Ver</span>
                                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-500 font-mono text-sm">
                              No se encontraron registros de auditoría que coincidan con la búsqueda.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Additional Quick Onboarding Info Card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-sky-500 to-indigo-500" />
                  <div className="space-y-1">
                    <h4 className="font-serif text-lg font-medium text-white flex items-center space-x-2">
                      <Sparkles className="h-4.5 w-4.5 text-teal-400 animate-pulse" />
                      <span>¿Cómo funciona el flujo de SmartInventory?</span>
                    </h4>
                    <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                      El sistema le permite cargar fotos de sus racks, procesarlas con un detector <strong>Ultralytics YOLO</strong> simulado que reconoce mercancía y, tras verificar la precisión de las detecciones, comprometer el conteo al stock central para actualizar las métricas dinámicas de su almacén.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex-shrink-0 inline-flex items-center space-x-2 rounded-xl bg-slate-900 border border-slate-800 px-5 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-850 hover:text-white hover:border-slate-700 transition-colors"
                  >
                    <span>Probar Simulador</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="report-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                {activeScan && (
                  <ReportDetail
                    scan={activeScan}
                    warehouseAssetPath={mockWarehouseImg}
                    onBackToDashboard={() => setActiveRoute({ path: "dashboard" })}
                    onCommitStock={handleCommitStock}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer Status Bar */}
        <footer className="h-10 px-8 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest font-mono">
          <div className="flex gap-6">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              SYSTEM: OPTIMAL
            </span>
            <span>LATENCY: 12ms</span>
          </div>
          <div className="flex gap-6">
            <span>V1.0.4-BETA</span>
            <span className="text-teal-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse"></span>
              MODEL LOADED
            </span>
          </div>
        </footer>

        {/* Dialog Modal for YOLO scan uploads */}
        <AnimatePresence>
          {isUploadModalOpen && (
            <UploadScanModal
              isOpen={isUploadModalOpen}
              onClose={() => setIsUploadModalOpen(false)}
              onScanCreated={handleScanCreated}
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
