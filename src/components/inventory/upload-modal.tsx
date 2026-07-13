import React, { useState, useRef } from "react";
import { X, UploadCloud, Eye, RefreshCw, Cpu, Check, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { InventoryScan, Detection } from "../../types/inventory";

interface UploadScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanCreated: (newScan: InventoryScan) => void;
}

export default function UploadScanModal({ isOpen, onClose, onScanCreated }: UploadScanModalProps) {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // A couple of beautiful high-tech preset mock images for a smooth offline-first trial
  const PRESET_IMAGES = [
    {
      name: "almacen_norte_rackB.jpg",
      url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800",
      detecciones: [
        { item: "cajas", cantidad: 45 },
        { item: "botellas", cantidad: 25 },
        { item: "laptops", cantidad: 4 },
        { item: "herramientas", cantidad: 12 }
      ],
      summary: "Simulación: Almacén norte con estibas densas de racks industriales de nivel B."
    },
    {
      name: "zona_carga_embarque.jpg",
      url: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=800",
      detecciones: [
        { item: "cajas", cantidad: 18 },
        { item: "palets", cantidad: 6 },
        { item: "herramientas", cantidad: 3 }
      ],
      summary: "Simulación: Zona de embarque y consolidación. Stock listo para despacho."
    }
  ];

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setImageName(file.name);
        setPhase(2);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const selectPreset = (preset: typeof PRESET_IMAGES[0]) => {
    setSelectedImage(preset.url);
    setImageName(preset.name);
    setPhase(2);
  };

  const triggerYOLODetection = () => {
    setPhase(3);

    // Simulate Ultralytics YOLO v8 vision inference (1.5 seconds)
    setTimeout(() => {
      // Determine if preset or custom file upload
      const matchedPreset = PRESET_IMAGES.find(p => p.url === selectedImage);
      
      const newScanId = `scan-${Date.now().toString().slice(-4)}`;
      const detections: Detection[] = matchedPreset 
        ? matchedPreset.detecciones 
        : [
            { item: "cajas", cantidad: Math.floor(Math.random() * 25) + 15 },
            { item: "botellas", cantidad: Math.floor(Math.random() * 15) + 5 },
            { item: "laptops", cantidad: Math.floor(Math.random() * 8) + 2 },
            { item: "herramientas", cantidad: Math.floor(Math.random() * 6) + 1 }
          ];

      const summary = matchedPreset
        ? matchedPreset.summary
        : `Detección en tiempo real de imagen '${imageName}'. Modelo YOLOv8 analizó la cuadrícula en busca de embalajes rígidos, detectando stock distribuido correctamente.`;

      const newScan: InventoryScan = {
        id: newScanId,
        fecha: new Date().toISOString().split('T')[0],
        urlImagen: selectedImage || "mock_warehouse_asset",
        detecciones: detections,
        warehouseSummary: summary
      };

      onScanCreated(newScan);
      // Reset state
      setPhase(1);
      setSelectedImage(null);
      setImageName("");
    }, 1500);
  };

  const resetModal = () => {
    setPhase(1);
    setSelectedImage(null);
    setImageName("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={phase !== 3 ? onClose : undefined}
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
        id="modal-backdrop"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 text-slate-100 shadow-2xl glow-blue backdrop-blur-xl"
        id="modal-container"
      >
        {/* Glow background accent */}
        <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-teal-400" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-teal-400">YOLO Vision Hub</span>
          </div>
          {phase !== 3 && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              id="close-modal-btn"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {phase === 1 && (
              <motion.div
                key="phase-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <h3 className="font-serif text-xl font-medium tracking-tight text-white">
                  Cargar nueva auditoría visual
                </h3>
                <p className="text-sm text-slate-400">
                  Suba una fotografía nítida de los estantes o zonas de acopio de su almacén para procesarla con visión computacional.
                </p>

                {/* Drag and Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 px-4 text-center cursor-pointer transition-all duration-300 ${
                    dragActive
                      ? "border-teal-400 bg-teal-500/10 scale-[0.99]"
                      : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70"
                  }`}
                  id="drag-drop-zone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg"
                    className="hidden"
                    onChange={handleFileChange}
                    id="scan-image-input"
                  />
                  
                  <div className="mb-3 rounded-full bg-slate-900 p-3 text-slate-400 ring-1 ring-slate-800 group-hover:bg-slate-850 group-hover:text-teal-400 group-hover:scale-110 transition-all duration-300">
                    <UploadCloud className="h-6 w-6" />
                  </div>

                  <p className="text-sm font-medium text-slate-300">
                    Arrastre y suelte una imagen aquí, o <span className="text-teal-400 underline decoration-teal-400/30 group-hover:text-teal-300">examine sus archivos</span>
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Soporta formatos PNG, JPG o JPEG (Recomendado: 1920x1080)
                  </p>
                </div>

                {/* Demo Preset Selection */}
                <div className="space-y-2 pt-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">O use un escenario preestablecido</span>
                  <div className="grid grid-cols-2 gap-3">
                    {PRESET_IMAGES.map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => selectPreset(preset)}
                        className="flex items-center space-x-3 rounded-lg border border-slate-800/80 bg-slate-950/30 p-2.5 text-left transition-all hover:border-slate-750 hover:bg-slate-950/65 group"
                      >
                        <div className="h-10 w-14 overflow-hidden rounded border border-slate-800 group-hover:border-slate-700 flex-shrink-0">
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="overflow-hidden">
                          <p className="truncate font-mono text-xs font-semibold text-slate-300 group-hover:text-teal-400">
                            {preset.name}
                          </p>
                          <p className="truncate text-[10px] text-slate-500">
                            {preset.detecciones.map(d => `${d.cantidad} ${d.item}`).join(', ')}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {phase === 2 && selectedImage && (
              <motion.div
                key="phase-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl font-medium tracking-tight text-white">
                    Confirmar imagen
                  </h3>
                  <span className="font-mono text-xs text-slate-400 truncate max-w-[200px] bg-slate-950/60 px-2 py-0.5 rounded border border-slate-850">
                    {imageName}
                  </span>
                </div>

                {/* Premium Image Thumbnail Preview */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-inner">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent pointer-events-none" />
                  
                  {/* Subtle target grid graphic overlay to make it look technical */}
                  <div className="absolute inset-4 border border-dashed border-teal-500/20 rounded pointer-events-none flex items-center justify-center">
                    <div className="w-8 h-8 border-t border-l border-teal-400/40 absolute top-0 left-0" />
                    <div className="w-8 h-8 border-t border-r border-teal-400/40 absolute top-0 right-0" />
                    <div className="w-8 h-8 border-b border-l border-teal-400/40 absolute bottom-0 left-0" />
                    <div className="w-8 h-8 border-b border-r border-teal-400/40 absolute bottom-0 right-0" />
                    <div className="w-3 h-3 rounded-full bg-teal-400/20 animate-ping" />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={resetModal}
                    className="flex items-center justify-center space-x-2 rounded-xl border border-slate-800 bg-slate-950/40 py-3 text-sm font-semibold text-slate-400 transition-all hover:bg-slate-950 hover:text-slate-200"
                    id="cancel-upload-btn"
                  >
                    <X className="h-4 w-4" />
                    <span>[X] Cancelar</span>
                  </button>
                  <button
                    onClick={triggerYOLODetection}
                    className="flex items-center justify-center space-x-2 rounded-xl bg-teal-500 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-400 hover:scale-[1.02] hover:shadow-teal-400/30"
                    id="run-yolo-btn"
                  >
                    <Check className="h-4 w-4" />
                    <span>[✓] Iniciar YOLO</span>
                  </button>
                </div>
              </motion.div>
            )}

            {phase === 3 && (
              <motion.div
                key="phase-3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10 text-center space-y-6"
              >
                {/* Advanced Pulsing Scanning Ring */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-28 w-28 rounded-full border-2 border-teal-500/10 animate-pulse" />
                  <div className="absolute h-24 w-24 rounded-full border border-dashed border-teal-400/30 animate-spin [animation-duration:8s]" />
                  <div className="absolute h-20 w-20 rounded-full border border-teal-500/40 animate-ping [animation-duration:1.5s]" />
                  
                  {/* Central Glow Core */}
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-teal-950 border border-teal-500/60 shadow-lg shadow-teal-500/30">
                    <RefreshCw className="h-7 w-7 text-teal-400 animate-spin" />
                  </div>
                </div>

                {/* Process Details */}
                <div className="space-y-2">
                  <p className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-400 animate-pulse">
                    ANALIZANDO CON ULTRALYTICS YOLOv8
                  </p>
                  <h4 className="font-serif text-lg font-medium text-white">
                    Escaneando cuadriculado e inventariando
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto font-mono">
                    Segmentando capas, extrayendo bounding boxes e identificando cajas, botellas y herramientas...
                  </p>
                </div>

                {/* Animated Horizontal Scan Line in miniature */}
                <div className="w-full max-w-xs h-1.5 bg-slate-950 rounded-full overflow-hidden relative border border-slate-850">
                  <motion.div
                    initial={{ left: "-100%" }}
                    animate={{ left: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                    className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-teal-400 to-transparent"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
