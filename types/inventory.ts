export type AllowedItemType =
  | "cajas"
  | "botellas"
  | "laptops"
  | "herramientas";

export interface InventoryItem {
  item: AllowedItemType;
  cantidad: number;
}

export interface InventoryPrediction {
  box: [number, number, number, number];
  score: number;
  classId: number;
  className: AllowedItemType;
}

export interface ScanReport {
  id: string;
  fecha: string;
  urlImagen: string;
  detecciones: InventoryItem[];
  predicciones: InventoryPrediction[];
  warehouseSummary: string;
  confirmado: boolean;
  inferenceTimeMs?: number;
}

export interface ScanResponse extends ScanReport {
  inferenceTimeMs: number;
}

export interface ScanErrorResponse {
  status: "failed";
  error: string;
}
