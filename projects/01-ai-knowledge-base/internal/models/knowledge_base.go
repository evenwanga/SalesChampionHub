package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// KnowledgeBase represents a knowledge base (global resource)
type KnowledgeBase struct {
	ID             string     `json:"id" gorm:"primaryKey"`
	Name           string     `json:"name" gorm:"not null"`
	Description    string     `json:"description"`
	OwnerID        string     `json:"owner_id" gorm:"not null"`            // From sub-project 0
	Visibility     string     `json:"visibility" gorm:"default:'private'"` // public, private, shared
	Tags           []string   `json:"tags" gorm:"type:text[]"`
	DocumentCount  int        `json:"document_count" gorm:"default:0"`
	TotalSizeBytes int64      `json:"total_size_bytes" gorm:"default:0"`
	LastUpdatedAt  time.Time  `json:"last_updated_at"`
	Settings       JSONMap    `json:"settings" gorm:"type:jsonb;default:'{}'"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}

// KnowledgeBaseMount represents three-level mounting (v3.1)
type KnowledgeBaseMount struct {
	ID             int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	KBID           string    `json:"kb_id" gorm:"not null"`
	MountType      string    `json:"mount_type" gorm:"not null"` // tenant, organization, user
	TenantID       *string   `json:"tenant_id,omitempty"`
	OrganizationID *string   `json:"organization_id,omitempty"`
	UserID         *string   `json:"user_id,omitempty"`
	MountedBy      string    `json:"mounted_by" gorm:"not null"`
	MountedAt      time.Time `json:"mounted_at"`
	Permissions    JSONMap   `json:"permissions" gorm:"type:jsonb"`
	IsActive       bool      `json:"is_active" gorm:"default:true"`

	// Relations
	KnowledgeBase *KnowledgeBase `json:"knowledge_base,omitempty" gorm:"foreignKey:KBID"`
}

// Document represents a document in a knowledge base
type Document struct {
	ID          string     `json:"id" gorm:"primaryKey"`
	KBID        string     `json:"kb_id" gorm:"not null;index"`
	Filename    string     `json:"filename" gorm:"not null"`
	FileType    string     `json:"file_type" gorm:"not null"`
	FileSize    int64      `json:"file_size" gorm:"not null"`
	FilePath    string     `json:"file_path" gorm:"not null"`
	Status      string     `json:"status" gorm:"default:'pending'"` // pending, processing, completed, failed
	Content     string     `json:"content,omitempty" gorm:"type:text"`
	ContentHash string     `json:"content_hash,omitempty" gorm:"index"`
	Metadata    JSONMap    `json:"metadata" gorm:"type:jsonb;default:'{}'"`
	ChunkCount  int        `json:"chunk_count" gorm:"default:0"`
	UploadedBy  string     `json:"uploaded_by" gorm:"not null"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	ProcessedAt *time.Time `json:"processed_at,omitempty"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" gorm:"index"`

	// Relations
	KnowledgeBase *KnowledgeBase `json:"knowledge_base,omitempty" gorm:"foreignKey:KBID"`
}

// DocumentChunk represents a chunk of a document
type DocumentChunk struct {
	ID            string    `json:"id" gorm:"primaryKey"`
	DocumentID    string    `json:"document_id" gorm:"not null;index"`
	KBID          string    `json:"kb_id" gorm:"not null;index"`
	ChunkIndex    int       `json:"chunk_index" gorm:"not null"`
	Content       string    `json:"content" gorm:"type:text;not null"`
	ContentLength int       `json:"content_length" gorm:"not null"`
	Metadata      JSONMap   `json:"metadata" gorm:"type:jsonb;default:'{}'"`
	CreatedAt     time.Time `json:"created_at"`

	// Relations
	Document *Document `json:"document,omitempty" gorm:"foreignKey:DocumentID"`
}

// Vector represents an embedding vector
type Vector struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	ChunkID   string    `json:"chunk_id" gorm:"not null;index"`
	KBID      string    `json:"kb_id" gorm:"not null;index"`
	Embedding []float32 `json:"embedding" gorm:"type:vector(1024);not null"`
	Model     string    `json:"model" gorm:"default:'bge-large-zh'"`
	CreatedAt time.Time `json:"created_at"`

	// Relations
	Chunk *DocumentChunk `json:"chunk,omitempty" gorm:"foreignKey:ChunkID"`
}

// QueryLog represents a query log entry
type QueryLog struct {
	ID          int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	TenantID    string    `json:"tenant_id" gorm:"not null;index"`
	UserID      string    `json:"user_id" gorm:"not null;index"`
	QueryText   string    `json:"query_text" gorm:"type:text;not null"`
	KBIDs       []string  `json:"kb_ids" gorm:"type:varchar(50)[]"`
	ResultCount int       `json:"result_count" gorm:"default:0"`
	TopKBID     *string   `json:"top_kb_id,omitempty"`
	LatencyMS   int       `json:"latency_ms"`
	Metadata    JSONMap   `json:"metadata" gorm:"type:jsonb;default:'{}'"`
	CreatedAt   time.Time `json:"created_at" gorm:"index"`
}

// JSONMap is a custom type for JSONB fields
type JSONMap map[string]interface{}

// Scan implements sql.Scanner interface
func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSONMap)
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}

	result := make(JSONMap)
	if err := json.Unmarshal(bytes, &result); err != nil {
		return err
	}

	*j = result
	return nil
}

// Value implements driver.Valuer interface
func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return "{}", nil
	}
	return json.Marshal(j)
}

// TableName overrides for GORM

func (KnowledgeBase) TableName() string {
	return "knowledge_bases"
}

func (KnowledgeBaseMount) TableName() string {
	return "knowledge_base_mounts"
}

func (Document) TableName() string {
	return "documents"
}

func (DocumentChunk) TableName() string {
	return "document_chunks"
}

func (Vector) TableName() string {
	return "vectors"
}

func (QueryLog) TableName() string {
	return "query_logs"
}
