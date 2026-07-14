import React, { useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Cpu,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type {
  ScanErrorResponse,
  ScanReport,
  ScanResponse,
} from "../../../types/inventory";

interface UploadScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanCreated: (newScan: ScanReport) => void;
}

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
]);

export default function UploadScanModal({
  isOpen,
  onClose,
  onScanCreated,
}: UploadScanModalProps) {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);
  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) {
    return null;
  }

  const resetModal = () => {
    setPhase(1);
    setSelectedFile(null);
    setSelectedImage(null);
    setImageName("");
    setDragActive(false);
    setErrorMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const closeModal = () => {
    resetModal();
    onClose();
  };

  const processFile = (file: File) => {
    setErrorMessage("");

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setErrorMessage(
        "Formato no permitido. Seleccione una imagen JPG, JPEG o PNG.",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(
        "La imagen supera el tamaño máximo permitido de 8 MB.",
      );
      return;
    }

    if (file.size === 0) {
      setErrorMessage("La imagen seleccionada está vacía.");
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;

      if (typeof result !== "string") {
        setErrorMessage(
          "No fue posible previsualizar la imagen.",
        );
        return;
      }

      setSelectedFile(file);
      setSelectedImage(result);
      setImageName(file.name);
      setPhase(2);
    };

    reader.onerror = () => {
      setErrorMessage(
        "Ocurrió un error al leer la imagen seleccionada.",
      );
    };

    reader.readAsDataURL(file);
  };

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      event.type === "dragenter" ||
      event.type === "dragover"
    ) {
      setDragActive(true);
    }

    if (event.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      processFile(file);
    }
  };

  const triggerYOLODetection = async () => {
    if (!selectedFile) {
      setErrorMessage(
        "Debe seleccionar una imagen antes de iniciar el análisis.",
      );
      setPhase(1);
      return;
    }

    setErrorMessage("");
    setPhase(3);

    try {
      const formData = new FormData();

      // Debe llamarse "file" porque server.ts usa:
      // upload.single("file")
      formData.append("file", selectedFile);

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
            : "No fue posible procesar la imagen.";

        throw new Error(message);
      }

      onScanCreated(responseData);
      closeModal();
    } catch (error) {
      console.error("Error durante el escaneo:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado durante el análisis.",
      );

      // Volvemos a la previsualización para poder intentarlo de nuevo.
      setPhase(2);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={phase !== 3 ? closeModal : undefined}
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
        id="modal-backdrop"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 text-slate-100 shadow-2xl backdrop-blur-xl"
        id="modal-container"
      >
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-teal-400" />

            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-teal-400">
              Ultralytics YOLO11n
            </span>
          </div>

          {phase !== 3 && (
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              id="close-modal-btn"
              aria-label="Cerrar ventana"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          {errorMessage && phase !== 3 && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />

              <div>
                <p className="font-semibold">
                  No se pudo realizar el análisis
                </p>
                <p className="mt-1 text-xs text-red-300">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

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
                  Seleccione una fotografía clara del almacén para
                  detectar y contar los objetos presentes.
                </p>

                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all duration-300 ${
                    dragActive
                      ? "scale-[0.99] border-teal-400 bg-teal-500/10"
                      : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70"
                  }`}
                  id="drag-drop-zone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={handleFileChange}
                    id="scan-image-input"
                  />

                  <div className="mb-3 rounded-full bg-slate-900 p-3 text-slate-400 ring-1 ring-slate-800 transition-all duration-300 group-hover:scale-110 group-hover:text-teal-400">
                    <UploadCloud className="h-6 w-6" />
                  </div>

                  <p className="text-sm font-medium text-slate-300">
                    Arrastre una imagen aquí o{" "}
                    <span className="text-teal-400 underline decoration-teal-400/30">
                      examine sus archivos
                    </span>
                  </p>

                  <p className="mt-1.5 text-xs text-slate-500">
                    Formatos permitidos: PNG, JPG y JPEG. Tamaño
                    máximo: 8 MB.
                  </p>
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
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-serif text-xl font-medium tracking-tight text-white">
                    Confirmar imagen
                  </h3>

                  <span className="max-w-[200px] truncate rounded border border-slate-800 bg-slate-950/60 px-2 py-0.5 font-mono text-xs text-slate-400">
                    {imageName}
                  </span>
                </div>

                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-inner">
                  <img
                    src={selectedImage}
                    alt={`Previsualización de ${imageName}`}
                    className="h-full w-full object-contain"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />

                  <div className="pointer-events-none absolute inset-4 rounded border border-dashed border-teal-500/20">
                    <div className="absolute left-0 top-0 h-8 w-8 border-l border-t border-teal-400/40" />
                    <div className="absolute right-0 top-0 h-8 w-8 border-r border-t border-teal-400/40" />
                    <div className="absolute bottom-0 left-0 h-8 w-8 border-b border-l border-teal-400/40" />
                    <div className="absolute bottom-0 right-0 h-8 w-8 border-b border-r border-teal-400/40" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="flex items-center justify-center space-x-2 rounded-xl border border-slate-800 bg-slate-950/40 py-3 text-sm font-semibold text-slate-400 transition-all hover:bg-slate-950 hover:text-slate-200"
                    id="cancel-upload-btn"
                  >
                    <X className="h-4 w-4" />
                    <span>Cambiar imagen</span>
                  </button>

                  <button
                    type="button"
                    onClick={triggerYOLODetection}
                    className="flex items-center justify-center space-x-2 rounded-xl bg-teal-500 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] hover:bg-teal-400"
                    id="run-yolo-btn"
                  >
                    <Check className="h-4 w-4" />
                    <span>Iniciar análisis</span>
                  </button>
                </div>
              </motion.div>
            )}

            {phase === 3 && (
              <motion.div
                key="phase-3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center space-y-6 py-10 text-center"
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-28 w-28 animate-pulse rounded-full border-2 border-teal-500/10" />

                  <div className="absolute h-24 w-24 animate-spin rounded-full border border-dashed border-teal-400/30 [animation-duration:8s]" />

                  <div className="absolute h-20 w-20 animate-ping rounded-full border border-teal-500/40 [animation-duration:1.5s]" />

                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-teal-500/60 bg-teal-950 shadow-lg shadow-teal-500/30">
                    <RefreshCw className="h-7 w-7 animate-spin text-teal-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="animate-pulse font-mono text-xs font-semibold uppercase tracking-widest text-teal-400">
                    Analizando con Ultralytics YOLO11n
                  </p>

                  <h4 className="font-serif text-lg font-medium text-white">
                    Detectando y contando objetos
                  </h4>

                  <p className="mx-auto max-w-sm font-mono text-xs text-slate-500">
                    La imagen está siendo enviada al modelo de visión
                    por computador. Este proceso puede tardar algunos
                    segundos.
                  </p>
                </div>

                <div className="relative h-1.5 w-full max-w-xs overflow-hidden rounded-full border border-slate-800 bg-slate-950">
                  <motion.div
                    initial={{ left: "-100%" }}
                    animate={{ left: "100%" }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.2,
                      ease: "linear",
                    }}
                    className="absolute bottom-0 top-0 w-1/3 bg-gradient-to-r from-transparent via-teal-400 to-transparent"
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