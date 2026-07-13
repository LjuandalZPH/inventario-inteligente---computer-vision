/**
 * @file types/yolo.ts
 * @description Contrato estricto de TypeScript que representa el payload JSON nativo
 * generado por nuestro script de inferencia basado en Ultralytics YOLOv8.
 */

/**
 * Representa una caja de detección individual (Bounding Box) generada por YOLOv8.
 */
export interface YoloPrediction {
  /**
   * Coordenadas de la caja en formato pixel [x_min, y_min, x_max, y_max].
   */
  box: [number, number, number, number];

  /**
   * Puntuación de confianza de la predicción (de 0.0 a 1.0).
   */
  score: number;

  /**
   * ID numérico de la clase según el dataset (ej. COCO dataset).
   */
  classId: number;

  /**
   * Etiqueta original en inglés devuelta por el modelo (ej. "bottle", "suitcase").
   */
  className: string;
}

/**
 * Estructura de la respuesta limpia enviada por el script de Python a Next.js.
 */
export interface YoloInferenceResponse {
  status: 'success' | 'failed';
  predictions: YoloPrediction[];
  /**
   * Tiempo que le tomó al modelo correr la inferencia en la CPU/GPU.
   */
  inferenceTimeMs: number;
}
