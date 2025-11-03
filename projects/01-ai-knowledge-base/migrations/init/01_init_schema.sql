-- AI Knowledge Base Management Platform
-- Database Schema with Row-Level Security (RLS)
-- Version: v3.1
-- Date: 2025-11-01

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. Knowledge Bases (Global Resources)
-- ========================================
CREATE TABLE knowledge_bases (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('kb_' || substring(md5(random()::text) from 1 for 24)),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id VARCHAR(50) NOT NULL,  -- Creator ID (from sub-project 0)

    -- Visibility: public, private, shared
    visibility VARCHAR(20) DEFAULT 'private'
        CHECK (visibility IN ('public', 'private', 'shared')),

    tags TEXT[] DEFAULT '{}',

    -- Metadata
    document_count INTEGER DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    last_updated_at TIMESTAMP DEFAULT NOW(),

    -- Settings (JSONB for flexibility)
    settings JSONB DEFAULT '{
        "embedding_model": "bge-large-zh",
        "chunk_size": 512,
        "chunk_overlap": 50,
        "enable_graphrag": false
    }',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,

    -- Indexes
    CONSTRAINT kb_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_kb_owner ON knowledge_bases(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_kb_visibility ON knowledge_bases(visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_kb_created ON knowledge_bases(created_at DESC);

-- ========================================
-- 2. Knowledge Base Mounts (Three-Level Mounting) ⭐ v3.1
-- ========================================
CREATE TABLE knowledge_base_mounts (
    id BIGSERIAL PRIMARY KEY,
    kb_id VARCHAR(50) NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,

    -- Mount type: tenant, organization, user
    mount_type VARCHAR(20) NOT NULL
        CHECK (mount_type IN ('tenant', 'organization', 'user')),

    -- Mount targets (only one should be set based on mount_type)
    tenant_id VARCHAR(50),        -- For tenant-level mounting
    organization_id VARCHAR(50),  -- For organization-level mounting (from sub-project 0)
    user_id VARCHAR(50),          -- For user-level mounting (from sub-project 0)

    -- Who mounted this KB
    mounted_by VARCHAR(50) NOT NULL,
    mounted_at TIMESTAMP DEFAULT NOW(),

    -- Permissions for this mount
    permissions JSONB DEFAULT '{
        "can_read": true,
        "can_write": false,
        "can_delete": false,
        "can_share": false
    }',

    is_active BOOLEAN DEFAULT true,

    -- Constraints: No duplicate mounts
    CONSTRAINT uq_tenant_mount UNIQUE(kb_id, mount_type, tenant_id),
    CONSTRAINT uq_org_mount UNIQUE(kb_id, mount_type, organization_id),
    CONSTRAINT uq_user_mount UNIQUE(kb_id, mount_type, user_id),

    -- Validation: Exactly one target must be set
    CONSTRAINT chk_single_target CHECK (
        (mount_type = 'tenant' AND tenant_id IS NOT NULL AND organization_id IS NULL AND user_id IS NULL) OR
        (mount_type = 'organization' AND organization_id IS NOT NULL AND tenant_id IS NULL AND user_id IS NULL) OR
        (mount_type = 'user' AND user_id IS NOT NULL AND tenant_id IS NULL AND organization_id IS NULL)
    )
);

CREATE INDEX idx_mount_tenant ON knowledge_base_mounts(tenant_id, is_active) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_mount_org ON knowledge_base_mounts(organization_id, is_active) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_mount_user ON knowledge_base_mounts(user_id, is_active) WHERE user_id IS NOT NULL;
CREATE INDEX idx_mount_kb ON knowledge_base_mounts(kb_id, is_active);

-- ========================================
-- 3. Documents
-- ========================================
CREATE TABLE documents (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('doc_' || substring(md5(random()::text) from 1 for 24)),
    kb_id VARCHAR(50) NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,

    -- Document info
    filename VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,  -- pdf, docx, md, txt, image
    file_size BIGINT NOT NULL,
    file_path TEXT NOT NULL,  -- Storage path or URL

    -- Processing status
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

    -- Content
    content TEXT,
    content_hash VARCHAR(64),  -- SHA-256 hash for deduplication

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Chunking info
    chunk_count INTEGER DEFAULT 0,

    -- Uploader
    uploaded_by VARCHAR(50) NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_doc_kb ON documents(kb_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_doc_status ON documents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_doc_hash ON documents(content_hash) WHERE deleted_at IS NULL;
CREATE INDEX idx_doc_created ON documents(created_at DESC);

-- ========================================
-- 4. Document Chunks
-- ========================================
CREATE TABLE document_chunks (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('chunk_' || substring(md5(random()::text) from 1 for 24)),
    document_id VARCHAR(50) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    kb_id VARCHAR(50) NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,

    -- Chunk info
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_length INTEGER NOT NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_doc_chunk UNIQUE(document_id, chunk_index)
);

CREATE INDEX idx_chunk_doc ON document_chunks(document_id);
CREATE INDEX idx_chunk_kb ON document_chunks(kb_id);

-- ========================================
-- 5. Vectors (Embeddings)
-- ========================================
CREATE TABLE vectors (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('vec_' || substring(md5(random()::text) from 1 for 24)),
    chunk_id VARCHAR(50) NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
    kb_id VARCHAR(50) NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,

    -- Vector embedding (1536 dimensions for OpenAI, 1024 for BGE)
    embedding vector(1024) NOT NULL,

    -- Embedding model
    model VARCHAR(100) DEFAULT 'bge-large-zh',

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vec_chunk ON vectors(chunk_id);
CREATE INDEX idx_vec_kb ON vectors(kb_id);

-- Vector similarity index (HNSW for fast approximate nearest neighbor search)
-- HNSW parameters:
--   m = 16: Number of bi-directional links per node (higher = better recall, more memory)
--   ef_construction = 64: Size of dynamic candidate list during construction (higher = better index quality, slower build)
-- For production, consider: m = 32, ef_construction = 128 for better quality
CREATE INDEX idx_vec_embedding_hnsw ON vectors USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Additional index on chunks for better performance
CREATE INDEX idx_chunks_embedding_hnsw ON document_chunks(kb_id, document_id);

-- ========================================
-- 6. Query Logs
-- ========================================
CREATE TABLE query_logs (
    id BIGSERIAL PRIMARY KEY,

    -- User context
    tenant_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,

    -- Query info
    query_text TEXT NOT NULL,
    kb_ids VARCHAR(50)[] NOT NULL,  -- Knowledge bases searched

    -- Results
    result_count INTEGER DEFAULT 0,
    top_kb_id VARCHAR(50),  -- KB that provided the best result

    -- Performance
    latency_ms INTEGER,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_query_tenant ON query_logs(tenant_id, created_at DESC);
CREATE INDEX idx_query_user ON query_logs(user_id, created_at DESC);
CREATE INDEX idx_query_created ON query_logs(created_at DESC);

-- ========================================
-- 7. Row-Level Security (RLS) Policies
-- ========================================

-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access documents from mounted knowledge bases
-- Supports three-level mounting (tenant/organization/user)
CREATE POLICY tenant_document_access ON documents
    FOR ALL
    USING (
        kb_id IN (
            SELECT DISTINCT kb_id
            FROM knowledge_base_mounts
            WHERE is_active = true
            AND (
                -- Tenant-level mount
                (mount_type = 'tenant'
                 AND tenant_id = current_setting('app.current_tenant', true)::text)
                OR
                -- Organization-level mount
                (mount_type = 'organization'
                 AND organization_id = current_setting('app.current_organization', true)::text)
                OR
                -- User-level mount
                (mount_type = 'user'
                 AND user_id = current_setting('app.current_user', true)::text)
            )
        )
        AND deleted_at IS NULL
    );

-- Enable RLS on document_chunks
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_chunk_access ON document_chunks
    FOR ALL
    USING (
        kb_id IN (
            SELECT DISTINCT kb_id
            FROM knowledge_base_mounts
            WHERE is_active = true
            AND (
                (mount_type = 'tenant'
                 AND tenant_id = current_setting('app.current_tenant', true)::text)
                OR
                (mount_type = 'organization'
                 AND organization_id = current_setting('app.current_organization', true)::text)
                OR
                (mount_type = 'user'
                 AND user_id = current_setting('app.current_user', true)::text)
            )
        )
    );

-- Enable RLS on vectors
ALTER TABLE vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_vector_access ON vectors
    FOR ALL
    USING (
        kb_id IN (
            SELECT DISTINCT kb_id
            FROM knowledge_base_mounts
            WHERE is_active = true
            AND (
                (mount_type = 'tenant'
                 AND tenant_id = current_setting('app.current_tenant', true)::text)
                OR
                (mount_type = 'organization'
                 AND organization_id = current_setting('app.current_organization', true)::text)
                OR
                (mount_type = 'user'
                 AND user_id = current_setting('app.current_user', true)::text)
            )
        )
    );

-- ========================================
-- 8. Helper Functions
-- ========================================

-- Function to get user's accessible knowledge bases
CREATE OR REPLACE FUNCTION get_user_accessible_kbs(
    p_tenant_id VARCHAR(50),
    p_organization_id VARCHAR(50),
    p_user_id VARCHAR(50)
)
RETURNS TABLE(kb_id VARCHAR(50), mount_type VARCHAR(20), permissions JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        m.kb_id,
        m.mount_type,
        m.permissions
    FROM knowledge_base_mounts m
    WHERE m.is_active = true
    AND (
        (m.mount_type = 'tenant' AND m.tenant_id = p_tenant_id)
        OR
        (m.mount_type = 'organization' AND m.organization_id = p_organization_id)
        OR
        (m.mount_type = 'user' AND m.user_id = p_user_id)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update knowledge base stats
CREATE OR REPLACE FUNCTION update_kb_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE knowledge_bases
        SET
            document_count = document_count + 1,
            total_size_bytes = total_size_bytes + NEW.file_size,
            last_updated_at = NOW()
        WHERE id = NEW.kb_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE knowledge_bases
        SET
            document_count = GREATEST(document_count - 1, 0),
            total_size_bytes = GREATEST(total_size_bytes - OLD.file_size, 0),
            last_updated_at = NOW()
        WHERE id = OLD.kb_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update KB stats
CREATE TRIGGER trg_update_kb_stats
AFTER INSERT OR DELETE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_kb_stats();

-- ========================================
-- 9. Initial Data (Optional)
-- ========================================

-- Create a default public knowledge base for testing
-- Commented out - will be created through API
-- INSERT INTO knowledge_bases (id, name, description, owner_id, visibility)
-- VALUES ('kb_default_public', 'Public Knowledge Base', 'Default public knowledge base for testing', 'system', 'public');

-- ========================================
-- Schema Initialization Complete
-- ========================================
