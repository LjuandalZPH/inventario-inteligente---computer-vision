/**
 * @file types/inventory.ts
 * @description Define los tipos utilizados para representar
 * los artículos detectados y los reportes del inventario.
 */

/**
 * Categorías que reconocerá el MVP.
 */
export type AllowedItemType =
  | 'cajas'
  | 'botellas'
  | 'laptops'
  | 'herramientas';

/**
 * Representa una categoría detectada y su cantidad.
 */
export interface InventoryItem {
  /**
   * Nombre de la categoría detectada.
   */
  item: AllowedItemType;

  /**
   * Cantidad de objetos encontrados.
   */
  cantidad: number;
}

/**
 * Representa el reporte generado después de analizar una imagen.
 */
export interface ScanReport {
  /**
   * Identificador único del escaneo.
   */
  id: string;

  /**
   * Fecha en la que se realizó el análisis.
   */
  fecha: string;

  /**
   * Imagen analizada en formato URL o data URL.
   */
  urlImagen: string;

  /**
   * Conteo de los objetos detectados por categoría.
   */
  detecciones: InventoryItem[];

  /**
   * Resumen textual de los resultados.
   */
  warehouseSummary: string;

  /**
   * Indica si los resultados fueron confirmados por el usuario.
   */
  confirmado: boolean;
}

/**
 * Respuesta exitosa enviada por la API al frontend.
 */
export interface ScanResponse extends ScanReport {
  /**
   * Tiempo empleado por el modelo para procesar la imagen.
   */
  inferenceTimeMs: number;
}

/**
 * Respuesta enviada por la API cuando ocurre un error.
 */
export interface ScanErrorResponse {
  status: 'failed';
  error: string;
}