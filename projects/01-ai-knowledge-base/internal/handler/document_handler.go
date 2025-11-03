package handler

import (
	"net/http"
	"strconv"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/middleware"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/service"
	"github.com/gin-gonic/gin"
)

// DocumentHandler handles document-related HTTP requests
type DocumentHandler struct {
	docService *service.DocumentService
}

// NewDocumentHandler creates a new document handler
func NewDocumentHandler(docService *service.DocumentService) *DocumentHandler {
	return &DocumentHandler{
		docService: docService,
	}
}

// UploadDocument handles document upload
// @Summary Upload a document to a knowledge base
// @Description Upload a document file (PDF, Word, Markdown, TXT, HTML) to a knowledge base
// @Tags documents
// @Accept multipart/form-data
// @Produce json
// @Param kb_id formData string true "Knowledge Base ID"
// @Param file formData file true "Document file"
// @Param check_duplicate formData boolean false "Check for duplicate documents" default(false)
// @Security BearerAuth
// @Success 201 {object} models.Document
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 401 {object} middleware.ErrorResponse
// @Failure 413 {object} middleware.ErrorResponse "File too large"
// @Failure 415 {object} middleware.ErrorResponse "Unsupported file type"
// @Failure 500 {object} middleware.ErrorResponse
// @Router /documents [post]
func (h *DocumentHandler) UploadDocument(c *gin.Context) {
	// Get user info from context
	userInfo := middleware.GetUserInfo(c)
	if userInfo == nil {
		middleware.RespondUnauthorized(c, "user info not found in context")
		return
	}

	// Parse multipart form
	if err := c.Request.ParseMultipartForm(100 << 20); err != nil { // 100MB max memory
		middleware.RespondBadRequest(c, "failed to parse form: "+err.Error())
		return
	}

	// Get form values
	kbID := c.PostForm("kb_id")
	if kbID == "" {
		middleware.RespondBadRequest(c, "kb_id is required")
		return
	}

	checkDuplicate := c.PostForm("check_duplicate") == "true"

	// Get uploaded file
	fileHeader, err := c.FormFile("file")
	if err != nil {
		middleware.RespondBadRequest(c, "file is required")
		return
	}

	// Open file
	file, err := fileHeader.Open()
	if err != nil {
		middleware.RespondInternalError(c, "failed to open file")
		return
	}
	defer file.Close()

	// Create upload request
	req := &service.UploadDocumentRequest{
		KBID:           kbID,
		Filename:       fileHeader.Filename,
		FileSize:       fileHeader.Size,
		File:           file,
		UploadedBy:     userInfo.ID,
		Metadata:       make(models.JSONMap),
		CheckDuplicate: checkDuplicate,
	}

	// Upload document
	doc, err := h.docService.UploadDocument(c.Request.Context(), req)
	if err != nil {
		switch err {
		case service.ErrInvalidFileType:
			middleware.AbortWithError(c, http.StatusUnsupportedMediaType, "UNSUPPORTED_FILE_TYPE", err.Error())
		case service.ErrFileTooLarge:
			middleware.AbortWithError(c, http.StatusRequestEntityTooLarge, "FILE_TOO_LARGE", err.Error())
		case service.ErrInvalidKBID:
			middleware.RespondBadRequest(c, "knowledge base not found")
		default:
			middleware.RespondInternalError(c, "failed to upload document: "+err.Error())
		}
		return
	}

	c.JSON(http.StatusCreated, doc)
}

// GetDocument retrieves a document by ID
// @Summary Get a document
// @Description Get a document by its ID
// @Tags documents
// @Produce json
// @Param id path string true "Document ID"
// @Security BearerAuth
// @Success 200 {object} models.Document
// @Failure 404 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /documents/{id} [get]
func (h *DocumentHandler) GetDocument(c *gin.Context) {
	docID := c.Param("id")

	doc, err := h.docService.GetDocument(c.Request.Context(), docID)
	if err != nil {
		if err == repository.ErrDocumentNotFound {
			middleware.RespondNotFound(c, "document not found")
			return
		}
		middleware.RespondInternalError(c, "failed to get document: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, doc)
}

// ListDocuments lists documents in a knowledge base
// @Summary List documents
// @Description List documents in a knowledge base with pagination and filters
// @Tags documents
// @Produce json
// @Param kb_id query string true "Knowledge Base ID"
// @Param limit query int false "Number of results per page" default(50)
// @Param offset query int false "Offset for pagination" default(0)
// @Param status query string false "Filter by status (pending, processing, completed, failed)"
// @Param file_type query string false "Filter by file type (.pdf, .docx, .md, etc.)"
// @Param search query string false "Search in filename and content"
// @Security BearerAuth
// @Success 200 {object} middleware.PaginatedResponse{data=[]models.Document}
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /documents [get]
func (h *DocumentHandler) ListDocuments(c *gin.Context) {
	// Get query parameters
	kbID := c.Query("kb_id")
	if kbID == "" {
		middleware.RespondBadRequest(c, "kb_id is required")
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	status := c.Query("status")
	fileType := c.Query("file_type")
	search := c.Query("search")

	options := repository.DocumentListOptions{
		Limit:    limit,
		Offset:   offset,
		Status:   status,
		FileType: fileType,
		Search:   search,
	}

	// List documents
	docs, total, err := h.docService.ListDocuments(c.Request.Context(), kbID, options)
	if err != nil {
		middleware.RespondInternalError(c, "failed to list documents: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, gin.H{
		"documents": docs,
		"total":     total,
		"limit":     limit,
		"offset":    offset,
	})
}

// DeleteDocument soft deletes a document
// @Summary Delete a document
// @Description Soft delete a document by ID
// @Tags documents
// @Produce json
// @Param id path string true "Document ID"
// @Security BearerAuth
// @Success 200 {object} middleware.SuccessResponse{message=string}
// @Failure 404 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /documents/{id} [delete]
func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
	docID := c.Param("id")

	if err := h.docService.DeleteDocument(c.Request.Context(), docID); err != nil {
		if err == repository.ErrDocumentNotFound {
			middleware.RespondNotFound(c, "document not found")
			return
		}
		middleware.RespondInternalError(c, "failed to delete document: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, gin.H{"message": "document deleted successfully"})
}

// UpdateDocumentStatus updates a document's status (e.g., for reprocessing)
// @Summary Update document status
// @Description Update a document's status, optionally trigger reprocessing
// @Tags documents
// @Accept json
// @Produce json
// @Param id path string true "Document ID"
// @Param request body UpdateDocumentStatusRequest true "Status update request"
// @Security BearerAuth
// @Success 200 {object} middleware.SuccessResponse{message=string}
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 404 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /documents/{id}/status [put]
func (h *DocumentHandler) UpdateDocumentStatus(c *gin.Context) {
	docID := c.Param("id")

	var req UpdateDocumentStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondBadRequest(c, "invalid request: "+err.Error())
		return
	}

	if err := h.docService.UpdateDocumentStatus(c.Request.Context(), docID, req.Status, req.SetProcessedAt); err != nil {
		if err == repository.ErrDocumentNotFound {
			middleware.RespondNotFound(c, "document not found")
			return
		}
		middleware.RespondInternalError(c, "failed to update document status: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, gin.H{"message": "document status updated successfully"})
}

// BatchDeleteDocuments deletes multiple documents
// @Summary Batch delete documents
// @Description Delete multiple documents by their IDs
// @Tags documents
// @Accept json
// @Produce json
// @Param request body BatchDeleteRequest true "Batch delete request"
// @Security BearerAuth
// @Success 200 {object} middleware.SuccessResponse{data=BatchDeleteResponse}
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 500 {object} middleware.ErrorResponse
// @Router /documents/batch-delete [post]
func (h *DocumentHandler) BatchDeleteDocuments(c *gin.Context) {
	var req BatchDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondBadRequest(c, "invalid request: "+err.Error())
		return
	}

	if len(req.DocumentIDs) == 0 {
		middleware.RespondBadRequest(c, "document_ids cannot be empty")
		return
	}

	if len(req.DocumentIDs) > 100 {
		middleware.RespondBadRequest(c, "cannot delete more than 100 documents at once")
		return
	}

	successCount := 0
	failedIDs := []string{}

	for _, docID := range req.DocumentIDs {
		if err := h.docService.DeleteDocument(c.Request.Context(), docID); err != nil {
			failedIDs = append(failedIDs, docID)
		} else {
			successCount++
		}
	}

	response := BatchDeleteResponse{
		SuccessCount: successCount,
		FailedCount:  len(failedIDs),
		FailedIDs:    failedIDs,
	}

	middleware.RespondWithSuccess(c, response)
}

// Request/Response DTOs

// UpdateDocumentStatusRequest represents a status update request
type UpdateDocumentStatusRequest struct {
	Status         string `json:"status" binding:"required,oneof=pending processing completed failed"`
	SetProcessedAt bool   `json:"set_processed_at"`
}

// BatchDeleteRequest represents a batch delete request
type BatchDeleteRequest struct {
	DocumentIDs []string `json:"document_ids" binding:"required,min=1,max=100"`
}

// BatchDeleteResponse represents the result of a batch delete operation
type BatchDeleteResponse struct {
	SuccessCount int      `json:"success_count"`
	FailedCount  int      `json:"failed_count"`
	FailedIDs    []string `json:"failed_ids,omitempty"`
}
