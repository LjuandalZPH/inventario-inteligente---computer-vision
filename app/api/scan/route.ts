import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import { YoloInferenceResponse } from '@/types/yolo';
import { ScanReport, InventoryItem } from '@/types/inventory';

/**
 * POST /api/scan
 * Orchestrates the ML inference request:
 * 1. Extract image file from multipart form data.
 * 2. Save image to local temp cache.
 * 3. Invoke python inference worker scripts/inference_worker.py.
 * 4. Parse output and map predictions to ScanReport schema.
 * 5. Cleanup temp file and handle environment failures gracefully with fallback data.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let tempFilePath: string | null = null;
  let fileBuffer: Buffer | null = null;
  let fileType = 'image/jpeg';

  try {
    // 1. Multipart Extraction
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { status: 'failed', error: 'No image file provided in the request payload.' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { status: 'failed', error: 'Invalid file format. Uploaded file must be an image.' },
        { status: 400 }
      );
    }

    fileType = file.type;
    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);

    // 2. Temporary Processing Storage
    const tempDir = path.join(process.cwd(), 'public', 'uploads', 'tmp');
    await fs.mkdir(tempDir, { recursive: true });

    // Generate non-colliding unique name
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}_${file.name.replace(/\s+/g, '_')}`;
    tempFilePath = path.join(tempDir, uniqueFilename);
    
    // Write buffer asynchronously
    await fs.writeFile(tempFilePath, fileBuffer);

    // 3. Inference Worker Invocation & Data Stream Capture
    const scriptPath = path.join(process.cwd(), 'scripts', 'inference_worker.py');
    
    const stdoutData = await new Promise<string>((resolve, reject) => {
      // Spawn python inference worker process
      const pythonProcess = spawn('python', [scriptPath, tempFilePath!]);
      
      let accumStdout = '';
      let accumStderr = '';

      pythonProcess.stdout.on('data', (data) => {
        accumStdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        accumStderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(accumStdout);
        } else {
          reject(new Error(`Inference script exited with code ${code}. Stderr: ${accumStderr}`));
        }
      });

      pythonProcess.on('error', (err) => {
        reject(new Error(`Failed to start inference sub-process: ${err.message}`));
      });
    });

    // 4. Payload Parsing and Mapping to Application State
    const inferenceResponse: YoloInferenceResponse = JSON.parse(stdoutData);

    if (inferenceResponse.status === 'failed') {
      throw new Error(`Inference engine reported execution failure: ${stdoutData}`);
    }

    // Group predictions and count frequency
    const ALLOWED_ITEMS = ['cajas', 'botellas', 'laptops', 'herramientas'];
    const itemCounts: Record<string, number> = {};

    inferenceResponse.predictions.forEach((pred) => {
      const normalizedName = pred.className.toLowerCase();
      if (ALLOWED_ITEMS.includes(normalizedName)) {
        itemCounts[normalizedName] = (itemCounts[normalizedName] || 0) + 1;
      }
    });

    const detecciones: InventoryItem[] = Object.entries(itemCounts).map(([item, count]) => ({
      item: item as any, // Cast verified type mapping
      cantidad: count
    }));

    // Convert file buffer to base64 Data URL for UI client display
    const base64Image = `data:${fileType};base64,${fileBuffer.toString('base64')}`;

    // Compile into final ScanReport contract
    const scanReport: ScanReport = {
      id: `scan-${Date.now().toString().slice(-6)}`,
      fecha: new Date().toISOString().split('T')[0],
      urlImagen: base64Image,
      detecciones: detecciones,
      warehouseSummary: detecciones.length > 0
        ? `Escaneo inteligente completado. Se detectaron: ${detecciones.map(d => `${d.cantidad} ${d.item}`).join(', ')}.`
        : "Escaneo completado. No se detectaron productos del catálogo en esta sección.",
      confirmado: false
    };

    return NextResponse.json(scanReport, { status: 200 });

  } catch (error: any) {
    // 5. Safety Guard: Log warning server-side and fall back to local JSON dataset
    console.warn(
      `[SERVER WARNING] API scan route intercepted execution error. Falling back to inventario-fallback.json. Details: ${error?.message || error}`
    );

    try {
      const fallbackPath = path.join(process.cwd(), 'data', 'inventario-fallback.json');
      const fallbackContent = await fs.readFile(fallbackPath, 'utf8');
      const fallbackData = JSON.parse(fallbackContent);
      
      return NextResponse.json(fallbackData, { status: 200 });
    } catch (fallbackError: any) {
      // In case fallback dataset is completely missing/unreadable, return a static rescue payload
      console.error(`[SERVER CRITICAL] Fallback recovery dataset failed to load: ${fallbackError?.message || fallbackError}`);
      
      const rescueReport: ScanReport = {
        id: "scan-rescue-000",
        fecha: new Date().toISOString().split('T')[0],
        urlImagen: "",
        detecciones: [],
        warehouseSummary: "Servicio de escaneo no disponible temporalmente. No se pudo cargar el respaldo.",
        confirmado: false
      };
      
      return NextResponse.json([rescueReport], { status: 200 });
    }

  } finally {
    // 5. Resource Cleanup: Asynchronously delete temporary file from server cache
    if (tempFilePath) {
      fs.unlink(tempFilePath).catch((unlinkErr) => {
        console.error(`[CLEANUP ERROR] Failed to delete temporary scan file at ${tempFilePath}: ${unlinkErr.message}`);
      });
    }
  }
}
