import {
  ArrowUpRight,
  CheckCircle2,
  GlassWater,
  Laptop,
  Package,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";

import type { AllowedItemType } from "../../../types/inventory";

interface InventoryTotalsProps {
  totals: Record<AllowedItemType, number>;
  grandTotal: number;
  confirmedScansCount: number;
}

const CATEGORY_STYLES: Record<
  AllowedItemType,
  {
    label: string;
    description: string;
    textColor: string;
    borderColor: string;
    bgColor: string;
    glowColor: string;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  cajas: {
    label: "Cajas",
    description: "Unidades apiladas o visibles en auditorías.",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/20",
    bgColor: "bg-amber-950/40",
    glowColor: "bg-amber-500/5",
    icon: Package,
  },
  botellas: {
    label: "Botellas",
    description: "Conteo acumulado de botellas detectadas.",
    textColor: "text-sky-400",
    borderColor: "border-sky-500/20",
    bgColor: "bg-sky-950/40",
    glowColor: "bg-sky-500/5",
    icon: GlassWater,
  },
  laptops: {
    label: "Laptops",
    description: "Equipos confirmados en reportes revisados.",
    textColor: "text-indigo-400",
    borderColor: "border-indigo-500/20",
    bgColor: "bg-indigo-950/40",
    glowColor: "bg-indigo-500/5",
    icon: Laptop,
  },
  herramientas: {
    label: "Herramientas",
    description: "Herramientas visibles validadas por el usuario.",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
    bgColor: "bg-emerald-950/40",
    glowColor: "bg-emerald-500/5",
    icon: Wrench,
  },
};

const CATEGORY_ORDER: AllowedItemType[] = [
  "cajas",
  "botellas",
  "laptops",
  "herramientas",
];

export default function InventoryTotals({
  totals,
  grandTotal,
  confirmedScansCount,
}: InventoryTotalsProps) {
  const hasConfirmedInventory = confirmedScansCount > 0;

  return (
    <section
      className="mx-auto max-w-7xl space-y-8"
      id="inventory-totals-view"
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">
            Inventario
          </span>

          <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight text-white">
            Totales por categoría
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Totales acumulados de escaneos confirmados. Los
            escaneos pendientes no afectan este resumen.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4">
          <span className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Escaneos confirmados
          </span>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {confirmedScansCount.toLocaleString()}
            </span>

            <span className="font-mono text-xs text-slate-500">
              registros
            </span>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50 p-6">
        <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Total acumulado
            </span>

            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-5xl font-extrabold tracking-tight text-white">
                {grandTotal.toLocaleString()}
              </span>

              <span className="flex items-center text-sm font-medium text-emerald-400">
                <ArrowUpRight className="mr-1 h-4 w-4" />
                Unidades validadas
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-teal-500/20 bg-teal-950/20 px-4 py-3 text-teal-300">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider">
              Base confirmada por el usuario
            </span>
          </div>
        </div>
      </div>

      {hasConfirmedInventory ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {CATEGORY_ORDER.map((category) => {
            const style = CATEGORY_STYLES[category];
            const Icon = style.icon;

            return (
              <article
                key={category}
                className="glass relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-[1.01]"
              >
                <div
                  className={`pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full ${style.glowColor} blur-2xl`}
                />

                <div className="relative flex h-full flex-col justify-between gap-8">
                  <div className="flex items-center justify-between">
                    <div
                      className={`rounded-xl border p-2.5 ${style.borderColor} ${style.bgColor} ${style.textColor}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${style.borderColor} ${style.bgColor} ${style.textColor}`}
                    >
                      {category}
                    </span>
                  </div>

                  <div>
                    <span className="block font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      {style.label}
                    </span>

                    <span className="mt-1 block text-4xl font-extrabold tracking-tight text-white">
                      {totals[category].toLocaleString()}
                    </span>

                    <p className="mt-3 text-xs leading-relaxed text-slate-500">
                      {style.description}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-14 text-center">
          <h3 className="font-serif text-2xl font-medium text-white">
            Aún no hay inventario confirmado
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
            Carga una imagen, revisa el reporte y confirma el
            inventario para que las unidades aparezcan en este
            resumen.
          </p>
        </div>
      )}
    </section>
  );
}
