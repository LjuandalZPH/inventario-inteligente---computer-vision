import type {
  AllowedItemType,
  InventoryItem,
  InventoryPrediction,
  ScanReport,
} from "../../types/inventory";

const DB_NAME = "smart-inventory";
const DB_VERSION = 1;
const STORE_NAME = "scans";

const ALLOWED_ITEMS = new Set<AllowedItemType>([
  "cajas",
  "botellas",
  "laptops",
  "herramientas",
]);

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ??
          new Error("No fue posible abrir IndexedDB."),
      );
    };
  });
}

function isAllowedItem(value: unknown): value is AllowedItemType {
  return (
    typeof value === "string" &&
    ALLOWED_ITEMS.has(value as AllowedItemType)
  );
}

function isInventoryItem(value: unknown): value is InventoryItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Partial<InventoryItem>;

  return (
    isAllowedItem(item.item) &&
    typeof item.cantidad === "number" &&
    Number.isFinite(item.cantidad)
  );
}

function isInventoryPrediction(
  value: unknown,
): value is InventoryPrediction {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const prediction = value as Partial<InventoryPrediction>;

  return (
    Array.isArray(prediction.box) &&
    prediction.box.length === 4 &&
    prediction.box.every(
      (coordinate) =>
        typeof coordinate === "number" &&
        Number.isFinite(coordinate),
    ) &&
    typeof prediction.score === "number" &&
    Number.isFinite(prediction.score) &&
    typeof prediction.classId === "number" &&
    Number.isFinite(prediction.classId) &&
    isAllowedItem(prediction.className)
  );
}

function isScanReport(value: unknown): value is ScanReport {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const scan = value as Partial<ScanReport>;

  return (
    typeof scan.id === "string" &&
    scan.id.length > 0 &&
    typeof scan.fecha === "string" &&
    typeof scan.urlImagen === "string" &&
    Array.isArray(scan.detecciones) &&
    scan.detecciones.every(isInventoryItem) &&
    Array.isArray(scan.predicciones) &&
    scan.predicciones.every(isInventoryPrediction) &&
    typeof scan.warehouseSummary === "string" &&
    typeof scan.confirmado === "boolean" &&
    (scan.inferenceTimeMs === undefined ||
      (typeof scan.inferenceTimeMs === "number" &&
        Number.isFinite(scan.inferenceTimeMs)))
  );
}

function normalizeScan(scan: ScanReport): ScanReport {
  return {
    id: scan.id,
    fecha: scan.fecha,
    urlImagen: scan.urlImagen,
    detecciones: scan.detecciones.map((detection) => ({
      item: detection.item,
      cantidad: Math.trunc(detection.cantidad),
    })),
    predicciones: scan.predicciones.map((prediction) => ({
      box: [
        prediction.box[0],
        prediction.box[1],
        prediction.box[2],
        prediction.box[3],
      ],
      score: prediction.score,
      classId: prediction.classId,
      className: prediction.className,
    })),
    warehouseSummary: scan.warehouseSummary,
    confirmado: scan.confirmado,
    ...(scan.inferenceTimeMs !== undefined
      ? { inferenceTimeMs: scan.inferenceTimeMs }
      : {}),
  };
}

export async function loadScans(): Promise<ScanReport[]> {
  if (typeof indexedDB === "undefined") {
    return [];
  }

  const database = await openDatabase();

  try {
    const records = await new Promise<unknown[]>(
      (resolve, reject) => {
        const transaction = database.transaction(
          STORE_NAME,
          "readonly",
        );
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(
            Array.isArray(request.result)
              ? request.result
              : [],
          );
        };

        request.onerror = () => {
          reject(
            request.error ??
              new Error(
                "No fue posible leer los escaneos guardados.",
              ),
          );
        };
      },
    );

    return records
      .filter(isScanReport)
      .map(normalizeScan)
      .sort((left, right) =>
        right.fecha.localeCompare(left.fecha) ||
        right.id.localeCompare(left.id),
      );
  } finally {
    database.close();
  }
}

export async function persistScans(
  scans: ScanReport[],
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }

  const normalizedScans = scans
    .filter(isScanReport)
    .map(normalizeScan);

  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readwrite",
      );
      const store = transaction.objectStore(STORE_NAME);

      store.clear();

      for (const scan of normalizedScans) {
        store.put(scan);
      }

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ??
            new Error(
              "No fue posible guardar los escaneos.",
            ),
        );
      };

      transaction.onabort = () => {
        reject(
          transaction.error ??
            new Error(
              "La transacción de guardado fue abortada.",
            ),
        );
      };
    });
  } finally {
    database.close();
  }
}
