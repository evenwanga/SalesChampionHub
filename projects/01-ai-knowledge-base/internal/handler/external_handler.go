package handler

import (
	"fmt"
	"net/http"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/middleware"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ExternalHandler handles external API requests
type ExternalHandler struct {
	docService *service.DocumentService
	db         *gorm.DB
}

// NewExternalHandler creates a new external handler
func NewExternalHandler(docService *service.DocumentService, db *gorm.DB) *ExternalHandler {
	return &ExternalHandler{
		docService: docService,
		db:         db,
	}
}

// UploadDocumentExternal handles document upload from external sources
// @Summary Upload a document via external API
// @Description Upload a document file to a knowledge base (requires API Key via Kong)
// @Tags external
// @Accept multipart/form-data
// @Produce json
// @Param kb_id formData string true "Knowledge Base ID"
// @Param user_id formData string true "User ID (Owner of the document)"
// @Param file formData file true "Document file"
// @Param check_duplicate formData boolean false "Check for duplicate documents" default(false)
// @Success 201 {object} models.Document
// @Failure 400 {object} middleware.ErrorResponse
// @Failure 401 {object} middleware.ErrorResponse
// @Failure 413 {object} middleware.ErrorResponse "File too large"
// @Failure 415 {object} middleware.ErrorResponse "Unsupported file type"
// @Failure 500 {object} middleware.ErrorResponse
// @Router /external/v1/documents [post]
func (h *ExternalHandler) UploadDocumentExternal(c *gin.Context) {
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

	userID := c.PostForm("user_id")
	if userID == "" {
		middleware.RespondBadRequest(c, "user_id is required")
		return
	}

	// Set RLS context for this request
	// Note: This follows the pattern in RLSMiddleware.
	// In a production environment with connection pooling, this should be handled via transactions,
	// but we follow the existing codebase pattern here.
	// We set tenant/org to empty as external uploads might not have this context,
	// or we could require them in the form if needed.
	// For now, we assume the user exists and RLS only checks user_id.
	sql := fmt.Sprintf("SET \"app.current_user\" = '%s'", userID)
	if err := h.db.Exec(sql).Error; err != nil {
		middleware.RespondInternalError(c, "failed to set RLS context: "+err.Error())
		return
	}
	// Reset RLS context after request
	defer h.db.Exec("RESET app.current_user")

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
		UploadedBy:     userID, // Use provided user_id
		Metadata:       make(models.JSONMap),
		CheckDuplicate: checkDuplicate,
	}

	// Add source metadata
	req.Metadata["source"] = "external_api"

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
