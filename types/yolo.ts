/**
 * @file types/yolo.ts
 * @description Define la estructura de los resultados generados
 * por el servicio de inferencia con Ultralytics YOLO11.
 */

/**
 * Representa un objeto individual detectado por YOLO11.
 */
export interface YoloPrediction {
  /**
   * Coordenadas de la caja delimitadora en píxeles:
   * [xMin, yMin, xMax, yMax].
   */
  box: [number, number, number, number];

  /**
   * Nivel de confianza de la detección.
   * El valor se encuentra entre 0 y 1.
   */
  score: number;

  /**
   * Identificador numérico de la clase detectada.
   */
  classId: number;

  /**
   * Nombre de la categoría detectada.
   *
   * Para el MVP puede contener:
   * - cajas
   * - botellas
   * - laptops
   * - herramientas
   */
  className: string;
}

/**
 * Respuesta enviada por el script de Python al backend de Express.
 */
export interface YoloInferenceResponse {
  /**
   * Indica si la inferencia terminó correctamente.
   */
  status: 'success' | 'failed';

  /**
   * Lista de objetos identificados en la imagen.
   * Estará vacía cuando no se detecten objetos o ocurra un error.
   */
  predictions: YoloPrediction[];

  /**
   * Tiempo aproximado empleado en realizar la inferencia,
   * expresado en milisegundos.
   */
  inferenceTimeMs: number;

  /**
   * Mensaje descriptivo cuando la inferencia falla.
   */
  error?: string;
}