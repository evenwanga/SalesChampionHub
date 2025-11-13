-- ==========================================
-- Migration: Add query_type column to query_logs table
-- Date: 2025-11-12
-- Description: Adds query_type field to differentiate between 'search' and 'ask' queries
-- ==========================================

-- Add query_type column with default value
ALTER TABLE query_logs
ADD COLUMN IF NOT EXISTS query_type VARCHAR(20) NOT NULL DEFAULT 'search';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_query_type ON query_logs(query_type);

-- Add check constraint to ensure valid query types
ALTER TABLE query_logs
ADD CONSTRAINT chk_query_type CHECK (query_type IN ('search', 'ask'));

-- Update existing records (if any) to have appropriate query_type
-- This is a safe operation as the table is currently empty
UPDATE query_logs SET query_type = 'search' WHERE query_type IS NULL OR query_type = '';

COMMENT ON COLUMN query_logs.query_type IS 'Type of query: search (semantic search) or ask (RAG question answering)';
