import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Database,
  Layers,
  Package,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type {
  InventoryItem,
  ScanReport,
} from "../types/inventory";
import ReportDetail from "./components/inventory/report-detail";
import UploadScanModal from "./components/inventory/upload-modal";

interface ApiHealthResponse {
  status: "ok";
  service: string;
  model: string;
  configured: boolean;
}

type ApiStatus = "checking" | "online" | "offline";

interface ActiveRoute {
  path: "dashboard" | "report";
  id?: string;
}

function createValidatedSummary(
  detections: InventoryItem[],
): string {
  if (detections.length === 0) {
    return "Inventario validado por el usuario sin unidades registradas.";
  }

  const details = detections
    .map(
      ({ item, cantidad }) =>
        `${cantidad} ${item}`,
    )
    .join(", ");

  return `Inventario validado por el usuario. Conteo final: ${details}.`;
}

export default function App() {
  const [scans, setScans] = useState<ScanReport[]>([]);
  const [activeRoute, setActiveRoute] =
    useState<ActiveRoute>({
      path: "dashboard",
    });
  const [isUploadModalOpen, setIsUploadModalOpen] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiStatus, setApiStatus] =
    useState<ApiStatus>("checking");
  const [modelConfigured, setModelConfigured] =
    useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const checkApiHealth = async () => {
      try {
        const response = await fetch("/api/health", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `La API respondió con el código ${response.status}.`,
          );
        }

        const data =
          (await response.json()) as ApiHealthResponse;

        setApiStatus("online");
        setModelConfigured(data.configured);
      } catch (error: unknown) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "No fue posible consultar el estado de la API:",
          error,
        );

        setApiStatus("offline");
        setModelConfigured(false);
      }
    };

    void checkApiHealth();

    return () => {
      controller.abort();
    };
  }, []);

  const filteredScans = useMemo(() => {
    const normalizedQuery = searchQuery
      .trim()
      .toLowerCase();

    if (!normalizedQuery) {
      return scans;
    }

    return scans.filter((scan) => {
      const matchesId = scan.id
        .toLowerCase()
        .includes(normalizedQuery);

      const matchesSummary =
        scan.warehouseSummary
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesItem = scan.detecciones.some(
        (detection) =>
          detection.item.includes(normalizedQuery),
      );

      return matchesId || matchesSummary || matchesItem;
    });
  }, [scans, searchQuery]);

  const totalItemsStored = useMemo(() => {
    return scans
      .filter((scan) => scan.confirmado)
      .reduce((scanTotal, scan) => {
        const reportTotal = scan.detecciones.reduce(
          (itemTotal, detection) =>
            itemTotal + detection.cantidad,
          0,
        );

        return scanTotal + reportTotal;
      }, 0);
  }, [scans]);

  const activeAlertsCount = useMemo(() => {
    return scans.reduce((alertCount, scan) => {
      const boxesDetected =
        scan.detecciones.find(
          (detection) => detection.item === "cajas",
        )?.cantidad ?? 0;

      return boxesDetected > 25
        ? alertCount + 1
        : alertCount;
    }, 0);
  }, [scans]);

  const activeScan = useMemo(() => {
    if (
      activeRoute.path !== "report" ||
      !activeRoute.id
    ) {
      return null;
    }

    return (
      scans.find(
        (scan) => scan.id === activeRoute.id,
      ) ?? null
    );
  }, [activeRoute, scans]);

  const handleScanCreated = (
    newScan: ScanReport,
  ) => {
    setScans((previousScans) => [
      newScan,
      ...previousScans.filter(
        (scan) => scan.id !== newScan.id,
      ),
    ]);

    setIsUploadModalOpen(false);

    setActiveRoute({
      path: "report",
      id: newScan.id,
    });
  };

  const handleCommitStock = (
    scanId: string,
    correctedDetections: InventoryItem[],
  ) => {
    const normalizedDetections =
      correctedDetections
        .filter(
          (detection) =>
            Number.isFinite(detection.cantidad) &&
            detection.cantidad > 0,
        )
        .map((detection) => ({
          ...detection,
          cantidad: Math.trunc(
            detection.cantidad,
          ),
        }));

    setScans((previousScans) =>
      previousScans.map((scan) =>
        scan.id === scanId
          ? {
              ...scan,
              detecciones:
                normalizedDetections,
              warehouseSummary:
                createValidatedSummary(
                  normalizedDetections,
                ),
              confirmado: true,
            }
          : scan,
      ),
    );
  };

  const apiStatusLabel = (() => {
    if (apiStatus === "checking") {
      return "VERIFICANDO API";
    }

    if (apiStatus === "offline") {
      return "API DESCONECTADA";
    }

    return "API CONECTADA";
  })();

  const apiStatusColor = (() => {
    if (apiStatus === "checking") {
      return "bg-amber-400";
    }

    if (apiStatus === "offline") {
      return "bg-red-500";
    }

    return "bg-emerald-500";
  })();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#020617] font-sans text-slate-100 antialiased selection:bg-teal-500/30 selection:text-teal-200">
      <div className="pointer-events-none absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-teal-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 h-[600px] w-[600px] rounded-full bg-sky-500/5 blur-[150px]" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="relative flex min-h-screen flex-col">
        <nav className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/50 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() =>
                setActiveRoute({
                  path: "dashboard",
                })
              }
              className="group flex items-center space-x-3 text-left"
              id="app-branding"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-cyan-600 transition-transform duration-300 group-hover:scale-105">
                <div className="h-4 w-4 border-2 border-white" />
              </div>

              <div>
                <span className="block font-serif text-xl font-bold tracking-tight text-slate-100">
                  SmartInventory
                </span>

                <span className="block font-mono text-[9px] uppercase tracking-widest text-slate-500">
                  YOLO11n Vision Core
                </span>
              </div>
            </button>

            <div className="hidden items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-400 md:flex">
              <button
                type="button"
                onClick={() =>
                  setActiveRoute({
                    path: "dashboard",
                  })
                }
                className={`border-b-2 py-5 transition-colors hover:text-slate-100 ${
                  activeRoute.path === "dashboard"
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent"
                }`}
              >
                Panel
              </button>

              <span className="cursor-not-allowed opacity-40">
                Inventario
              </span>

              <span className="cursor-not-allowed opacity-40">
                Reportes
              </span>

              <span className="cursor-not-allowed opacity-40">
                Configuración
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setIsUploadModalOpen(true)
            }
            className="flex items-center space-x-1 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-cyan-950 transition-colors hover:bg-cyan-500"
            id="new-scan-trigger-btn"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo escaneo</span>
          </button>
        </nav>

        <main className="flex-grow px-4 py-8 md:px-8">
          <AnimatePresence mode="wait">
            {activeRoute.path === "dashboard" ? (
              <motion.div
                key="dashboard-view"
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -15,
                }}
                transition={{
                  duration: 0.3,
                }}
                className="mx-auto max-w-7xl space-y-8"
                id="dashboard-container"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h2 className="font-serif text-3xl font-medium tracking-tight text-white">
                      Panel de monitoreo
                    </h2>

                    <p className="text-sm text-slate-400">
                      Cargue fotografías y consulte los
                      inventarios obtenidos mediante visión por
                      computador.
                    </p>
                  </div>

                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                    <input
                      type="text"
                      placeholder="Buscar por objeto, ID o resumen..."
                      value={searchQuery}
                      onChange={(event) =>
                        setSearchQuery(
                          event.target.value,
                        )
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-sm placeholder-slate-500 transition-colors focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      id="search-scans-input"
                    />
                  </div>
                </div>

                <div
                  className="grid grid-cols-1 gap-6 md:grid-cols-3"
                  id="metrics-grid"
                >
                  <div className="glass teal-glow relative flex flex-col justify-between overflow-hidden rounded-xl p-6 transition-all duration-300 hover:scale-[1.01]">
                    <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-teal-500/5 blur-2xl" />

                    <div className="mb-4 flex items-center justify-between">
                      <div className="rounded-xl border border-teal-500/20 bg-teal-950 p-2.5 text-teal-400">
                        <Package className="h-6 w-6" />
                      </div>

                      <span className="rounded border border-teal-500/20 bg-teal-950/40 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-teal-500">
                        Inventario confirmado
                      </span>
                    </div>

                    <span className="block font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Total de objetos
                    </span>

                    <div className="mt-1 flex items-baseline space-x-2">
                      <span className="font-sans text-4xl font-extrabold tracking-tight text-white">
                        {totalItemsStored.toLocaleString()}
                      </span>

                      <span className="flex items-center text-xs font-medium text-emerald-400">
                        <ArrowUpRight className="mr-0.5 h-3 w-3" />
                        Validados
                      </span>
                    </div>

                    <p className="mt-2 font-mono text-[11px] text-slate-500">
                      Sumatoria de los reportes confirmados
                    </p>
                  </div>

                  <div className="glass relative flex flex-col justify-between overflow-hidden rounded-xl p-6 transition-all duration-300 hover:scale-[1.01]">
                    <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-sky-500/5 blur-2xl" />

                    <div className="mb-4 flex items-center justify-between">
                      <div className="rounded-xl border border-sky-500/20 bg-sky-950 p-2.5 text-sky-400">
                        <Layers className="h-6 w-6" />
                      </div>

                      <span className="rounded border border-sky-500/20 bg-sky-950/40 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-sky-500">
                        Escaneos
                      </span>
                    </div>

                    <span className="block font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Análisis completados
                    </span>

                    <div className="mt-1 flex items-baseline space-x-2">
                      <span className="font-sans text-4xl font-extrabold tracking-tight text-white">
                        {scans.length}
                      </span>

                      <span className="font-mono text-xs text-slate-400">
                        sesión actual
                      </span>
                    </div>

                    <p className="mt-2 font-mono text-[11px] text-slate-500">
                      Auditorías procesadas con YOLO11n
                    </p>
                  </div>

                  <div className="glass relative flex flex-col justify-between overflow-hidden rounded-xl p-6 transition-all duration-300 hover:scale-[1.01]">
                    <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-amber-500/5 blur-2xl" />

                    <div className="mb-4 flex items-center justify-between">
                      <div className="rounded-xl border border-amber-500/20 bg-amber-950 p-2.5 text-amber-400">
                        <AlertTriangle className="h-6 w-6" />
                      </div>

                      <span className="rounded border border-amber-500/20 bg-amber-950/40 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-500">
                        Densidad
                      </span>
                    </div>

                    <span className="block font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Alertas activas
                    </span>

                    <div className="mt-1 flex items-baseline space-x-2">
                      <span className="font-sans text-4xl font-extrabold tracking-tight text-amber-400">
                        {activeAlertsCount
                          .toString()
                          .padStart(2, "0")}
                      </span>

                      <span className="rounded-full bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-500">
                        Más de 25 cajas
                      </span>
                    </div>

                    <p className="mt-2 font-mono text-[11px] text-slate-500">
                      Aviso informativo para conteos elevados
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4.5 w-4.5 text-teal-400" />

                      <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-400">
                        Bitácora de auditorías visuales
                      </span>
                    </div>

                    <span className="font-mono text-xs text-slate-500">
                      {filteredScans.length} registros
                    </span>
                  </div>

                  <div className="glass teal-glow flex flex-col overflow-x-auto rounded-2xl">
                    <table
                      className="w-full min-w-[900px] border-collapse text-left"
                      id="audits-log-table"
                    >
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/40 font-mono text-xs text-slate-400">
                          <th className="px-6 py-4 font-semibold uppercase">
                            ID
                          </th>

                          <th className="px-6 py-4 font-semibold uppercase">
                            Fecha
                          </th>

                          <th className="px-6 py-4 font-semibold uppercase">
                            Objetos
                          </th>

                          <th className="px-6 py-4 font-semibold uppercase">
                            Estado
                          </th>

                          <th className="px-6 py-4 font-semibold uppercase">
                            Resumen
                          </th>

                          <th className="px-6 py-4 text-right font-semibold uppercase">
                            Detalle
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {filteredScans.length > 0 ? (
                          filteredScans.map((scan) => (
                            <tr
                              key={scan.id}
                              onClick={() =>
                                setActiveRoute({
                                  path: "report",
                                  id: scan.id,
                                })
                              }
                              className="group cursor-pointer transition-colors hover:bg-slate-800/20"
                            >
                              <td className="px-6 py-5 font-mono font-bold text-white transition-colors group-hover:text-teal-400">
                                {scan.id}
                              </td>

                              <td className="px-6 py-5 font-mono text-xs text-slate-300">
                                <div className="flex items-center space-x-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                  <span>{scan.fecha}</span>
                                </div>
                              </td>

                              <td className="px-6 py-5">
                                <div className="flex max-w-[280px] flex-wrap gap-1.5">
                                  {scan.detecciones.map(
                                    (detection) => (
                                      <span
                                        key={detection.item}
                                        className="rounded border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-[10px] text-slate-300"
                                      >
                                        {detection.cantidad}{" "}
                                        <span className="text-slate-500">
                                          {detection.item}
                                        </span>
                                      </span>
                                    ),
                                  )}

                                  {scan.detecciones.length ===
                                    0 && (
                                    <span className="font-mono text-[10px] text-slate-500">
                                      Sin detecciones
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="px-6 py-5">
                                {scan.confirmado ? (
                                  <span className="inline-flex items-center space-x-1 rounded border border-teal-500/20 bg-teal-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-teal-400">
                                    <CheckCircle className="h-3 w-3" />
                                    <span>CONFIRMADO</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 rounded-full border border-amber-500/20 bg-amber-950/40 px-2.5 py-1 font-mono text-[10px] font-semibold text-amber-400">
                                    <Database className="h-3 w-3" />
                                    <span>PENDIENTE</span>
                                  </span>
                                )}
                              </td>

                              <td className="max-w-xs truncate px-6 py-5 font-sans text-xs text-slate-400">
                                {scan.warehouseSummary}
                              </td>

                              <td className="px-6 py-5 text-right">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();

                                    setActiveRoute({
                                      path: "report",
                                      id: scan.id,
                                    });
                                  }}
                                  className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-800/80 bg-slate-950 px-3 py-1.5 font-mono text-xs text-teal-400 transition-all hover:text-teal-300 group-hover:border-teal-500/40 group-hover:bg-slate-900/50"
                                >
                                  <span>Ver</span>
                                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-12 text-center font-mono text-sm text-slate-500"
                            >
                              {scans.length === 0
                                ? "Aún no se han realizado escaneos. Cargue una imagen para comenzar."
                                : "No se encontraron registros que coincidan con la búsqueda."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 p-6 md:flex-row">
                  <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-teal-500 via-sky-500 to-indigo-500" />

                  <div className="space-y-1">
                    <h4 className="flex items-center space-x-2 font-serif text-lg font-medium text-white">
                      <Sparkles className="h-4.5 w-4.5 text-teal-400" />
                      <span>
                        ¿Cómo funciona SmartInventory?
                      </span>
                    </h4>

                    <p className="max-w-2xl text-xs leading-relaxed text-slate-400">
                      El usuario carga una fotografía, el
                      backend la envía al modelo YOLO11n y la
                      aplicación presenta el conteo agrupado por
                      categoría. En esta primera versión se
                      admiten cajas, botellas, laptops y
                      herramientas.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsUploadModalOpen(true)
                    }
                    className="inline-flex flex-shrink-0 items-center space-x-2 rounded-xl border border-slate-800 bg-slate-900 px-5 py-3 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                  >
                    <span>Realizar escaneo</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="report-view"
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -15,
                }}
                transition={{
                  duration: 0.3,
                }}
              >
                {activeScan ? (
                  <ReportDetail
                    scan={activeScan}
                    onBackToDashboard={() =>
                      setActiveRoute({
                        path: "dashboard",
                      })
                    }
                    onCommitStock={handleCommitStock}
                  />
                ) : (
                  <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/20 p-10 text-center">
                    <p className="text-sm text-slate-400">
                      El reporte solicitado no está disponible.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveRoute({
                          path: "dashboard",
                        })
                      }
                      className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                    >
                      Volver al panel
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="flex min-h-10 items-center justify-between gap-4 border-t border-slate-800 bg-slate-950 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-500 md:px-8">
          <div className="flex flex-wrap gap-4 md:gap-6">
            <span className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${apiStatusColor} ${
                  apiStatus === "checking"
                    ? "animate-pulse"
                    : ""
                }`}
              />
              {apiStatusLabel}
            </span>

            <span>
              MODELO:{" "}
              {modelConfigured
                ? "CONFIGURADO"
                : "PENDIENTE"}
            </span>
          </div>

          <div className="flex gap-4 md:gap-6">
            <span>SPRINT 1</span>

            <span className="flex items-center gap-1.5 text-teal-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" />
              YOLO11n
            </span>
          </div>
        </footer>

        <AnimatePresence>
          {isUploadModalOpen && (
            <UploadScanModal
              isOpen={isUploadModalOpen}
              onClose={() =>
                setIsUploadModalOpen(false)
              }
              onScanCreated={handleScanCreated}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
