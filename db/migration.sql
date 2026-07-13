-- ============================================================================
-- SQL Migration Script: SmartInventory AI Scan Persistence Layer
-- Target Database: PostgreSQL 14+
-- Description: Sets up tables for logging scan audit metadata, individual item
--              detections, and central warehouse stock synchronization.
-- ============================================================================

BEGIN;

-- 1. Create custom ENUM types for application state consistency
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_status') THEN
        CREATE TYPE audit_status AS ENUM ('pending', 'committed', 'overridden');
    END IF;
END$$;

-- 2. Central Stock Inventory Table
CREATE TABLE IF NOT EXISTS warehouse_stock (
    category VARCHAR(50) PRIMARY KEY,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial stock for classification items
INSERT INTO warehouse_stock (category, quantity)
VALUES 
    ('cajas', 120),
    ('botellas', 340),
    ('laptops', 15),
    ('herramientas', 85)
ON CONFLICT (category) DO NOTHING;

-- 3. Scan Audits Master Table
CREATE TABLE IF NOT EXISTS scan_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status audit_status NOT NULL DEFAULT 'pending',
    image_url TEXT, -- Base64 representation or cloud storage URL pointer
    summary TEXT
);

-- 4. Scan Audit Items Details Table
CREATE TABLE IF NOT EXISTS scan_audit_items (
    id BIGSERIAL PRIMARY KEY,
    audit_id UUID NOT NULL REFERENCES scan_audits(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('cajas', 'botellas', 'laptops', 'herramientas')),
    detected_count INTEGER NOT NULL CHECK (detected_count >= 0),
    avg_confidence REAL NOT NULL CHECK (avg_confidence >= 0.0 AND avg_confidence <= 100.0)
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_scan_audits_operator ON scan_audits(operator_id);
CREATE INDEX IF NOT EXISTS idx_scan_audits_status ON scan_audits(status);
CREATE INDEX IF NOT EXISTS idx_scan_audit_items_audit_id ON scan_audit_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_scan_audit_items_category ON scan_audit_items(category);

-- 6. Trigger to automatically update timestamps in warehouse_stock
CREATE OR REPLACE FUNCTION update_warehouse_stock_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_stock_timestamp
    BEFORE UPDATE ON warehouse_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_warehouse_stock_timestamp();

COMMIT;
