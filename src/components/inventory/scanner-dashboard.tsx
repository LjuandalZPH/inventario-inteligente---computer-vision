import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { 
  UploadCloud, 
  RefreshCw, 
  Package, 
  Laptop, 
  Wrench, 
  GlassWater, 
  AlertTriangle, 
  CheckCircle, 
  ShieldCheck, 
  ArrowRight, 
  X, 
  Layers, 
  Clock, 
  Database,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- STRICT TYPESCRIPT INTERFACES ---

export type AllowedItemType = 'cajas' | 'botellas' | 'laptops' | 'herramientas';

export interface InventoryItem {
  item: AllowedItemType;
  cantidad: number;
}

export interface ScanReport {
  id: string;
  fecha: string;
  urlImagen: string;
  detecciones: InventoryItem[];
  warehouseSummary: string;
  confirmado: boolean;
}

interface ScannerDashboardProps {
  onScanRegistered?: (report: ScanReport) => void;
}

// Map categories to modern styling properties
const CATEGORY_CONFIGS: Record<AllowedItemType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  emoji: string;
  defaultConfidence: number; // For visual completeness of requirement
}> = {
  cajas: {
    label: "Cajas",
    icon: Package,
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-950/30",
    borderColor: "border-amber-500/25",
    textColor: "text-amber-400",
    emoji: "📦",
    defaultConfidence: 94.8,
  },
  botellas: {
    label: "Botellas",
    icon: GlassWater,
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-blue-950/30",
    borderColor: "border-blue-500/25",
    textColor: "text-blue-400",
    emoji: "🍼",
    defaultConfidence: 96.2,
  },
  laptops: {
    label: "Laptops",
    icon: Laptop,
    color: "from-purple-500 to-indigo-600",
    bgColor: "bg-purple-950/30",
    borderColor: "border-purple-500/25",
    textColor: "text-purple-400",
    emoji: "💻",
    defaultConfidence: 98.5,
  },
  herramientas: {
    label: "Herramientas",
    icon: Wrench,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-950/30",
    borderColor: "border-emerald-500/25",
    textColor: "text-emerald-400",
    emoji: "🔧",
    defaultConfidence: 92.1,
  }
};

export default function ScannerDashboard({ onScanRegistered }: ScannerDashboardProps) {
  // UI States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  
  // API & ML Pipeline States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [scanReport, setScanReport] = useState<ScanReport | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CLIENT-SIDE VALIDATION & INGESTION ---

  const validateAndSetFile = (file: File) => {
    setErrorText(null);
    if (!file.type.startsWith("image/")) {
      setErrorText("Tipo de archivo no válido. Por favor cargue una imagen (.png, .jpeg, .jpg).");
      return;
    }
    
    // Limit file size to 8MB
    if (file.size > 8 * 1024 * 1024) {
      setErrorText("El archivo supera el límite de 8MB.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setScanReport(null); // Clear previous results on new upload
    setIsOfflineMode(false);
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setScanReport(null);
    setIsOfflineMode(false);
    setErrorText(null);
    setIsConfirmed(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --- API INTERACTION (POST /api/scan) ---

  const triggerVisualScan = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setIsConfirmed(false);
    setErrorText(null);
    setStatusMessage("Inicializando contenedor sandboxed de inferencia...");
    
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // Step simulation message sequence for professional UX
      const statusSteps = [
        "Invocando worker de inferencia Python 3.10...",
        "Analizando imagen con pesos optimizados YOLOv8...",
        "Compilando y mapeando detecciones..."
      ];
      
      let stepIndex = 0;
      const statusInterval = setInterval(() => {
        if (stepIndex < statusSteps.length) {
          setStatusMessage(statusSteps[stepIndex]);
          stepIndex++;
        }
      }, 1000);

      const response = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });

      clearInterval(statusInterval);

      if (!response.ok) {
        throw new Error(`Error en el servidor: Código de respuesta ${response.status}`);
      }

      const rawData = await response.json();

      // Check if response returned the fallback array payload or a single ScanReport
      if (Array.isArray(rawData)) {
        // Fallback contingency mode triggered
        setIsOfflineMode(true);
        if (rawData.length > 0) {
          setScanReport(rawData[0]); // Load the first mock scan report
          if (onScanRegistered) onScanRegistered(rawData[0]);
        } else {
          throw new Error("El dataset de contingencia fallback está vacío.");
        }
      } else {
        // Successful YOLOv8 cloud inference mapping
        setIsOfflineMode(false);
        setScanReport(rawData);
        if (onScanRegistered) onScanRegistered(rawData);
      }

    } catch (err: any) {
      console.error("Inference execution failed:", err);
      setErrorText(err.message || "No se pudo establecer conexión con el pipeline de inferencia.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleConfirmState = () => {
    if (!scanReport) return;
    const nextState = !isConfirmed;
    setIsConfirmed(nextState);
    
    // Propagate modified report configuration
    if (onScanRegistered) {
      onScanRegistered({
        ...scanReport,
        confirmado: nextState
      });
    }
  };

  // Pre-calculate statistics
  const totalCount = scanReport?.detecciones.reduce((acc, curr) => acc + curr.cantidad, 0) || 0;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8" id="scanner-dashboard-component">
      
      {/* 1. HEADER & ONLINE/OFFLINE STATUS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <span>Escáner de Inventario</span>
            <span className="font-mono text-xs font-normal px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/20">
              YOLOv8 Core
            </span>
          </h2>
          <p className="text-sm text-slate-400">
            Cargue imágenes de estantes industriales para automatizar el conteo de stock clasificado.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className={`w-2 h-2 rounded-full ${isOfflineMode ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
          <span className={isOfflineMode ? "text-amber-400" : "text-emerald-400"}>
            {isOfflineMode ? "MODO CONTINGENCIA (OFFLINE)" : "PIPELINE EN LÍNEA ACTIVO"}
          </span>
        </div>
      </div>

      {/* 2. ERROR STATE NOTIFICATIONS */}
      {errorText && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-950/30 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-3"
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <strong className="font-bold">Error de Inferencia:</strong> {errorText}
          </div>
        </motion.div>
      )}

      {/* 3. MAIN DASHBOARD CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: DROPZONE & SCANNER VISUALIZATION (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass rounded-2xl p-5 teal-glow border border-slate-800/80 bg-slate-950/20 flex flex-col justify-between h-full min-h-[420px]">
            
            <div className="flex-grow flex flex-col justify-center">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/jpg"
                className="hidden"
                id="file-input-uploader"
              />

              {!previewUrl ? (
                /* Drag & Drop Dropzone */
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 min-h-[300px] ${
                    dragActive 
                      ? "border-cyan-400 bg-cyan-950/20" 
                      : "border-slate-800 hover:border-slate-700 bg-slate-900/10 hover:bg-slate-900/20"
                  }`}
                >
                  <div className="rounded-full bg-slate-900 p-4 border border-slate-800">
                    <UploadCloud className="h-8 w-8 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Arrastre una imagen aquí</p>
                    <p className="text-xs text-slate-500 mt-1">o haga clic para examinar archivos locales</p>
                  </div>
                  <span className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">
                    PNG, JPG, JPEG (MÁX. 8MB)
                  </span>
                </div>
              ) : (
                /* Local Image & Scanner Animation Preview */
                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center min-h-[300px]">
                  <img 
                    src={previewUrl} 
                    alt="Upload Preview" 
                    className="max-h-[350px] w-auto object-contain rounded-xl select-none"
                  />
                  
                  {/* Laser Scan Animation Overlay */}
                  <AnimatePresence>
                    {isLoading && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center select-none"
                      >
                        {/* Pulse Scanner Line */}
                        <div className="absolute left-0 right-0 h-1 bg-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-bounce z-10" style={{ animationDuration: '2.5s' }} />
                        
                        <div className="relative z-20 space-y-4">
                          <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin mx-auto" />
                          <div>
                            <p className="text-sm font-mono font-semibold text-cyan-400 uppercase tracking-widest">
                              PROCESANDO IMAGEN
                            </p>
                            <p className="text-xs text-slate-400 mt-1.5 animate-pulse max-w-xs mx-auto">
                              {statusMessage}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Top-Right Clear Action */}
                  {!isLoading && (
                    <button
                      onClick={handleClearImage}
                      className="absolute top-3 right-3 p-1.5 bg-slate-900/80 hover:bg-slate-900 border border-slate-700/50 rounded-full text-slate-400 hover:text-white transition-colors"
                      title="Clear Upload"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Ingestion Controls */}
            {previewUrl && (
              <div className="mt-5 flex gap-3">
                <button
                  onClick={triggerVisualScan}
                  disabled={isLoading}
                  className={`flex-grow py-3 px-4 rounded-xl text-xs uppercase font-bold tracking-wider font-mono flex items-center justify-center gap-2 transition-all ${
                    isLoading 
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/30" 
                      : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950 border border-cyan-400/20"
                  }`}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  <span>{isLoading ? "PROCESANDO PIPELINE..." : "INICIALIZAR ESCANEO"}</span>
                </button>
                
                {!isLoading && (
                  <button
                    onClick={handleClearImage}
                    className="px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs uppercase font-bold tracking-wider font-mono transition-colors"
                  >
                    Descartar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SCANREPORT RESULTS DASHBOARD (7 Columns) */}
        <div className="lg:col-span-7">
          
          <AnimatePresence mode="wait">
            {!scanReport && !isLoading ? (
              /* Awaiting Scan State */
              <motion.div 
                key="empty-dashboard-state"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[420px] rounded-2xl border border-slate-850 bg-slate-900/10 p-8 flex flex-col items-center justify-center text-center text-slate-500"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-center mb-5">
                  <Database className="h-8 w-8 text-slate-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-300">Auditoría no Inicializada</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-2">
                  Cargue una fotografía de rack en el módulo izquierdo y presione "Inicializar Escaneo" para extraer predicciones estructuradas del modelo de visión.
                </p>
              </motion.div>
            ) : isLoading ? (
              /* Scanning Skeleton Loading state */
              <motion.div 
                key="loading-dashboard-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[420px] rounded-2xl border border-slate-850 bg-slate-900/5 p-6 space-y-6"
              >
                <div className="flex justify-between items-center pb-4 border-b border-slate-850">
                  <div className="h-5 w-40 bg-slate-800 rounded animate-pulse" />
                  <div className="h-5 w-24 bg-slate-800 rounded animate-pulse" />
                </div>
                <div className="h-20 bg-slate-800/40 rounded-xl animate-pulse" />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(idx => (
                    <div key={idx} className="h-24 bg-slate-800/20 rounded-xl border border-slate-800 animate-pulse" />
                  ))}
                </div>
                <div className="h-12 bg-slate-800/30 rounded-xl animate-pulse" />
              </motion.div>
            ) : (
              /* Success / Result Render State */
              <motion.div
                key="success-dashboard-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* 3A. DEGRADED MODE ALERT BANNER */}
                {isOfflineMode && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-4 bg-amber-950/30 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-amber-400 text-xs shadow-md shadow-amber-950/10"
                  >
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 animate-bounce" />
                    <div>
                      <strong className="font-bold block uppercase tracking-wider text-[10px]">Alerta de Operación</strong>
                      Viewing local contingency inventory (Offline Mode) - Respaldos de contingencia locales cargados debido a un límite de cuota o indisponibilidad temporal del pipeline YOLOv8 en la nube.
                    </div>
                  </motion.div>
                )}

                {/* Report Card Details Container */}
                <div className="glass rounded-2xl border border-slate-800 bg-slate-900/10 p-6 space-y-6 shadow-xl">
                  
                  {/* Metadata Header */}
                  <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">ID REPORTE</span>
                      <h4 className="font-mono font-bold text-white text-base">
                        {scanReport.id}
                      </h4>
                    </div>
                    
                    <div className="text-right">
                      <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">FECHA DE REGISTRO</span>
                      <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5 justify-end mt-0.5">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {scanReport.fecha}
                      </span>
                    </div>
                  </div>

                  {/* Summary Block */}
                  <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-xl">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1">
                      Resumen del Área
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {scanReport.warehouseSummary}
                    </p>
                  </div>

                  {/* Item Stats Grid (Visually Organizings) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {(Object.keys(CATEGORY_CONFIGS) as AllowedItemType[]).map((categoryKey) => {
                      const config = CATEGORY_CONFIGS[categoryKey];
                      const detected = scanReport.detecciones.find(d => d.item.toLowerCase() === categoryKey);
                      const qty = detected ? detected.cantidad : 0;
                      const Icon = config.icon;

                      return (
                        <div 
                          key={categoryKey}
                          className={`rounded-xl border ${config.bgColor} ${config.borderColor} p-4 flex flex-col justify-between min-h-[100px] transition-transform duration-300 hover:scale-[1.02]`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xl" role="img" aria-label={config.label}>
                              {config.emoji}
                            </span>
                            <div className={`p-1.5 rounded-lg bg-slate-950 border border-slate-800 ${config.textColor}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <span className="text-[10px] uppercase font-mono text-slate-400 block tracking-wider">
                              {config.label}
                            </span>
                            <span className="text-2xl font-black font-mono text-white block mt-0.5">
                              {qty.toString().padStart(2, '0')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 3C. INVENTORY REPORT VISUALIZATION TABLE */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-cyan-400" />
                        Desglose de Auditoría
                      </span>
                      <span className="font-mono text-xs text-cyan-400 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                        {totalCount} Items Totales
                      </span>
                    </div>

                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-950 border-b border-slate-850 font-mono text-slate-400 uppercase">
                            <th className="py-3.5 px-4 font-semibold">Ítem</th>
                            <th className="py-3.5 px-4 font-semibold text-center">Unidad</th>
                            <th className="py-3.5 px-4 font-semibold text-center">Precisión Promedio</th>
                            <th className="py-3.5 px-4 font-semibold text-right">Estatus Conteo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 bg-slate-900/20">
                          {scanReport.detecciones.map((d) => {
                            const config = CATEGORY_CONFIGS[d.item.toLowerCase() as AllowedItemType] || CATEGORY_CONFIGS.cajas;
                            const Icon = config.icon;
                            
                            return (
                              <tr key={d.id || d.item} className="hover:bg-slate-800/10 transition-colors">
                                <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                                  <span className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
                                    <Icon className={`h-3 w-3 ${config.textColor}`} />
                                  </span>
                                  <span className="capitalize">{config.label}</span>
                                </td>
                                <td className="py-3 px-4 text-center font-mono text-slate-300">
                                  {d.cantidad} ud.
                                </td>
                                <td className="py-3 px-4 text-center font-mono text-slate-400">
                                  {config.defaultConfidence}%
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/30 text-emerald-400 font-mono text-[9px] font-bold border border-emerald-500/10">
                                    Conforme
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          
                          {scanReport.detecciones.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-slate-500 font-mono text-xs">
                                No se detectaron activos en esta lectura.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 3B. AUDIT CONFIRMATION CONTROLS */}
                  <div className="pt-4 border-t border-slate-850 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-full ${isConfirmed ? "bg-emerald-950 text-emerald-400 border border-emerald-500/25" : "bg-slate-900 text-slate-600 border border-slate-800"}`}>
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block font-mono uppercase">Estatus de Auditoría</span>
                        <span className={`text-xs font-semibold ${isConfirmed ? "text-emerald-400" : "text-slate-400"}`}>
                          {isConfirmed ? "Stock Comprometido" : "Pendiente por Confirmar"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleToggleConfirmState}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 transition-all ${
                        isConfirmed 
                          ? "bg-emerald-950 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30" 
                          : "bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800"
                      }`}
                    >
                      {isConfirmed ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Revertir Stock</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-cyan-400" />
                          <span>Comprometer Stock</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

    </div>
  );
}
