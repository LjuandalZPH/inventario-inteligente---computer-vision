import React, {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  Database,
  GlassWater,
  Laptop,
  Layers,
  Package,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  Wrench,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type {
  AllowedItemType,
  ScanErrorResponse,
  ScanReport,
  ScanResponse,
} from "../../../types/inventory";

interface ScannerDashboardProps {
  onScanRegistered?: (report: ScanReport) => void;
}

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
]);

const CATEGORY_CONFIGS: Record<
  AllowedItemType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bgColor: string;
    borderColor: string;
    textColor: string;
    emoji: string;
  }
> = {
  cajas: {
    label: "Cajas",
    icon: Package,
    bgColor: "bg-amber-950/30",
    borderColor: "border-amber-500/25",
    textColor: "text-amber-400",
    emoji: "📦",
  },
  botellas: {
    label: "Botellas",
    icon: GlassWater,
    bgColor: "bg-blue-950/30",
    borderColor: "border-blue-500/25",
    textColor: "text-blue-400",
    emoji: "🍼",
  },
  laptops: {
    label: "Laptops",
    icon: Laptop,
    bgColor: "bg-purple-950/30",
    borderColor: "border-purple-500/25",
    textColor: "text-purple-400",
    emoji: "💻",
  },
  herramientas: {
    label: "Herramientas",
    icon: Wrench,
    bgColor: "bg-emerald-950/30",
    borderColor: "border-emerald-500/25",
    textColor: "text-emerald-400",
    emoji: "🔧",
  },
};

export default function ScannerDashboard({
  onScanRegistered,
}: ScannerDashboardProps) {
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);
  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);
  const [dragActive, setDragActive] =
    useState<boolean>(false);

  const [isLoading, setIsLoading] =
    useState<boolean>(false);
  const [statusMessage, setStatusMessage] =
    useState<string>("");
  const [scanReport, setScanReport] =
    useState<ScanReport | null>(null);
  const [errorText, setErrorText] =
    useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] =
    useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateAndSetFile = (file: File) => {
    setErrorText(null);

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setErrorText(
        "Tipo de archivo no válido. Seleccione una imagen PNG, JPG o JPEG.",
      );
      return;
    }

    if (file.size === 0) {
      setErrorText(
        "La imagen seleccionada está vacía.",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorText(
        "El archivo supera el límite permitido de 8 MB.",
      );
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setScanReport(null);
    setIsConfirmed(false);
  };

  const handleDrag = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      event.type === "dragenter" ||
      event.type === "dragover"
    ) {
      setDragActive(true);
    } else if (event.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setScanReport(null);
    setErrorText(null);
    setIsConfirmed(false);
    setStatusMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerVisualScan = async () => {
    if (!selectedFile || isLoading) {
      return;
    }

    setIsLoading(true);
    setIsConfirmed(false);
    setErrorText(null);
    setStatusMessage(
      "Preparando la imagen para el análisis...",
    );

    const formData = new FormData();
    formData.append("file", selectedFile);

    const statusSteps = [
      "Enviando la imagen al backend...",
      "Analizando la imagen con YOLO11n...",
      "Agrupando las detecciones por categoría...",
    ];

    let stepIndex = 0;

    const statusInterval = window.setInterval(() => {
      if (stepIndex < statusSteps.length) {
        setStatusMessage(statusSteps[stepIndex]);
        stepIndex += 1;
      }
    }, 1000);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });

      const responseData = (await response.json()) as
        | ScanResponse
        | ScanErrorResponse;

      if (!response.ok || "error" in responseData) {
        const message =
          "error" in responseData
            ? responseData.error
            : `El servidor respondió con el código ${response.status}.`;

        throw new Error(message);
      }

      setScanReport(responseData);
      setIsConfirmed(responseData.confirmado);
      onScanRegistered?.(responseData);
    } catch (error: unknown) {
      console.error(
        "No fue posible completar el escaneo:",
        error,
      );

      setErrorText(
        error instanceof Error
          ? error.message
          : "No fue posible procesar la imagen.",
      );
    } finally {
      window.clearInterval(statusInterval);
      setIsLoading(false);
      setStatusMessage("");
    }
  };

  const handleToggleConfirmState = () => {
    if (!scanReport) {
      return;
    }

    const nextState = !isConfirmed;

    const updatedReport: ScanReport = {
      ...scanReport,
      confirmado: nextState,
    };

    setIsConfirmed(nextState);
    setScanReport(updatedReport);
    onScanRegistered?.(updatedReport);
  };

  const totalCount =
    scanReport?.detecciones.reduce(
      (accumulator, current) =>
        accumulator + current.cantidad,
      0,
    ) ?? 0;

  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-8"
      id="scanner-dashboard-component"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold tracking-tight text-white">
            <span>Escáner de Inventario</span>

            <span className="rounded border border-cyan-500/20 bg-cyan-950 px-2 py-0.5 font-mono text-xs font-normal text-cyan-400">
              YOLO11n Core
            </span>
          </h2>

          <p className="text-sm text-slate-400">
            Cargue imágenes de estantes industriales para
            automatizar el conteo de inventario.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

          <span className="text-emerald-400">
            PIPELINE YOLO11n ACTIVO
          </span>
        </div>
      </div>

      {errorText && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-sm text-red-400"
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />

          <div>
            <strong className="font-bold">
              Error de inferencia:
            </strong>{" "}
            {errorText}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <div className="glass flex h-full min-h-[420px] flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-950/20 p-5 teal-glow">
            <div className="flex flex-grow flex-col justify-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png,image/jpeg"
                className="hidden"
                id="file-input-uploader"
              />

              {!previewUrl ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className={`flex min-h-[300px] cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
                    dragActive
                      ? "border-cyan-400 bg-cyan-950/20"
                      : "border-slate-800 bg-slate-900/10 hover:border-slate-700 hover:bg-slate-900/20"
                  }`}
                >
                  <div className="rounded-full border border-slate-800 bg-slate-900 p-4">
                    <UploadCloud className="h-8 w-8 text-slate-400" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Arrastre una imagen aquí
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      o haga clic para examinar archivos
                      locales
                    </p>
                  </div>

                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
                    PNG, JPG o JPEG — máximo 8 MB
                  </span>
                </div>
              ) : (
                <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                  <img
                    src={previewUrl}
                    alt="Previsualización de la imagen seleccionada"
                    className="max-h-[350px] w-auto select-none rounded-xl object-contain"
                  />

                  <AnimatePresence>
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex select-none flex-col items-center justify-center bg-slate-950/75 p-6 text-center backdrop-blur-[2px]"
                      >
                        <div
                          className="absolute left-0 right-0 z-10 h-1 animate-bounce bg-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                          style={{
                            animationDuration: "2.5s",
                          }}
                        />

                        <div className="relative z-20 space-y-4">
                          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-cyan-400" />

                          <div>
                            <p className="font-mono text-sm font-semibold uppercase tracking-widest text-cyan-400">
                              Procesando imagen
                            </p>

                            <p className="mx-auto mt-1.5 max-w-xs animate-pulse text-xs text-slate-400">
                              {statusMessage}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!isLoading && (
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute right-3 top-3 rounded-full border border-slate-700/50 bg-slate-900/80 p-1.5 text-slate-400 transition-colors hover:bg-slate-900 hover:text-white"
                      title="Eliminar imagen"
                      aria-label="Eliminar imagen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {previewUrl && (
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={triggerVisualScan}
                  disabled={isLoading}
                  className={`flex flex-grow items-center justify-center gap-2 rounded-xl border px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                    isLoading
                      ? "cursor-not-allowed border-slate-700/30 bg-slate-800 text-slate-500"
                      : "border-cyan-400/20 bg-cyan-600 text-white shadow-lg shadow-cyan-950 hover:bg-cyan-500"
                  }`}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      isLoading ? "animate-spin" : ""
                    }`}
                  />

                  <span>
                    {isLoading
                      ? "Procesando..."
                      : "Inicializar escaneo"}
                  </span>
                </button>

                {!isLoading && (
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                  >
                    Descartar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!scanReport && !isLoading ? (
              <motion.div
                key="empty-dashboard-state"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/10 p-8 text-center text-slate-500"
              >
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/50">
                  <Database className="h-8 w-8 text-slate-600" />
                </div>

                <h3 className="text-base font-semibold text-slate-300">
                  Auditoría no inicializada
                </h3>

                <p className="mt-2 max-w-sm text-xs text-slate-500">
                  Cargue una fotografía y presione
                  “Inicializar escaneo” para obtener las
                  detecciones del modelo.
                </p>
              </motion.div>
            ) : isLoading ? (
              <motion.div
                key="loading-dashboard-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[420px] space-y-6 rounded-2xl border border-slate-800 bg-slate-900/5 p-6"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="h-5 w-40 animate-pulse rounded bg-slate-800" />
                  <div className="h-5 w-24 animate-pulse rounded bg-slate-800" />
                </div>

                <div className="h-20 animate-pulse rounded-xl bg-slate-800/40" />

                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((index) => (
                    <div
                      key={index}
                      className="h-24 animate-pulse rounded-xl border border-slate-800 bg-slate-800/20"
                    />
                  ))}
                </div>

                <div className="h-12 animate-pulse rounded-xl bg-slate-800/30" />
              </motion.div>
            ) : (
              scanReport && (
                <motion.div
                  key="success-dashboard-state"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="glass space-y-6 rounded-2xl border border-slate-800 bg-slate-900/10 p-6 shadow-xl">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-500">
                          ID del reporte
                        </span>

                        <h4 className="font-mono text-base font-bold text-white">
                          {scanReport.id}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-500">
                          Fecha de registro
                        </span>

                        <span className="mt-0.5 flex items-center justify-end gap-1.5 text-xs font-medium text-slate-300">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {scanReport.fecha}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                      <span className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Resumen del área
                      </span>

                      <p className="text-xs leading-relaxed text-slate-300">
                        {scanReport.warehouseSummary}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {(
                        Object.keys(
                          CATEGORY_CONFIGS,
                        ) as AllowedItemType[]
                      ).map((categoryKey) => {
                        const config =
                          CATEGORY_CONFIGS[categoryKey];

                        const detected =
                          scanReport.detecciones.find(
                            (detection) =>
                              detection.item === categoryKey,
                          );

                        const quantity =
                          detected?.cantidad ?? 0;

                        const Icon = config.icon;

                        return (
                          <div
                            key={categoryKey}
                            className={`flex min-h-[100px] flex-col justify-between rounded-xl border p-4 transition-transform duration-300 hover:scale-[1.02] ${config.bgColor} ${config.borderColor}`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className="text-xl"
                                role="img"
                                aria-label={config.label}
                              >
                                {config.emoji}
                              </span>

                              <div
                                className={`rounded-lg border border-slate-800 bg-slate-950 p-1.5 ${config.textColor}`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                            </div>

                            <div className="mt-4">
                              <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                {config.label}
                              </span>

                              <span className="mt-0.5 block font-mono text-2xl font-black text-white">
                                {quantity
                                  .toString()
                                  .padStart(2, "0")}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          <Layers className="h-3.5 w-3.5 text-cyan-400" />
                          Desglose de auditoría
                        </span>

                        <span className="rounded border border-cyan-500/20 bg-cyan-950/40 px-2 py-0.5 font-mono text-xs font-bold text-cyan-400">
                          {totalCount} ítems totales
                        </span>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-slate-800">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-950 font-mono uppercase text-slate-400">
                              <th className="px-4 py-3.5 font-semibold">
                                Ítem
                              </th>

                              <th className="px-4 py-3.5 text-center font-semibold">
                                Cantidad
                              </th>

                              <th className="px-4 py-3.5 text-right font-semibold">
                                Estado del conteo
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-800 bg-slate-900/20">
                            {scanReport.detecciones.map(
                              (detection) => {
                                const config =
                                  CATEGORY_CONFIGS[
                                    detection.item
                                  ];

                                const Icon = config.icon;

                                return (
                                  <tr
                                    key={detection.item}
                                    className="transition-colors hover:bg-slate-800/10"
                                  >
                                    <td className="flex items-center gap-2 px-4 py-3 font-medium text-white">
                                      <span className="rounded border border-slate-800 bg-slate-900 p-1 text-slate-400">
                                        <Icon
                                          className={`h-3 w-3 ${config.textColor}`}
                                        />
                                      </span>

                                      <span className="capitalize">
                                        {config.label}
                                      </span>
                                    </td>

                                    <td className="px-4 py-3 text-center font-mono text-slate-300">
                                      {detection.cantidad} ud.
                                    </td>

                                    <td className="px-4 py-3 text-right">
                                      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/10 bg-emerald-950/30 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
                                        Detectado
                                      </span>
                                    </td>
                                  </tr>
                                );
                              },
                            )}

                            {scanReport.detecciones.length ===
                              0 && (
                              <tr>
                                <td
                                  colSpan={3}
                                  className="px-4 py-6 text-center font-mono text-xs text-slate-500"
                                >
                                  No se detectaron objetos
                                  pertenecientes a las
                                  categorías del inventario.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`rounded-full border p-1.5 ${
                            isConfirmed
                              ? "border-emerald-500/25 bg-emerald-950 text-emerald-400"
                              : "border-slate-800 bg-slate-900 text-slate-600"
                          }`}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </div>

                        <div>
                          <span className="block font-mono text-[10px] uppercase text-slate-500">
                            Estado de auditoría
                          </span>

                          <span
                            className={`text-xs font-semibold ${
                              isConfirmed
                                ? "text-emerald-400"
                                : "text-slate-400"
                            }`}
                          >
                            {isConfirmed
                              ? "Inventario confirmado"
                              : "Pendiente por confirmar"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleConfirmState}
                        className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                          isConfirmed
                            ? "border-emerald-500/30 bg-emerald-950 text-emerald-400 hover:bg-emerald-900/60"
                            : "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        {isConfirmed ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Desconfirmar</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 text-cyan-400" />
                            <span>Confirmar inventario</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
