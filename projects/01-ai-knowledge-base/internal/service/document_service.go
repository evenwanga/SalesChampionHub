package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
	"github.com/google/uuid"
)

var (
	ErrInvalidFileType  = errors.New("invalid file type")
	ErrFileTooLarge     = errors.New("file too large")
	ErrFileUploadFailed = errors.New("file upload failed")
	ErrInvalidKBID      = errors.New("invalid knowledge base ID")
)

// Supported file types
var SupportedFileTypes = map[string]bool{
	".pdf":  true,
	".doc":  true,
	".docx": true,
	".md":   true,
	".txt":  true,
	".html": true,
	".htm":  true,
	".xlsx": true, // Excel
	".xls":  true, // Excel (legacy)
	".pptx": true, // PowerPoint
	".ppt":  true, // PowerPoint (legacy)
}

// DocumentService provides business logic for document operations
type DocumentService struct {
	docRepo        *repository.DocumentRepository
	kbService      *KBService
	processor      *DocumentProcessor
	uploadDir      string
	maxFileSize    int64 // in bytes
	chunkSize      int   // for text chunking
	overlapSize    int   // overlap between chunks
}

// NewDocumentService creates a new document service
func NewDocumentService(
	docRepo *repository.DocumentRepository,
	kbService *KBService,
	processor *DocumentProcessor,
	uploadDir string,
	maxFileSize int64,
	chunkSize int,
	overlapSize int,
) *DocumentService {
	return &DocumentService{
		docRepo:     docRepo,
		kbService:   kbService,
		processor:   processor,
		uploadDir:   uploadDir,
		maxFileSize: maxFileSize,
		chunkSize:   chunkSize,
		overlapSize: overlapSize,
	}
}

// UploadDocument handles document upload
func (s *DocumentService) UploadDocument(ctx context.Context, req *UploadDocumentRequest) (*models.Document, error) {
	// Validate KB exists and user has access
	kb, err := s.kbService.GetKB(ctx, req.KBID)
	if err != nil {
		return nil, fmt.Errorf("failed to get KB: %w", err)
	}
	if kb == nil {
		return nil, ErrInvalidKBID
	}

	// Validate file type
	fileExt := strings.ToLower(filepath.Ext(req.Filename))
	if !SupportedFileTypes[fileExt] {
		return nil, fmt.Errorf("%w: %s", ErrInvalidFileType, fileExt)
	}

	// Validate file size
	if req.FileSize > s.maxFileSize {
		return nil, fmt.Errorf("%w: max %d bytes", ErrFileTooLarge, s.maxFileSize)
	}

	// Generate document ID
	docID := "doc_" + uuid.New().String()

	// Calculate content hash for duplicate detection
	contentHash, err := s.calculateFileHash(req.File)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate file hash: %w", err)
	}

	// Check for duplicates
	if req.CheckDuplicate {
		duplicates, err := s.docRepo.FindByContentHash(ctx, req.KBID, contentHash)
		if err != nil {
			return nil, fmt.Errorf("failed to check for duplicates: %w", err)
		}
		if len(duplicates) > 0 {
			return nil, fmt.Errorf("duplicate document found: %s", duplicates[0].ID)
		}
	}

	// Save file to disk
	filePath, err := s.saveFile(req.KBID, docID, req.Filename, req.File)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrFileUploadFailed, err)
	}

	// Create document record
	doc := &models.Document{
		ID:          docID,
		KBID:        req.KBID,
		Filename:    req.Filename,
		FileType:    fileExt,
		FileSize:    req.FileSize,
		FilePath:    filePath,
		Status:      "pending",
		ContentHash: contentHash,
		Metadata:    req.Metadata,
		UploadedBy:  req.UploadedBy,
	}

	if err := s.docRepo.Create(ctx, doc); err != nil {
		// Clean up file if database creation fails
		_ = os.Remove(filePath)
		return nil, fmt.Errorf("failed to create document record: %w", err)
	}

	// Trigger async document processing if processor is available
	if s.processor != nil {
		s.processor.ProcessDocumentAsync(doc.ID)
	}

	return doc, nil
}

// GetDocument retrieves a document by ID
func (s *DocumentService) GetDocument(ctx context.Context, docID string) (*models.Document, error) {
	return s.docRepo.GetByID(ctx, docID)
}

// ListDocuments lists documents in a knowledge base
func (s *DocumentService) ListDocuments(ctx context.Context, kbID string, options repository.DocumentListOptions) ([]*models.Document, int64, error) {
	// Verify KB access
	_, err := s.kbService.GetKB(ctx, kbID)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to verify KB access: %w", err)
	}

	return s.docRepo.ListByKB(ctx, kbID, options)
}

// DeleteDocument soft deletes a document
func (s *DocumentService) DeleteDocument(ctx context.Context, docID string) error {
	// Get document to verify it exists and get file path
	_, err := s.docRepo.GetByID(ctx, docID)
	if err != nil {
		return err
	}

	// Soft delete from database
	if err := s.docRepo.Delete(ctx, docID); err != nil {
		return err
	}

	// Optionally delete file from disk (uncomment if you want hard delete)
	// _ = os.Remove(doc.FilePath)

	return nil
}

// UpdateDocumentStatus updates document processing status
func (s *DocumentService) UpdateDocumentStatus(ctx context.Context, docID, status string, setProcessedAt bool) error {
	return s.docRepo.UpdateStatus(ctx, docID, status, setProcessedAt)
}

// saveFile saves uploaded file to disk
func (s *DocumentService) saveFile(kbID, docID, filename string, file multipart.File) (string, error) {
	// Create directory structure: uploadDir/kbID/
	kbDir := filepath.Join(s.uploadDir, kbID)
	if err := os.MkdirAll(kbDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	// Generate safe filename: docID_originalFilename
	safeFilename := fmt.Sprintf("%s_%s", docID, filepath.Base(filename))
	filePath := filepath.Join(kbDir, safeFilename)

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, file); err != nil {
		_ = os.Remove(filePath) // Clean up on error
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	return filePath, nil
}

// calculateFileHash calculates SHA-256 hash of file content
func (s *DocumentService) calculateFileHash(file multipart.File) (string, error) {
	// Reset file pointer to beginning
	if _, err := file.Seek(0, 0); err != nil {
		return "", err
	}

	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		return "", err
	}

	// Reset file pointer again for later use
	if _, err := file.Seek(0, 0); err != nil {
		return "", err
	}

	return hex.EncodeToString(hasher.Sum(nil)), nil
}

// Request DTOs

type UploadDocumentRequest struct {
	KBID           string              `json:"kb_id" binding:"required"`
	Filename       string              `json:"filename" binding:"required"`
	FileSize       int64               `json:"file_size" binding:"required"`
	File           multipart.File      `json:"-"`
	UploadedBy     string              `json:"uploaded_by" binding:"required"`
	Metadata       models.JSONMap      `json:"metadata"`
	CheckDuplicate bool                `json:"check_duplicate"`
}
