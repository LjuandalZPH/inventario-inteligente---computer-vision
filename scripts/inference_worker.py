#!/usr/bin/env python3
"""
scripts/inference_worker.py
--------------------------
Production-ready backend inference client optimized for serverless ML runtimes.
Invokes the remote Ultralytics YOLO REST API to execute predictions, avoiding
local model initialization and dependency footprint.

Communication:
- Input: Receives image data through stdin (raw binary bytes or base64 encoded stream)
         or accepts a local file path as the first command-line argument.
- Output: Streams a strictly structured JSON response conforming to the YoloInferenceResponse
          contract directly to standard output (stdout).
"""

import sys
import json
import time
import io
import base64
import os
import urllib.request
import urllib.error
from typing import Dict, List, Any, Optional, Tuple

# Load environment variables from .env if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Nomenclature translation: Map standard COCO class labels to specialized industrial warehouse categories in Spanish.
LABEL_TRANSLATION_MAP: Dict[str, str] = {
    'bottle': 'botellas',
    'laptop': 'laptops',
    'keyboard': 'laptops',
    'suitcase': 'cajas',
    'backpack': 'cajas',
    'handbag': 'cajas',
    'scissors': 'herramientas',
    'scissors/tools': 'herramientas',
    'knife': 'herramientas',
}

CLASS_ID_MAP: Dict[int, str] = {
    39: 'botellas',
    63: 'laptops',
    66: 'laptops',
    28: 'cajas',
    24: 'cajas',
    26: 'cajas',
    76: 'herramientas',
}


def send_response(status: str, predictions: List[Dict[str, Any]], inference_time_ms: float, error_msg: Optional[str] = None) -> None:
    """
    Formatea y escribe la respuesta JSON en stdout.
    Garantiza compatibilidad con el contrato YoloInferenceResponse.
    """
    response = {
        "status": status,
        "predictions": predictions,
        "inferenceTimeMs": round(inference_time_ms, 2)
    }
    if error_msg:
        response["error"] = error_msg
        
    sys.stdout.write(json.dumps(response))
    sys.stdout.flush()


def decode_image_bytes(image_bytes: bytes) -> bytes:
    """
    Normaliza el flujo de bytes decodificando base64 si es necesario.
    Retorna la secuencia limpia de bytes de la imagen lista para la transmisión.
    """
    if not image_bytes:
        return b''
        
    try:
        if image_bytes.startswith(b'data:image'):
            # Strip data URI header
            header, base64_data = image_bytes.split(b',', 1)
            return base64.b64decode(base64_data)
        else:
            # Check if it is a pure base64 stream
            return base64.b64decode(image_bytes, validate=True)
    except Exception:
        # Fallback: Treat as raw image bytes
        return image_bytes


def encode_multipart_formdata(fields: Dict[str, Any], files: Dict[str, Tuple[str, bytes, str]]) -> Tuple[bytes, Dict[str, str]]:
    """
    Construye de forma nativa un payload multipart/form-data.
    Permite subir imágenes binarias sin dependencias externas como requests.
    """
    boundary = b'----SmartInventoryBoundaryYOLOv8InferenceClient'
    lines = []
    
    # Add form fields
    for key, value in fields.items():
        lines.append(b'--' + boundary)
        lines.append(f'Content-Disposition: form-data; name="{key}"'.encode('utf-8'))
        lines.append(b'')
        lines.append(str(value).encode('utf-8'))
        
    # Add binary files
    for key, (filename, content, mimetype) in files.items():
        lines.append(b'--' + boundary)
        lines.append(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"'.encode('utf-8'))
        lines.append(f'Content-Type: {mimetype}'.encode('utf-8'))
        lines.append(b'')
        lines.append(content)
        
    lines.append(b'--' + boundary + b'--')
    lines.append(b'')
    body = b'\r\n'.join(lines)
    
    headers = {
        'Content-Type': f'multipart/form-data; boundary={boundary.decode("utf-8")}',
        'Content-Length': str(len(body))
    }
    return body, headers


def main() -> None:
    start_time = time.time()
    
    # 1. Load configurations from environment variables
    api_key = os.getenv("ULTRALYTICS_API_KEY")
    model_id = os.getenv("ULTRALYTICS_MODEL_ID", "yolov8n") # Fallback default model
    api_url = os.getenv("ULTRALYTICS_API_URL")
    
    # Construct base prediction URL if not explicitly defined
    if not api_url:
        api_url = f"https://api.ultralytics.com/v1/predict/{model_id}"

    # 2. Check Authentication Key
    if not api_key:
        send_response(
            status="failed",
            predictions=[],
            inference_time_ms=(time.time() - start_time) * 1000.0,
            error_msg="La variable de entorno ULTRALYTICS_API_KEY no está configurada. Configure su API key en el archivo .env."
        )
        sys.exit(0)

    # 3. Read image input stream
    image_bytes = b''
    try:
        if len(sys.argv) > 1:
            # Read from local file path argument
            file_path = sys.argv[1]
            with open(file_path, 'rb') as f:
                image_bytes = f.read()
        else:
            # Read image bytes from stdin stream
            image_bytes = sys.stdin.buffer.read()
            
        if not image_bytes:
            raise ValueError("No se recibieron datos de imagen.")
            
        image_bytes = decode_image_bytes(image_bytes)
    except Exception as e:
        send_response(
            status="failed",
            predictions=[],
            inference_time_ms=(time.time() - start_time) * 1000.0,
            error_msg=f"Error al leer/decodificar imagen de entrada: {str(e)}"
        )
        sys.exit(0)

    # 4. Dispatch REST API call
    try:
        inference_start = time.time()
        
        # Prepare parameters and files for transmission
        fields = {"conf": 0.25}
        files = {"file": ("image.jpg", image_bytes, "image/jpeg")}
        
        body, content_headers = encode_multipart_formdata(fields, files)
        
        # Merge headers including Authentication Token
        headers = {
            **content_headers,
            "Authorization": f"Bearer {api_key}",
            "x-api-key": api_key # Fallback header structure
        }
        
        # Setup request object
        req = urllib.request.Request(api_url, data=body, headers=headers, method="POST")
        
        # Execute Remote Request with a 30 second timeout
        with urllib.request.urlopen(req, timeout=30) as response:
            response_bytes = response.read()
            response_json = json.loads(response_bytes.decode("utf-8"))
            
        inference_time_ms = (time.time() - inference_start) * 1000.0

        # 5. Parse and map remote predictions list
        raw_predictions = []
        if isinstance(response_json, list):
            raw_predictions = response_json
        elif isinstance(response_json, dict):
            # Parse common platform JSON wrapper keys
            if "results" in response_json:
                raw_predictions = response_json["results"]
            elif "predictions" in response_json:
                raw_predictions = response_json["predictions"]
            elif "data" in response_json:
                raw_predictions = response_json["data"]
            else:
                # Check if dictionary contains model fields directly
                raw_predictions = [response_json]

        predictions: List[Dict[str, Any]] = []
        
        for pred in raw_predictions:
            if not isinstance(pred, dict):
                continue
                
            # Parse bounding box format (dict or list format support)
            raw_box = pred.get("box", [0, 0, 0, 0])
            box = [0.0, 0.0, 0.0, 0.0]
            if isinstance(raw_box, dict):
                box = [
                    float(raw_box.get("x1", 0)),
                    float(raw_box.get("y1", 0)),
                    float(raw_box.get("x2", 0)),
                    float(raw_box.get("y2", 0))
                ]
            elif isinstance(raw_box, list) and len(raw_box) >= 4:
                box = [float(coord) for coord in raw_box[:4]]

            score = float(pred.get("confidence", pred.get("score", 1.0)))
            class_id = int(pred.get("class", pred.get("classId", 0)))
            orig_name = str(pred.get("name", pred.get("className", "unknown")))
            
            # Map COCO prediction nomenclature to Spanish Warehouse classification
            class_name = orig_name
            if orig_name in LABEL_TRANSLATION_MAP:
                class_name = LABEL_TRANSLATION_MAP[orig_name]
            elif class_id in CLASS_ID_MAP:
                class_name = CLASS_ID_MAP[class_id]

            predictions.append({
                "box": [round(coord, 2) for coord in box],
                "score": round(score, 4),
                "classId": class_id,
                "className": class_name
            })
            
        send_response(
            status="success",
            predictions=predictions,
            inference_time_ms=inference_time_ms
        )

    except urllib.error.HTTPError as he:
        err_msg = he.read().decode("utf-8")
        send_response(
            status="failed",
            predictions=[],
            inference_time_ms=(time.time() - start_time) * 1000.0,
            error_msg=f"La API de Ultralytics reportó error HTTP {he.code}: {err_msg}"
        )
    except Exception as e:
        send_response(
            status="failed",
            predictions=[],
            inference_time_ms=(time.time() - start_time) * 1000.0,
            error_msg=f"Inferencia remota fallida: {str(e)}"
        )


if __name__ == '__main__':
    main()
