import "dotenv/config";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import multer from "multer";

import type {
  AllowedItemType,
  InventoryItem,
  ScanReport,
} from "./types/inventory";
import type { YoloInferenceResponse } from "./types/yolo";

// ----------------------------------------------------
// CONFIGURACIÓN GENERAL
// ----------------------------------------------------

const app = express();
const PORT = Number(process.env.API_PORT ?? 3001);

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);

const inferenceWorkerPath = path.join(
  currentDirectory,
  "scripts",
  "inference_worker.py",
);

const modelName =
  process.env.YOLO_MODEL?.trim() || "yolo11n.pt";

const allowedCategories = new Set<AllowedItemType>([
  "cajas",
  "botellas",
  "laptops",
  "herramientas",
]);

type WorkerResponse = YoloInferenceResponse & {
  error?: string;
};

interface PythonExecutionResult {
  standardOutput: string;
  standardError: string;
}

// ----------------------------------------------------
// CONFIGURACIÓN DE MULTER
// ----------------------------------------------------

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
]);

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 8 * 1024 * 1024,
  },

  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new Error(
          "Formato no permitido. Solo se aceptan imágenes JPG, JPEG o PNG.",
        ),
      );
      return;
    }

    callback(null, true);
  },
});

app.use(express.json());

// ----------------------------------------------------
// CONFIGURACIÓN Y EJECUCIÓN DE PYTHON
// ----------------------------------------------------

function normalizePythonCommand(
  command: string,
): string {
  const containsPathSeparator =
    command.includes("/") || command.includes("\\");

  if (
    containsPathSeparator &&
    !path.isAbsolute(command)
  ) {
    return path.resolve(currentDirectory, command);
  }

  return command;
}

function getPossiblePythonCommands(): string[] {
  const customPythonCommand =
    process.env.PYTHON_COMMAND?.trim();

  if (customPythonCommand) {
    return [
      normalizePythonCommand(customPythonCommand),
    ];
  }

  return process.platform === "win32"
    ? ["py", "python"]
    : ["python3", "python"];
}

function isLocalConfigurationReady(): boolean {
  if (!existsSync(inferenceWorkerPath)) {
    return false;
  }

  const customPythonCommand =
    process.env.PYTHON_COMMAND?.trim();

  if (!customPythonCommand) {
    return true;
  }

  const containsPathSeparator =
    customPythonCommand.includes("/") ||
    customPythonCommand.includes("\\");

  if (!containsPathSeparator) {
    return true;
  }

  return existsSync(
    normalizePythonCommand(customPythonCommand),
  );
}

function executePythonCommand(
  command: string,
  imageBuffer: Buffer,
): Promise<PythonExecutionResult> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(
      command,
      [inferenceWorkerPath],
      {
        cwd: currentDirectory,
        env: process.env,
        windowsHide: true,
      },
    );

    let standardOutput = "";
    let standardError = "";

    pythonProcess.stdout.on(
      "data",
      (data: Buffer) => {
        standardOutput += data.toString();
      },
    );

    pythonProcess.stderr.on(
      "data",
      (data: Buffer) => {
        standardError += data.toString();
      },
    );

    pythonProcess.on(
      "error",
      (error: NodeJS.ErrnoException) => {
        reject(error);
      },
    );

    pythonProcess.on("close", (exitCode) => {
      if (exitCode !== 0) {
        reject(
          new Error(
            `El proceso de Python terminó con código ${exitCode}. ${standardError}`,
          ),
        );
        return;
      }

      if (!standardOutput.trim()) {
        reject(
          new Error(
            standardError.trim() ||
              "El proceso de Python no devolvió ningún resultado.",
          ),
        );
        return;
      }

      resolve({
        standardOutput,
        standardError,
      });
    });

    pythonProcess.stdin.write(imageBuffer);
    pythonProcess.stdin.end();
  });
}

async function runInferenceWorker(
  imageBuffer: Buffer,
): Promise<WorkerResponse> {
  const possibleCommands =
    getPossiblePythonCommands();

  let lastError: unknown = null;

  for (const command of possibleCommands) {
    try {
      const {
        standardOutput,
        standardError,
      } = await executePythonCommand(
        command,
        imageBuffer,
      );

      let parsedResponse: WorkerResponse;

      try {
        parsedResponse = JSON.parse(
          standardOutput,
        ) as WorkerResponse;
      } catch {
        throw new Error(
          `El worker de Python devolvió una respuesta JSON inválida. Salida: ${standardOutput.slice(
            0,
            500,
          )}. Detalle: ${standardError.slice(0, 500)}`,
        );
      }

      if (
        !parsedResponse ||
        !Array.isArray(
          parsedResponse.predictions,
        ) ||
        typeof parsedResponse.status !== "string"
      ) {
        throw new Error(
          "La respuesta del worker no cumple con el formato esperado.",
        );
      }

      return parsedResponse;
    } catch (error) {
      lastError = error;

      const commandError =
        error as NodeJS.ErrnoException;

      if (commandError.code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `No se encontró una instalación válida de Python. ${
      lastError instanceof Error
        ? lastError.message
        : ""
    }`,
  );
}

// ----------------------------------------------------
// CONSTRUCCIÓN DEL INVENTARIO
// ----------------------------------------------------

function groupPredictions(
  inferenceResponse: WorkerResponse,
): InventoryItem[] {
  const counts = new Map<
    AllowedItemType,
    number
  >();

  for (const prediction of inferenceResponse.predictions) {
    const category =
      prediction.className
        .toLowerCase()
        .trim() as AllowedItemType;

    if (!allowedCategories.has(category)) {
      continue;
    }

    counts.set(
      category,
      (counts.get(category) ?? 0) + 1,
    );
  }

  return Array.from(counts.entries()).map(
    ([item, cantidad]) => ({
      item,
      cantidad,
    }),
  );
}

function createWarehouseSummary(
  detections: InventoryItem[],
): string {
  if (detections.length === 0) {
    return "El análisis finalizó correctamente, pero YOLO11n no detectó objetos pertenecientes a las categorías habilitadas para el MVP.";
  }

  const details = detections
    .map(
      ({ item, cantidad }) =>
        `${cantidad} ${item}`,
    )
    .join(", ");

  return `Escaneo completado con YOLO11n. Se detectaron: ${details}.`;
}

// ----------------------------------------------------
// RUTAS DE LA API
// ----------------------------------------------------

app.get(
  "/api/health",
  (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "SmartInventory API",
      mode: "local",
      model: modelName,
      configured:
        isLocalConfigurationReady(),
    });
  },
);

app.post(
  "/api/scan",
  upload.single("file"),
  async (
    request: Request,
    response: Response,
  ) => {
    if (!request.file) {
      response.status(400).json({
        status: "failed",
        error:
          "No se recibió ninguna imagen.",
      });
      return;
    }

    try {
      const inferenceResponse =
        await runInferenceWorker(
          request.file.buffer,
        );

      if (
        inferenceResponse.status === "failed"
      ) {
        response.status(500).json({
          status: "failed",
          error:
            inferenceResponse.error ??
            "El motor local de inferencia no pudo procesar la imagen.",
        });
        return;
      }

      const detections = groupPredictions(
        inferenceResponse,
      );

      const base64Image =
        request.file.buffer.toString("base64");

      const imageDataUrl =
        `data:${request.file.mimetype};base64,${base64Image}`;

      const scanReport: ScanReport = {
        id: `scan-${Date.now()}`,
        fecha: new Date()
          .toISOString()
          .split("T")[0],
        urlImagen: imageDataUrl,
        detecciones: detections,
        warehouseSummary:
          createWarehouseSummary(detections),
        confirmado: false,
      };

      response.status(200).json({
        ...scanReport,
        inferenceTimeMs:
          inferenceResponse.inferenceTimeMs,
      });
    } catch (error) {
      console.error(
        "Error al procesar el escaneo:",
        error,
      );

      response.status(500).json({
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error desconocido durante el análisis.",
      });
    }
  },
);

// ----------------------------------------------------
// MANEJO DE ERRORES DE CARGA
// ----------------------------------------------------

app.use(
  (
    error: Error,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    if (error instanceof multer.MulterError) {
      if (
        error.code === "LIMIT_FILE_SIZE"
      ) {
        response.status(400).json({
          status: "failed",
          error:
            "La imagen supera el tamaño máximo permitido de 8 MB.",
        });
        return;
      }

      response.status(400).json({
        status: "failed",
        error: `Error al cargar la imagen: ${error.message}`,
      });
      return;
    }

    response.status(400).json({
      status: "failed",
      error: error.message,
    });
  },
);

// ----------------------------------------------------
// INICIAR SERVIDOR
// ----------------------------------------------------

app.listen(PORT, () => {
  console.log(
    `SmartInventory API ejecutándose en http://localhost:${PORT}`,
  );
  console.log(
    `Inferencia local configurada con ${modelName}`,
  );
  console.log(
    `Estado del servidor: http://localhost:${PORT}/api/health`,
  );
});
