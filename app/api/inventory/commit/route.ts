import { NextRequest, NextResponse } from 'next/server';
import { Pool, PoolClient } from 'pg';
import crypto from 'crypto';
import { ScanReport } from '@/types/inventory';

// Create a globally accessible PostgreSQL Connection Pool using environmental configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/smartinventory',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

interface CommitRequestPayload {
  report: ScanReport;
  operatorId?: string;
}

const DEFAULT_CONFIDENCES: Record<string, number> = {
  cajas: 94.8,
  botellas: 96.2,
  laptops: 98.5,
  herramientas: 92.1,
};

/**
 * POST /api/inventory/commit
 * Persists an audited visual scan report, saving metadata, breakdown items,
 * and reconciling active warehouse stock balances atomically.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let dbClient: PoolClient | null = null;

  try {
    // 1. Ingest and Validate Request Payload
    const body = (await request.json()) as CommitRequestPayload;
    
    if (!body || !body.report) {
      return NextResponse.json(
        { status: 'failed', error: 'Invalid request body. Expected CommitRequestPayload.' },
        { status: 400 }
      );
    }

    const { report, operatorId = 'op-warehouse-001' } = body;

    // Validate ID presence and structure
    if (!report.id) {
      return NextResponse.json(
        { status: 'failed', error: 'Missing scan report unique identifier (id).' },
        { status: 400 }
      );
    }

    // Ensure audit has detections to reconcile
    if (!report.detecciones || report.detecciones.length === 0) {
      return NextResponse.json(
        { status: 'failed', error: 'Audit report cannot be committed without item detections.' },
        { status: 400 }
      );
    }

    // Determine uuid compliance. If not compliant (e.g. "scan-001"), convert/hash or generate a valid UUID.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(report.id);
    const dbAuditId = isUuid 
      ? report.id 
      : crypto.createHash('md5').update(report.id).digest('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');

    // 2. Establish Database Client Connection
    try {
      dbClient = await pool.connect();
    } catch (connError: any) {
      console.error('[DB CONNECTION ERROR] Failed to lease client from pool:', connError.message || connError);
      return NextResponse.json(
        { 
          status: 'failed', 
          error: 'Could not connect to the database. Verify connection strings.',
          details: connError.message || connError
        },
        { status: 500 }
      );
    }

    // 3. Atomically Execute Transaction
    await dbClient.query('BEGIN');

    // Idempotency: Verify if audit is already committed
    const checkDupResult = await dbClient.query(
      'SELECT status FROM scan_audits WHERE id = $1',
      [dbAuditId]
    );

    if (checkDupResult.rows.length > 0 && checkDupResult.rows[0].status === 'committed') {
      await dbClient.query('ROLLBACK');
      return NextResponse.json(
        { status: 'failed', error: `Audit scan record ${report.id} was already committed and cannot be re-processed.` },
        { status: 409 }
      );
    }

    // Upsert Master record
    await dbClient.query(
      `INSERT INTO scan_audits (id, operator_id, status, image_url, summary)
       VALUES ($1, $2, 'committed', $3, $4)
       ON CONFLICT (id) DO UPDATE SET status = 'committed', summary = EXCLUDED.summary;`,
      [dbAuditId, operatorId, report.urlImagen || null, report.warehouseSummary]
    );

    // Delete existing details if re-running a pending or failed write
    await dbClient.query(
      'DELETE FROM scan_audit_items WHERE audit_id = $1',
      [dbAuditId]
    );

    // Insert breakdown entries and update inventory balances
    for (const det of report.detecciones) {
      const category = det.item.toLowerCase();
      const detectedCount = det.cantidad;
      
      // Attempt to retrieve custom confidence if supplied, else fallback to standard defaults
      const confidence = (det as any).confidence !== undefined 
        ? (det as any).confidence 
        : (DEFAULT_CONFIDENCES[category] || 95.0);

      // Write detail audit item
      await dbClient.query(
        `INSERT INTO scan_audit_items (audit_id, category, detected_count, avg_confidence)
         VALUES ($1, $2, $3, $4);`,
        [dbAuditId, category, detectedCount, confidence]
      );

      // Reconcile Central Warehouse Stock (Physical Inventory Audit Count Overwrite)
      await dbClient.query(
        `INSERT INTO warehouse_stock (category, quantity)
         VALUES ($1, $2)
         ON CONFLICT (category) DO UPDATE SET quantity = EXCLUDED.quantity;`,
        [category, detectedCount]
      );
    }

    // Commit Transaction safely
    await dbClient.query('COMMIT');

    return NextResponse.json(
      { 
        status: 'success', 
        message: 'Stock audit committed and reconciled successfully.',
        auditId: dbAuditId,
        reconciledItems: report.detecciones.map(d => ({ category: d.item, quantity: d.cantidad }))
      },
      { status: 201 }
    );

  } catch (error: any) {
    // 3B. Rollback on Exception
    if (dbClient) {
      try {
        await dbClient.query('ROLLBACK');
      } catch (rollbackErr: any) {
        console.error('[DB ROLLBACK ERROR] Rollback statement execution failed:', rollbackErr.message || rollbackErr);
      }
    }

    console.error('[DB TRANSACTION FAILURE] Stock commit transaction failed and rolled back:', error.message || error);
    
    return NextResponse.json(
      { 
        status: 'failed', 
        error: 'An internal error occurred while committing the stock audit transaction.', 
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  } finally {
    // Release client back to the connection pool
    if (dbClient) {
      dbClient.release();
    }
  }
}
