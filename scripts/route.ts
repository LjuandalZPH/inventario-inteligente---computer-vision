import { NextResponse } from 'next/server';
import { db } from './db';
import type { InventoryScan } from '../src/types/inventory';

export async function POST(request: Request) {
  const scan: InventoryScan = await request.json();
  const operatorId = 'op-001'; // En un sistema real, esto vendría de la sesión del usuario.

  if (!scan || !scan.id || !scan.detecciones) {
    return NextResponse.json({ error: 'Datos de escaneo inválidos.' }, { status: 400 });
  }

  // Obtiene un cliente del pool de conexiones para ejecutar la transacción.
  const client = await db.getClient();

  try {
    // Inicia la transacción
    await client.query('BEGIN');

    // 1. Inserta el registro de auditoría maestro.
    const auditInsertQuery = `
      INSERT INTO scan_audits (id, operator_id, status, image_url, summary)
      VALUES ($1, $2, 'committed', $3, $4)
      RETURNING id;
    `;
    // Usamos el ID del scan del frontend como UUID para la BD para mantener la consistencia.
    // En un escenario real, la BD podría generar su propio UUID.
    const scanIdAsUUID = scan.id.padStart(32, '0').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

    const auditResult = await client.query(auditInsertQuery, [
      scanIdAsUUID,
      operatorId,
      scan.urlImagen,
      scan.warehouseSummary,
    ]);
    const auditId = auditResult.rows[0].id;

    // 2. Itera sobre las detecciones e insértalas en la tabla de items.
    //    También, actualiza el stock maestro en la misma transacción.
    for (const detection of scan.detecciones) {
      const itemInsertQuery = `
        INSERT INTO scan_audit_items (audit_id, category, detected_count, avg_confidence)
        VALUES ($1, $2, $3, $4);
      `;
      // Asumimos una confianza del 95% ya que no la tenemos del frontend.
      await client.query(itemInsertQuery, [auditId, detection.item, detection.cantidad, 95.0]);

      const stockUpdateQuery = `
        UPDATE warehouse_stock
        SET quantity = quantity + $1
        WHERE category = $2;
      `;
      await client.query(stockUpdateQuery, [detection.cantidad, detection.item]);
    }

    // Si todo fue exitoso, confirma la transacción.
    await client.query('COMMIT');

    return NextResponse.json(
      { message: 'Stock comprometido y auditoría guardada exitosamente.', auditId: auditId },
      { status: 200 }
    );
  } catch (error) {
    // Si algo falla, revierte todos los cambios de la transacción.
    await client.query('ROLLBACK');

    console.error('Error en la transacción de commit:', error);
    return NextResponse.json(
      { error: 'Falló la transacción al comprometer el stock.' },
      { status: 500 }
    );
  } finally {
    // Libera al cliente para que vuelva al pool, sin importar el resultado.
    client.release();
  }
}