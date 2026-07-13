import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, ShieldCheck, Tag, Info, Package, Laptop, Wrench, GlassWater, Landmark } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { InventoryScan, Detection } from "../../types/inventory";

interface ReportDetailProps {
  scan: InventoryScan;
  onBackToDashboard: () => void;
  onCommitStock: (scanId: string) => void;
  warehouseAssetPath: string; // The generated warehouse image path
}

export default function ReportDetail({ scan, onBackToDashboard, onCommitStock, warehouseAssetPath }: ReportDetailProps) {
  const [isCommitted, setIsCommitted] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Helper to retrieve category-specific icons
  const getItemIcon = (item: string) => {
    switch (item.toLowerCase()) {
      case "cajas":
        return <Package className="h-5 w-5 text-amber-400" />;
      case "botellas":
        return <GlassWater className="h-5 w-5 text-sky-400" />;
      case "laptops":
        return <Laptop className="h-5 w-5 text-indigo-400" />;
      case "herramientas":
        return <Wrench className="h-5 w-5 text-emerald-400" />;
      default:
        return <Tag className="h-5 w-5 text-teal-400" />;
    }
  };

  // Helper to get bounding box style coordinate simulators
  const getSimulatedBoxCoords = (item: string) => {
    switch (item.toLowerCase()) {
      case "cajas":
        return [
          { top: "20%", left: "15%", width: "18%", height: "22%" },
          { top: "18%", left: "38%", width: "20%", height: "25%" },
          { top: "45%", left: "22%", width: "16%", height: "20%" },
        ];
      case "botellas":
        return [
          { top: "12%", left: "68%", width: "8%", height: "14%" },
          { top: "12%", left: "78%", width: "8%", height: "14%" },
        ];
      case "laptops":
        return [
          { top: "42%", left: "55%", width: "14%", height: "18%" },
        ];
      case "herramientas":
        return [
          { top: "68%", left: "48%", width: "12%", height: "15%" },
          { top: "72%", left: "70%", width: "10%", height: "14%" },
        ];
      default:
        return [{ top: "35%", left: "35%", width: "30%", height: "30%" }];
    }
  };

  const handleCommit = () => {
    setIsCommitted(true);
    onCommitStock(scan.id);
  };

  const imageSrc = scan.urlImagen === "mock_warehouse_asset" ? warehouseAssetPath : scan.urlImagen;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 pb-24" id={`report-detail-${scan.id}`}>
      {/* Toast Notification for Stock Commitment */}
      <AnimatePresence>
        {isCommitted && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-3 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-6 py-4 text-emerald-100 shadow-2xl glow-teal backdrop-blur-md"
            id="success-toast"
          >
            <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0 animate-bounce" />
            <div>
              <p className="font-semibold text-sm">Stock Comprometido con Éxito</p>
              <p className="text-xs text-emerald-300/80 font-mono">ID {scan.id} registrado en el inventario maestro.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header and Back Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 pb-2 border-b border-slate-800/60">
        <div>
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center space-x-2 text-slate-400 hover:text-white text-xs font-mono tracking-wider uppercase mb-3 transition-colors group"
            id="back-to-dashboard-btn"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span>[←] Volver al Panel</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-white">
              Reporte de Auditoría Visual
            </h1>
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full border border-teal-500/30 bg-teal-950/40 text-teal-400">
              {scan.id}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 bg-slate-950/45 px-4 py-2.5 rounded-xl border border-slate-800/60 font-mono text-xs">
          <div>
            <span className="text-slate-500 block">FECHA DE AUDITORÍA</span>
            <span className="text-slate-300 font-semibold">{scan.fecha}</span>
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <div>
            <span className="text-slate-500 block">SISTEMA</span>
            <span className="text-teal-400 font-semibold uppercase flex items-center space-x-1">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              YOLOv8 Live
            </span>
          </div>
        </div>
      </div>

      {/* Main 50/50 Split Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Image Container */}
        <div className="space-y-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 block font-semibold">
            CAPTURAS DE RECONOCIMIENTO VISUAL (YOLO DETECTS)
          </span>

          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/60 p-1.5 shadow-2xl backdrop-blur-md glow-blue group">
            
            {/* Visual Glass frame background glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-transparent to-slate-950 pointer-events-none" />

            <div className="relative w-full h-full rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
              <img
                src={imageSrc}
                alt="Audited Warehouse Zone"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                referrerPolicy="no-referrer"
                id="audited-image"
              />

              {/* Real-time Bounding Box Overlays Simulated */}
              {scan.detecciones.map((detection) => {
                const isHovered = hoveredItem === detection.item.toLowerCase();
                const coords = getSimulatedBoxCoords(detection.item);
                
                return coords.map((box, idx) => (
                  <motion.div
                    key={`${detection.item}-${idx}`}
                    initial={{ opacity: 0.75 }}
                    animate={{ 
                      opacity: hoveredItem === null ? 0.75 : isHovered ? 1 : 0.15,
                      scale: isHovered ? 1.03 : 1
                    }}
                    style={{
                      position: "absolute",
                      top: box.top,
                      left: box.left,
                      width: box.width,
                      height: box.height,
                    }}
                    className={`border-2 rounded transition-all duration-300 flex items-start p-1 pointer-events-none ${
                      detection.item.toLowerCase() === "cajas" 
                        ? "border-amber-400 bg-amber-400/5" 
                        : detection.item.toLowerCase() === "botellas" 
                        ? "border-sky-400 bg-sky-400/5"
                        : detection.item.toLowerCase() === "laptops"
                        ? "border-indigo-400 bg-indigo-400/5"
                        : "border-emerald-400 bg-emerald-400/5"
                    }`}
                  >
                    <span className={`font-mono text-[8px] font-bold px-1 py-0.5 rounded uppercase ${
                      detection.item.toLowerCase() === "cajas" 
                        ? "bg-amber-400 text-slate-950" 
                        : detection.item.toLowerCase() === "botellas" 
                        ? "bg-sky-400 text-slate-950"
                        : detection.item.toLowerCase() === "laptops"
                        ? "bg-indigo-400 text-slate-950"
                        : "bg-emerald-400 text-slate-950"
                    }`}>
                      {detection.item}
                    </span>
                  </motion.div>
                ));
              })}

              {/* Subtle tech crosshair HUD overlays */}
              <div className="absolute inset-4 border border-slate-700/10 pointer-events-none rounded">
                <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-slate-500/20" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-slate-500/20" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-slate-500/20" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-slate-500/20" />
              </div>
            </div>
          </div>

          {/* AI Warehouse Summary description */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-4 backdrop-blur-md flex items-start space-x-3">
            <Info className="h-5 w-5 text-teal-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-teal-400 font-bold uppercase tracking-wider">Interpretación del Modelo</span>
              <p className="text-sm text-slate-300 leading-relaxed">
                {scan.warehouseSummary}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Vision Counts Table */}
        <div className="space-y-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 block font-semibold">
            DESGLOSE CUANTITATIVO (YOLO QUANTITIES)
          </span>

          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <h3 className="font-serif text-xl font-medium text-white mb-4">
              Objetos Contabilizados por IA
            </h3>

            {/* Custom Table styling */}
            <div className="overflow-hidden border border-slate-800/80 rounded-xl bg-slate-950/30">
              <table className="w-full text-left border-collapse" id="detections-table">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-950/60 font-mono text-xs text-slate-400">
                    <th className="py-3.5 px-4 font-semibold uppercase">Categoría</th>
                    <th className="py-3.5 px-4 font-semibold uppercase">Ícono</th>
                    <th className="py-3.5 px-4 font-semibold text-right uppercase">Conteo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-sm font-sans">
                  {scan.detecciones.map((detection) => {
                    const itemName = detection.item.toLowerCase();
                    const isHovered = hoveredItem === itemName;

                    return (
                      <tr
                        key={detection.item}
                        onMouseEnter={() => setHoveredItem(itemName)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`transition-all duration-200 cursor-pointer ${
                          isHovered 
                            ? "bg-slate-850/60 text-white" 
                            : "text-slate-300 hover:bg-slate-900/30"
                        }`}
                      >
                        <td className="py-4 px-4 font-semibold capitalize flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${
                            itemName === "cajas" 
                              ? "bg-amber-400" 
                              : itemName === "botellas" 
                              ? "bg-sky-400"
                              : itemName === "laptops"
                              ? "bg-indigo-400"
                              : "bg-emerald-400"
                          }`} />
                          <span>{detection.item}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            {getItemIcon(detection.item)}
                            <span className="font-mono text-xs text-slate-500">
                              YOLO_{detection.item.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-base text-white">
                          <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-850">
                            {detection.cantidad}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total items tally badge */}
            <div className="mt-6 flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/50">
              <div className="flex items-center space-x-3">
                <div className="rounded-lg bg-teal-950 p-2 text-teal-400 border border-teal-500/20">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-200">Total Unidades Detectadas</h4>
                  <p className="text-xs text-slate-500">Conteo agregado de todos los bounding boxes</p>
                </div>
              </div>
              <span className="font-mono text-2xl font-bold text-teal-400">
                {scan.detecciones.reduce((acc, curr) => acc + curr.cantidad, 0)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Actions Container - Full Width Sticky Bottom styled */}
      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold text-slate-200">¿Desea comprometer este reporte al inventario maestro?</p>
          <p className="text-xs text-slate-400">Esto actualizará las métricas globales del almacén y registrará la transacción.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <button
            onClick={onBackToDashboard}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-800 bg-slate-950/40 text-sm font-semibold text-slate-400 transition-all hover:bg-slate-950 hover:text-slate-200 text-center"
            id="footer-back-btn"
          >
            [←] Volver al Panel
          </button>
          
          <button
            onClick={handleCommit}
            disabled={isCommitted}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-center flex items-center justify-center space-x-2 transition-all ${
              isCommitted
                ? "bg-slate-800 text-slate-500 border border-slate-750 cursor-not-allowed"
                : "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/10 hover:bg-teal-400 hover:scale-[1.02]"
            }`}
            id="commit-stock-btn"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isCommitted ? "Stock Comprometido" : "Confirmar y Comprometer Stock"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
