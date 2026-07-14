import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  GlassWater,
  Info,
  Laptop,
  Package,
  ShieldCheck,
  Tag,
  Wrench,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type {
  AllowedItemType,
  ScanReport,
} from "../../../types/inventory";

interface ReportDetailProps {
  scan: ScanReport;
  onBackToDashboard: () => void;
  onCommitStock: (scanId: string) => void;
  warehouseAssetPath?: string;
}

const ITEM_STYLES: Record<
  AllowedItemType,
  {
    dotColor: string;
    textColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  cajas: {
    dotColor: "bg-amber-400",
    textColor: "text-amber-400",
    icon: Package,
  },
  botellas: {
    dotColor: "bg-sky-400",
    textColor: "text-sky-400",
    icon: GlassWater,
  },
  laptops: {
    dotColor: "bg-indigo-400",
    textColor: "text-indigo-400",
    icon: Laptop,
  },
  herramientas: {
    dotColor: "bg-emerald-400",
    textColor: "text-emerald-400",
    icon: Wrench,
  },
};

export default function ReportDetail({
  scan,
  onBackToDashboard,
  onCommitStock,
  warehouseAssetPath,
}: ReportDetailProps) {
  const [isCommitted, setIsCommitted] = useState(
    scan.confirmado,
  );
  const [hoveredItem, setHoveredItem] =
    useState<AllowedItemType | null>(null);

  useEffect(() => {
    setIsCommitted(scan.confirmado);
  }, [scan]);

  const handleCommit = () => {
    if (isCommitted) {
      return;
    }

    setIsCommitted(true);
    onCommitStock(scan.id);
  };

  const imageSrc =
    scan.urlImagen === "mock_warehouse_asset" &&
    warehouseAssetPath
      ? warehouseAssetPath
      : scan.urlImagen;

  const totalDetected = scan.detecciones.reduce(
    (accumulator, current) =>
      accumulator + current.cantidad,
    0,
  );

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
                El reporte {scan.id} fue marcado como
                confirmado.
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

          <div className="flex items-center space-x-3">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-white">
              Reporte de auditoría visual
            </h1>

            <span className="rounded-full border border-teal-500/30 bg-teal-950/40 px-2.5 py-1 font-mono text-xs font-semibold text-teal-400">
              {scan.id}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 rounded-xl border border-slate-800/60 bg-slate-950/45 px-4 py-2.5 font-mono text-xs">
          <div>
            <span className="block text-slate-500">
              FECHA DE AUDITORÍA
            </span>
            <span className="font-semibold text-slate-300">
              {scan.fecha}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div>
            <span className="block text-slate-500">
              SISTEMA
            </span>

            <span className="flex items-center space-x-1 font-semibold uppercase text-teal-400">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              YOLO11n
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <span className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Imagen analizada
          </span>

          <div className="glow-blue relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/60 p-1.5 shadow-2xl backdrop-blur-md">
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-slate-900">
              <img
                src={imageSrc}
                alt="Imagen analizada del almacén"
                className="h-full w-full object-contain"
                referrerPolicy="no-referrer"
                id="audited-image"
              />

              <div className="pointer-events-none absolute inset-4 rounded border border-slate-700/10">
                <div className="absolute left-2 top-2 h-4 w-4 border-l border-t border-slate-500/20" />
                <div className="absolute right-2 top-2 h-4 w-4 border-r border-t border-slate-500/20" />
                <div className="absolute bottom-2 left-2 h-4 w-4 border-b border-l border-slate-500/20" />
                <div className="absolute bottom-2 right-2 h-4 w-4 border-b border-r border-slate-500/20" />
              </div>

              <div className="absolute bottom-3 left-3 rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-300 backdrop-blur-md">
                Imagen original procesada
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
                La visualización de cajas delimitadoras sobre
                la fotografía se implementará en el Sprint 2.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <span className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Desglose cuantitativo
          </span>

          <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-teal-500/5 blur-3xl" />

            <h3 className="mb-4 font-serif text-xl font-medium text-white">
              Objetos contabilizados por IA
            </h3>

            <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/30">
              <table
                className="w-full border-collapse text-left"
                id="detections-table"
              >
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 font-mono text-xs text-slate-400">
                    <th className="px-4 py-3.5 font-semibold uppercase">
                      Categoría
                    </th>

                    <th className="px-4 py-3.5 font-semibold uppercase">
                      Tipo
                    </th>

                    <th className="px-4 py-3.5 text-right font-semibold uppercase">
                      Conteo
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800 font-sans text-sm">
                  {scan.detecciones.map((detection) => {
                    const itemStyle =
                      ITEM_STYLES[detection.item];

                    const Icon = itemStyle.icon;
                    const isHovered =
                      hoveredItem === detection.item;

                    return (
                      <tr
                        key={detection.item}
                        onMouseEnter={() =>
                          setHoveredItem(detection.item)
                        }
                        onMouseLeave={() =>
                          setHoveredItem(null)
                        }
                        className={`cursor-pointer transition-all duration-200 ${
                          isHovered
                            ? "bg-slate-800/60 text-white"
                            : "text-slate-300 hover:bg-slate-900/30"
                        }`}
                      >
                        <td className="flex items-center space-x-2 px-4 py-4 font-semibold capitalize">
                          <span
                            className={`h-2 w-2 rounded-full ${itemStyle.dotColor}`}
                          />
                          <span>{detection.item}</span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            <Icon
                              className={`h-5 w-5 ${itemStyle.textColor}`}
                            />

                            <span className="font-mono text-xs text-slate-500">
                              YOLO_
                              {detection.item.toUpperCase()}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-right font-mono text-base font-bold text-white">
                          <span className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1">
                            {detection.cantidad}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {scan.detecciones.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center font-mono text-xs text-slate-500"
                      >
                        No se detectaron objetos pertenecientes
                        a las categorías del inventario.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center space-x-3">
                <div className="rounded-lg border border-teal-500/20 bg-teal-950 p-2 text-teal-400">
                  <Package className="h-5 w-5" />
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-200">
                    Total de unidades detectadas
                  </h4>

                  <p className="text-xs text-slate-500">
                    Conteo agregado de todas las categorías
                  </p>
                </div>
              </div>

              <span className="font-mono text-2xl font-bold text-teal-400">
                {totalDetected}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold text-slate-200">
            ¿Desea confirmar este reporte?
          </p>

          <p className="text-xs text-slate-400">
            El reporte quedará registrado como un inventario
            validado por el usuario.
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
                : "Confirmar inventario"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
