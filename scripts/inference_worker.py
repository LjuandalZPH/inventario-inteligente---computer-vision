#!/usr/bin/env python3
"""
scripts/inference_worker.py

Ejecuta inferencia local con Ultralytics YOLO11n.

Entrada:
- Bytes binarios de una imagen mediante stdin.
- Opcionalmente, una ruta de imagen como primer argumento.

Salida:
- Un único objeto JSON por stdout.
- Los mensajes internos de Ultralytics se redirigen a stderr para no
  interferir con la respuesta JSON que espera server.ts.
"""

from __future__ import annotations

import io
import json
import os
import sys
import time
from contextlib import redirect_stdout
from pathlib import Path
from typing import Any

from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO


# Traducción temporal de clases COCO a las categorías actuales del MVP.
#
# Importante:
# - "bottle" y "laptop" sí corresponden directamente.
# - "scissors" se usa como ejemplo de herramienta.
# - "backpack", "handbag" y "suitcase" se muestran como "cajas" únicamente
#   para validar el flujo del MVP; no equivalen a cajas de cartón.
CLASS_TRANSLATION: dict[str, str] = {
    "bottle": "botellas",
    "laptop": "laptops",
    "scissors": "herramientas",
    "backpack": "cajas",
    "handbag": "cajas",
    "suitcase": "cajas",
}


def send_response(
    *,
    status: str,
    predictions: list[dict[str, Any]],
    inference_time_ms: float,
    error: str | None = None,
) -> None:
    """Escribe una respuesta JSON limpia en stdout."""

    payload: dict[str, Any] = {
        "status": status,
        "predictions": predictions,
        "inferenceTimeMs": round(inference_time_ms, 2),
    }

    if error:
        payload["error"] = error

    sys.stdout.write(
        json.dumps(
            payload,
            ensure_ascii=False,
            separators=(",", ":"),
        )
    )
    sys.stdout.flush()


def read_image_bytes() -> bytes:
    """Lee la imagen desde una ruta o desde stdin."""

    if len(sys.argv) > 1:
        image_path = Path(sys.argv[1])

        if not image_path.is_file():
            raise FileNotFoundError(
                f"No se encontró la imagen: {image_path}"
            )

        return image_path.read_bytes()

    return sys.stdin.buffer.read()


def open_image(image_bytes: bytes) -> Image.Image:
    """Valida y abre la imagen con Pillow."""

    if not image_bytes:
        raise ValueError("No se recibieron datos de imagen.")

    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
        return image.convert("RGB")
    except UnidentifiedImageError as exc:
        raise ValueError(
            "El archivo recibido no es una imagen válida."
        ) from exc


def get_model_name() -> str:
    """Obtiene el modelo configurado para el MVP."""

    return os.getenv("YOLO_MODEL", "yolo11n.pt").strip() or "yolo11n.pt"


def get_confidence() -> float:
    """Obtiene y valida el umbral de confianza."""

    raw_value = os.getenv("YOLO_CONFIDENCE", "0.35").strip()

    try:
        confidence = float(raw_value)
    except ValueError as exc:
        raise ValueError(
            "YOLO_CONFIDENCE debe ser un número entre 0 y 1."
        ) from exc

    if not 0.0 <= confidence <= 1.0:
        raise ValueError(
            "YOLO_CONFIDENCE debe estar entre 0 y 1."
        )

    return confidence


def run_inference(image: Image.Image) -> tuple[list[dict[str, Any]], float]:
    """Carga YOLO11n, analiza la imagen y normaliza las detecciones."""

    model_name = get_model_name()
    confidence = get_confidence()
    device = os.getenv("YOLO_DEVICE", "").strip()

    # Ultralytics puede imprimir mensajes al cargar o descargar el modelo.
    # Los enviamos a stderr para mantener stdout reservado para el JSON.
    with redirect_stdout(sys.stderr):
        model = YOLO(model_name)

    prediction_options: dict[str, Any] = {
        "source": image,
        "conf": confidence,
        "verbose": False,
    }

    if device:
        prediction_options["device"] = device

    prediction_start = time.perf_counter()

    with redirect_stdout(sys.stderr):
        results = model.predict(**prediction_options)

    inference_time_ms = (
        time.perf_counter() - prediction_start
    ) * 1000.0

    if not results:
        return [], inference_time_ms

    result = results[0]
    boxes = result.boxes

    if boxes is None or len(boxes) == 0:
        return [], inference_time_ms

    coordinates = boxes.xyxy.cpu().tolist()
    confidences = boxes.conf.cpu().tolist()
    class_ids = boxes.cls.cpu().tolist()

    predictions: list[dict[str, Any]] = []

    for raw_box, raw_score, raw_class_id in zip(
        coordinates,
        confidences,
        class_ids,
    ):
        class_id = int(raw_class_id)
        original_class_name = str(
            result.names[class_id]
        ).strip().lower()

        mapped_class_name = CLASS_TRANSLATION.get(
            original_class_name
        )

        # El MVP solo conserva las clases que puede mostrar en su inventario.
        if mapped_class_name is None:
            continue

        predictions.append(
            {
                "box": [
                    round(float(value), 2)
                    for value in raw_box[:4]
                ],
                "score": round(float(raw_score), 4),
                "classId": class_id,
                "className": mapped_class_name,
            }
        )

    return predictions, inference_time_ms


def main() -> None:
    worker_start = time.perf_counter()

    try:
        image_bytes = read_image_bytes()
        image = open_image(image_bytes)

        predictions, inference_time_ms = run_inference(
            image
        )

        send_response(
            status="success",
            predictions=predictions,
            inference_time_ms=inference_time_ms,
        )

    except Exception as exc:
        total_time_ms = (
            time.perf_counter() - worker_start
        ) * 1000.0

        send_response(
            status="failed",
            predictions=[],
            inference_time_ms=total_time_ms,
            error=f"No fue posible ejecutar YOLO11n: {exc}",
        )


if __name__ == "__main__":
    main()