import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  GlassWater,
  Info,
  Laptop,
  Minus,
  Package,
  Plus,
  RotateCcw,
  ShieldCheck,
  Tag,
  Wrench,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type {
  AllowedItemType,
  InventoryItem,
  InventoryPrediction,
  ScanReport,
} from "../../../types/inventory";

interface ReportDetailProps {
  scan: ScanReport;
  onBackToDashboard: () => void;
  onCommitStock: (
    scanId: string,
    correctedDetections: InventoryItem[],
  ) => void;
  warehouseAssetPath?: string;
}

interface Size {
  width: number;
  height: number;
}

type CountMap = Record<AllowedItemType, number>;

const ITEM_CATEGORIES: AllowedItemType[] = [
  "cajas",
  "botellas",
  "laptops",
  "herramientas",
];

const ITEM_STYLES: Record<
  AllowedItemType,
  {
    dotColor: string;
    textColor: string;
    borderColor: string;
    labelColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  cajas: {
    dotColor: "bg-amber-400",
    textColor: "text-amber-400",
    borderColor: "border-amber-400",
    labelColor: "bg-amber-400 text-slate-950",
    icon: Package,
  },
  botellas: {
    dotColor: "bg-sky-400",
    textColor: "text-sky-400",
    borderColor: "border-sky-400",
    labelColor: "bg-sky-400 text-slate-950",
    icon: GlassWater,
  },
  laptops: {
    dotColor: "bg-indigo-400",
    textColor: "text-indigo-400",
    borderColor: "border-indigo-400",
    labelColor: "bg-indigo-400 text-white",
    icon: Laptop,
  },
  herramientas: {
    dotColor: "bg-emerald-400",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-400",
    labelColor: "bg-emerald-400 text-slate-950",
    icon: Wrench,
  },
};

function createEmptyCountMap(): CountMap {
  return {
    cajas: 0,
    botellas: 0,
    laptops: 0,
    herramientas: 0,
  };
}

function createCountMapFromDetections(
  detections: InventoryItem[],
): CountMap {
  const counts = createEmptyCountMap();

  for (const detection of detections) {
    counts[detection.item] = Math.max(
      0,
      Math.trunc(detection.cantidad),
    );
  }

  return counts;
}

function createCountMapFromPredictions(
  predictions: InventoryPrediction[],
): CountMap {
  const counts = createEmptyCountMap();

  for (const prediction of predictions) {
    counts[prediction.className] += 1;
  }

  return counts;
}

function calculateAverageConfidence(
  predictions: InventoryPrediction[],
): number | null {
  if (predictions.length === 0) {
    return null;
  }

  const total = predictions.reduce(
    (sum, prediction) => sum + prediction.score,
    0,
  );

  return (total / predictions.length) * 100;
}

function countMapToDetections(
  counts: CountMap,
): InventoryItem[] {
  return ITEM_CATEGORIES
    .map((item) => ({
      item,
      cantidad: counts[item],
    }))
    .filter(
      (detection) => detection.cantidad > 0,
    );
}

export default function ReportDetail({
  scan,
  onBackToDashboard,
  onCommitStock,
  warehouseAssetPath,
}: ReportDetailProps) {
  const predictions = scan.predicciones ?? [];

  const aiCounts = useMemo(() => {
    if (predictions.length > 0) {
      return createCountMapFromPredictions(
        predictions,
      );
    }

    return createCountMapFromDetections(
      scan.detecciones,
    );
  }, [predictions, scan.detecciones]);

  const savedCounts = useMemo(
    () =>
      createCountMapFromDetections(
        scan.detecciones,
      ),
    [scan.detecciones],
  );

  const [isCommitted, setIsCommitted] = useState(
    scan.confirmado,
  );
  const [editableCounts, setEditableCounts] =
    useState<CountMap>(savedCounts);
  const [hoveredItem, setHoveredItem] =
    useState<AllowedItemType | null>(null);
  const [showDetections, setShowDetections] =
    useState(true);
  const [containerSize, setContainerSize] =
    useState<Size>({
      width: 0,
      height: 0,
    });
  const [imageSize, setImageSize] = useState<Size>({
    width: 0,
    height: 0,
  });

  const imageContainerRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsCommitted(scan.confirmado);
    setEditableCounts(savedCounts);
  }, [scan.confirmado, scan.id, savedCounts]);

  useEffect(() => {
    const element = imageContainerRef.current;

    if (!element) {
      return;
    }

    const updateContainerSize = () => {
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateContainerSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener(
        "resize",
        updateContainerSize,
      );

      return () => {
        window.removeEventListener(
          "resize",
          updateContainerSize,
        );
      };
    }

    const resizeObserver = new ResizeObserver(
      updateContainerSize,
    );

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const imageSrc =
    scan.urlImagen === "mock_warehouse_asset" &&
    warehouseAssetPath
      ? warehouseAssetPath
      : scan.urlImagen;

  const totalAiDetected = ITEM_CATEGORIES.reduce(
    (total, category) =>
      total + aiCounts[category],
    0,
  );

  const totalCorrected = ITEM_CATEGORIES.reduce(
    (total, category) =>
      total + editableCounts[category],
    0,
  );

  const hasManualChanges = ITEM_CATEGORIES.some(
    (category) =>
      editableCounts[category] !==
      aiCounts[category],
  );

  const averageConfidence = useMemo(
    () => calculateAverageConfidence(predictions),
    [predictions],
  );

  const overlayGeometry = useMemo(() => {
    if (
      imageSize.width <= 0 ||
      imageSize.height <= 0 ||
      containerSize.width <= 0 ||
      containerSize.height <= 0
    ) {
      return null;
    }

    const scale = Math.min(
      containerSize.width / imageSize.width,
      containerSize.height / imageSize.height,
    );

    const renderedWidth = imageSize.width * scale;
    const renderedHeight = imageSize.height * scale;

    return {
      scale,
      offsetX:
        (containerSize.width - renderedWidth) / 2,
      offsetY:
        (containerSize.height - renderedHeight) / 2,
    };
  }, [containerSize, imageSize]);

  const getCategoryConfidence = (
    category: AllowedItemType,
  ) => {
    return calculateAverageConfidence(
      predictions.filter(
        (prediction) =>
          prediction.className === category,
      ),
    );
  };

  const updateQuantity = (
    category: AllowedItemType,
    change: number,
  ) => {
    if (isCommitted) {
      return;
    }

    setEditableCounts((currentCounts) => ({
      ...currentCounts,
      [category]: Math.min(
        999,
        Math.max(
          0,
          currentCounts[category] + change,
        ),
      ),
    }));
  };

  const resetToAiCounts = () => {
    if (isCommitted) {
      return;
    }

    setEditableCounts(aiCounts);
  };

  const handleCommit = () => {
    if (isCommitted) {
      return;
    }

    const correctedDetections =
      countMapToDetections(editableCounts);

    setIsCommitted(true);

    onCommitStock(
      scan.id,
      correctedDetections,
    );
  };

  return (
    <div
      className="mx-auto max-w-7xl space-y-6 px-4 pb-24 md:px-6"
      id={`report-detail-${scan.id}`}
    >
      <AnimatePresence>
        {isCommitted && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="glow-teal fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center space-x-3 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-6 py-4 text-emerald-100 shadow-2xl backdrop-blur-md"
            id="success-toast"
          >
            <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-emerald-400" />

            <div>
              <p className="text-sm font-semibold">
                Inventario confirmado
              </p>

              <p className="font-mono text-xs text-emerald-300/80">
                Se guardó el conteo final validado del
                reporte {scan.id}.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col space-y-4 border-b border-slate-800/60 pb-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="group mb-3 inline-flex items-center space-x-2 font-mono text-xs uppercase tracking-wider text-slate-400 transition-colors hover:text-white"
            id="back-to-dashboard-btn"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Volver al panel</span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-white">
              Reporte de auditoría visual
            </h1>

            <span className="rounded-full border border-teal-500/30 bg-teal-950/40 px-2.5 py-1 font-mono text-xs font-semibold text-teal-400">
              {scan.id}
            </span>

            <span
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold ${
                isCommitted
                  ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-400"
                  : "border-amber-500/30 bg-amber-950/40 text-amber-400"
              }`}
            >
              {isCommitted
                ? "CONFIRMADO"
                : "PENDIENTE DE VALIDACIÓN"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-800/60 bg-slate-950/45 px-4 py-2.5 font-mono text-xs">
          <div>
            <span className="block text-slate-500">
              FECHA
            </span>
            <span className="font-semibold text-slate-300">
              {scan.fecha}
            </span>
          </div>

          <div className="hidden h-8 w-px bg-slate-800 sm:block" />

          <div>
            <span className="block text-slate-500">
              MODELO
            </span>

            <span className="flex items-center font-semibold uppercase text-teal-400">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              YOLO11n
            </span>
          </div>

          <div className="hidden h-8 w-px bg-slate-800 sm:block" />

          <div>
            <span className="block text-slate-500">
              INFERENCIA
            </span>

            <span className="flex items-center font-semibold text-cyan-400">
              <Clock3 className="mr-1 h-3.5 w-3.5" />
              {typeof scan.inferenceTimeMs ===
              "number"
                ? `${scan.inferenceTimeMs.toFixed(
                    0,
                  )} ms`
                : "N/D"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Imagen analizada
            </span>

            <button
              type="button"
              onClick={() =>
                setShowDetections(
                  (currentValue) => !currentValue,
                )
              }
              disabled={predictions.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {showDetections ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}

              <span>
                {showDetections
                  ? "Ocultar detecciones"
                  : "Mostrar detecciones"}
              </span>
            </button>
          </div>

          <div className="glow-blue relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/60 p-1.5 shadow-2xl backdrop-blur-md">
            <div
              ref={imageContainerRef}
              className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-slate-900"
            >
              <img
                src={imageSrc}
                alt="Imagen analizada del almacén"
                className="h-full w-full object-contain"
                referrerPolicy="no-referrer"
                id="audited-image"
                onLoad={(event) => {
                  setImageSize({
                    width:
                      event.currentTarget.naturalWidth,
                    height:
                      event.currentTarget.naturalHeight,
                  });
                }}
              />

              {showDetections &&
                overlayGeometry &&
                predictions.map(
                  (prediction, index) => {
                    const itemStyle =
                      ITEM_STYLES[
                        prediction.className
                      ];

                    const [x1, y1, x2, y2] =
                      prediction.box;

                    const left =
                      overlayGeometry.offsetX +
                      Math.max(0, x1) *
                        overlayGeometry.scale;

                    const top =
                      overlayGeometry.offsetY +
                      Math.max(0, y1) *
                        overlayGeometry.scale;

                    const width =
                      Math.max(0, x2 - x1) *
                      overlayGeometry.scale;

                    const height =
                      Math.max(0, y2 - y1) *
                      overlayGeometry.scale;

                    const isDimmed =
                      hoveredItem !== null &&
                      hoveredItem !==
                        prediction.className;

                    return (
                      <div
                        key={`${prediction.className}-${index}`}
                        className={`pointer-events-none absolute border-2 transition-opacity duration-200 ${itemStyle.borderColor} ${
                          isDimmed
                            ? "opacity-20"
                            : "opacity-100"
                        }`}
                        style={{
                          left,
                          top,
                          width,
                          height,
                        }}
                      >
                        <span
                          className={`absolute left-[-2px] top-[-24px] whitespace-nowrap rounded-t px-1.5 py-1 font-mono text-[9px] font-bold uppercase shadow ${itemStyle.labelColor}`}
                        >
                          {prediction.className}{" "}
                          {(
                            prediction.score * 100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    );
                  },
                )}

              <div className="pointer-events-none absolute inset-4 rounded border border-slate-700/10">
                <div className="absolute left-2 top-2 h-4 w-4 border-l border-t border-slate-500/20" />
                <div className="absolute right-2 top-2 h-4 w-4 border-r border-t border-slate-500/20" />
                <div className="absolute bottom-2 left-2 h-4 w-4 border-b border-l border-slate-500/20" />
                <div className="absolute bottom-2 right-2 h-4 w-4 border-b border-r border-slate-500/20" />
              </div>

              <div className="absolute bottom-3 left-3 rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-300 backdrop-blur-md">
                {predictions.length > 0
                  ? `${predictions.length} detecciones visualizadas`
                  : "Sin detecciones compatibles"}
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-xl border border-slate-800/80 bg-slate-950/30 p-4 backdrop-blur-md">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-teal-400" />

            <div className="space-y-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-teal-400">
                Resultado del modelo
              </span>

              <p className="text-sm leading-relaxed text-slate-300">
                {scan.warehouseSummary}
              </p>

              <p className="text-xs text-slate-500">
                Los rectángulos representan las
                detecciones de YOLO11n. Las correcciones
                manuales modifican el conteo final, pero no
                alteran las cajas delimitadoras originales.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <span className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Validación humana del conteo
          </span>

          <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-teal-500/5 blur-3xl" />

            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-serif text-xl font-medium text-white">
                  Revisar cantidades
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Use los controles para corregir objetos
                  omitidos o detecciones incorrectas antes de
                  confirmar.
                </p>
              </div>

              <button
                type="button"
                onClick={resetToAiCounts}
                disabled={
                  isCommitted || !hasManualChanges
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restablecer IA
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/30">
              <table
                className="w-full min-w-[760px] border-collapse text-left"
                id="detections-table"
              >
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 font-mono text-xs text-slate-400">
                    <th className="px-4 py-3.5 font-semibold uppercase">
                      Categoría
                    </th>

                    <th className="px-4 py-3.5 text-center font-semibold uppercase">
                      Confianza
                    </th>

                    <th className="px-4 py-3.5 text-center font-semibold uppercase">
                      Conteo IA
                    </th>

                    <th className="px-4 py-3.5 text-right font-semibold uppercase">
                      Conteo final
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800 font-sans text-sm">
                  {ITEM_CATEGORIES.map((category) => {
                    const itemStyle =
                      ITEM_STYLES[category];

                    const Icon = itemStyle.icon;
                    const isHovered =
                      hoveredItem === category;
                    const categoryConfidence =
                      getCategoryConfidence(category);
                    const wasAdjusted =
                      editableCounts[category] !==
                      aiCounts[category];

                    return (
                      <tr
                        key={category}
                        onMouseEnter={() =>
                          setHoveredItem(category)
                        }
                        onMouseLeave={() =>
                          setHoveredItem(null)
                        }
                        className={`transition-all duration-200 ${
                          isHovered
                            ? "bg-slate-800/60 text-white"
                            : "text-slate-300 hover:bg-slate-900/30"
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`h-2 w-2 rounded-full ${itemStyle.dotColor}`}
                            />

                            <Icon
                              className={`h-5 w-5 ${itemStyle.textColor}`}
                            />

                            <div>
                              <span className="block font-semibold capitalize">
                                {category}
                              </span>

                              {wasAdjusted && (
                                <span className="font-mono text-[9px] font-semibold uppercase text-amber-400">
                                  Ajuste manual
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center font-mono text-xs text-slate-300">
                          {categoryConfidence === null
                            ? "N/D"
                            : `${categoryConfidence.toFixed(
                                1,
                              )} %`}
                        </td>

                        <td className="px-4 py-4 text-center font-mono text-base font-bold text-slate-400">
                          {aiCounts[category]}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  category,
                                  -1,
                                )
                              }
                              disabled={
                                isCommitted ||
                                editableCounts[
                                  category
                                ] === 0
                              }
                              aria-label={`Restar una unidad de ${category}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Minus className="h-4 w-4" />
                            </button>

                            <span
                              className={`min-w-12 rounded-md border px-3 py-1.5 text-center font-mono text-base font-bold ${
                                wasAdjusted
                                  ? "border-amber-500/40 bg-amber-950/30 text-amber-300"
                                  : "border-slate-800 bg-slate-950 text-white"
                              }`}
                            >
                              {
                                editableCounts[
                                  category
                                ]
                              }
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  category,
                                  1,
                                )
                              }
                              disabled={isCommitted}
                              aria-label={`Sumar una unidad de ${category}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-300 transition-colors hover:border-teal-500/50 hover:text-teal-300 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs text-slate-500">
                  Conteo de IA
                </p>

                <span className="mt-1 block font-mono text-2xl font-bold text-slate-300">
                  {totalAiDetected}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs text-slate-500">
                  Conteo final
                </p>

                <span className="mt-1 block font-mono text-2xl font-bold text-teal-400">
                  {totalCorrected}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs text-slate-500">
                  Confianza promedio
                </p>

                <span className="mt-1 block font-mono text-xl font-bold text-cyan-400">
                  {averageConfidence === null
                    ? "N/D"
                    : `${averageConfidence.toFixed(1)} %`}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs text-slate-500">
                  Estado de revisión
                </p>

                <span
                  className={`mt-1 block font-mono text-xs font-bold uppercase ${
                    hasManualChanges
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {hasManualChanges
                    ? "Conteo corregido"
                    : "Sin cambios"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold text-slate-200">
            {isCommitted
              ? "Este inventario ya fue confirmado."
              : "Revise el conteo antes de confirmarlo."}
          </p>

          <p className="text-xs text-slate-400">
            {isCommitted
              ? "Las cantidades guardadas se reflejan en el panel principal."
              : "Los cambios realizados se guardarán al confirmar el inventario."}
          </p>
        </div>

        <div className="flex w-full flex-col items-center space-y-3 sm:w-auto sm:flex-row sm:space-x-4 sm:space-y-0">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-6 py-3 text-center text-sm font-semibold text-slate-400 transition-all hover:bg-slate-950 hover:text-slate-200 sm:w-auto"
            id="footer-back-btn"
          >
            Volver al panel
          </button>

          <button
            type="button"
            onClick={handleCommit}
            disabled={isCommitted}
            className={`flex w-full items-center justify-center space-x-2 rounded-xl px-6 py-3 text-center text-sm font-semibold transition-all sm:w-auto ${
              isCommitted
                ? "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500"
                : "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/10 hover:scale-[1.02] hover:bg-teal-400"
            }`}
            id="commit-stock-btn"
          >
            {isCommitted ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Tag className="h-4 w-4" />
            )}

            <span>
              {isCommitted
                ? "Inventario confirmado"
                : hasManualChanges
                  ? "Confirmar conteo corregido"
                  : "Confirmar inventario"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
