/**
 * @file types/inventory.ts
 * @description Domain models and contract definitions for the SmartInventory application state.
 * These types establish the schema used by our services and client applications to manage detected items and reports.
 * 
 * Strict TypeScript compliance is maintained; no 'any' types are permitted.
 */

/**
 * Supported stock categories for classification within the warehouse.
 */
export type AllowedItemType = 'cajas' | 'botellas' | 'laptops' | 'herramientas';

/**
 * Represents a single classified inventory item with its counted quantity.
 */
export interface InventoryItem {
  item: AllowedItemType;
  cantidad: number;
}

/**
 * Represents a complete scan report of a warehouse area, containing
 * classification results, general status, and metadata.
 */
export interface ScanReport {
  id: string;
  fecha: string;
  urlImagen: string;
  detecciones: InventoryItem[];
  warehouseSummary: string;
  confirmado: boolean;
}
