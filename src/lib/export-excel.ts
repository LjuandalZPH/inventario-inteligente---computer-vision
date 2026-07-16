import type { ScanReport } from "../../types/inventory";

function sanitizeExcelFileName(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function formatDetections(scan: ScanReport): string {
  if (scan.detecciones.length === 0) {
    return "Sin detecciones";
  }

  return scan.detecciones
    .map(
      ({ item, cantidad }) =>
        `${cantidad} ${item}`,
    )
    .join(", ");
}

function getTotalDetections(scan: ScanReport): number {
  return scan.detecciones.reduce(
    (total, detection) => total + detection.cantidad,
    0,
  );
}

export async function downloadScanReportExcel(
  scan: ScanReport,
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const resumenSheet = XLSX.utils.json_to_sheet([
    {
      ID: scan.id,
      Fecha: scan.fecha,
      Confirmado: scan.confirmado ? "SI" : "NO",
      Resumen: scan.warehouseSummary,
      "Tiempo inferencia (ms)":
        scan.inferenceTimeMs ?? "No disponible",
      "Total objetos": getTotalDetections(scan),
    },
  ]);

  const conteosSheet = XLSX.utils.json_to_sheet(
    scan.detecciones.map((detection) => ({
      Categoria: detection.item,
      Cantidad: detection.cantidad,
    })),
  );

  const prediccionesSheet = XLSX.utils.json_to_sheet(
    scan.predicciones.map((prediction) => ({
      Categoria: prediction.className,
      Confianza: prediction.score,
      "Box x1": prediction.box[0],
      "Box y1": prediction.box[1],
      "Box x2": prediction.box[2],
      "Box y2": prediction.box[3],
    })),
  );

  XLSX.utils.book_append_sheet(
    workbook,
    resumenSheet,
    "Resumen",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    conteosSheet,
    "Conteos",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    prediccionesSheet,
    "Predicciones",
  );

  const safeReportId =
    sanitizeExcelFileName(scan.id) || "reporte";

  XLSX.writeFile(
    workbook,
    `reporte-inventario-${safeReportId}.xlsx`,
    {
      bookType: "xlsx",
      type: "array",
      compression: true,
      Props: {
        Subject: "Reporte de inventario visual",
        Author: "SmartInventory",
      },
    },
  );
}

export async function downloadAuditsLogExcel(
  scans: ScanReport[],
): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const auditsSheet = XLSX.utils.json_to_sheet(
    scans.map((scan) => ({
      ID: scan.id,
      Fecha: scan.fecha,
      Objetos: formatDetections(scan),
      "Total objetos": getTotalDetections(scan),
      Estado: scan.confirmado ? "CONFIRMADO" : "PENDIENTE",
      Resumen: scan.warehouseSummary,
    })),
  );

  XLSX.utils.book_append_sheet(
    workbook,
    auditsSheet,
    "Auditorias",
  );

  XLSX.writeFile(workbook, "bitacora-auditorias.xlsx", {
    bookType: "xlsx",
    type: "array",
    compression: true,
    Props: {
      Subject: "Bitacora de auditorias visuales",
      Author: "SmartInventory",
    },
  });
}
