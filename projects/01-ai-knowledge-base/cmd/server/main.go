package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/SalesChampionHub/ai-knowledge-base/docs/swagger" // Import swagger docs
	kbcache "github.com/SalesChampionHub/ai-knowledge-base/internal/cache"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/handler"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/metrics"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/middleware"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/service"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/usercenter"
	"github.com/SalesChampionHub/ai-knowledge-base/pkg/cache"
	"github.com/SalesChampionHub/ai-knowledge-base/pkg/config"
	"github.com/SalesChampionHub/ai-knowledge-base/pkg/database"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title AI知识库管理平台 API
// @version 1.0
// @description 企业级AI知识库管理平台，支持多租户、RLS数据隔离和向量搜索功能。
// @description
// @description ## 🔐 认证说明
// @description 所有接口都需要JWT Token认证（从子项目0用户中心获取）。
// @description 使用用户中心的 `/api/v1/auth/login` 接口获取Token。
// @description
// @description ## ✨ 核心特性
// @description - 多租户架构：租户/组织/用户三级隔离
// @description - Row-Level Security (RLS)：数据库级别的数据隔离
// @description - 三级挂载系统：租户 > 组织 > 用户权限继承
// @description - 向量搜索：基于pgvector的语义搜索（1024维向量）
// @description - Redis多层缓存：热点数据缓存优化
// @description - 完整用户中心集成：统一认证授权

// @contact.name 技术支持
// @contact.email support@saleschampionhub.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description 输入格式："Bearer " + JWT令牌（注意Bearer后面有空格）

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	log.Println("🚀 Starting AI Knowledge Base Management Platform")
	log.Printf("📝 Server Mode: %s", cfg.Server.Mode)
	log.Printf("🔌 Server Port: %d", cfg.Server.Port)
	log.Printf("💾 Database: %s:%d/%s", cfg.Database.Host, cfg.Database.Port, cfg.Database.Name)
	log.Printf("📦 Redis: %s:%d", cfg.Redis.Host, cfg.Redis.Port)
	log.Printf("🔗 User Center API: %s", cfg.UserCenter.APIBaseURL)
	log.Printf("🎯 Max KB Query Limit: %d", cfg.Query.MaxKBQueryLimit)

	// Initialize database
	db, err := database.NewDatabase(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.CloseDatabase(db)

	// Initialize Redis
	redisClient, err := cache.NewRedisClient(&cfg.Redis)
	if err != nil {
		log.Fatalf("Failed to initialize Redis: %v", err)
	}
	defer cache.CloseRedis(redisClient)

	// Initialize User Center client
	userCenterClient := usercenter.NewClient(
		cfg.UserCenter.APIBaseURL,
		cfg.UserCenter.APIKey,
		cfg.UserCenter.Timeout,
	)

	// Initialize system metrics collector
	metricsCollector := metrics.NewSystemMetricsCollector()
	metricsCollector.Start(5 * time.Second) // Collect every 5 seconds
	defer metricsCollector.Stop()

	// Set Gin mode
	gin.SetMode(cfg.Server.Mode)

	// Create Gin router
	router := gin.New()

	// Global middleware
	router.Use(gin.Recovery())
	router.Use(middleware.RequestLogger())
	router.Use(middleware.CORS())
	router.Use(middleware.RequestID())
	router.Use(middleware.ErrorRecovery())
	router.Use(middleware.MetricsMiddleware()) // Add metrics collection

	// Initialize Logto authentication middleware
	log.Printf("🔐 Initializing Logto authentication...")
	log.Printf("   Endpoint: %s", cfg.Logto.Endpoint)
	log.Printf("   Resource: %s", cfg.Logto.APIResource)

	logtoAuth, err := middleware.NewLogtoAuthMiddleware(
		cfg.Logto.Endpoint,
		cfg.Logto.APIResource,
		redisClient,
		cfg.Features.CacheTTL,
	)
	if err != nil {
		log.Fatalf("Failed to initialize Logto authentication: %v", err)
	}
	log.Println("✅ Logto authentication initialized successfully")

	// Keep the old auth middleware for backward compatibility (if needed)
	_ = middleware.NewAuthMiddleware(
		userCenterClient,
		redisClient,
		cfg.Features.CacheTTL,
	)

	rlsMiddleware := middleware.NewRLSMiddleware(db)

	// Initialize repositories
	kbRepo := repository.NewKBRepository(db)
	mountRepo := repository.NewMountRepository(db)
	docRepo := repository.NewDocumentRepository(db)
	chunkRepo := repository.NewChunkRepository(db)
	vectorRepo := repository.NewVectorRepository(db)
	queryLogRepo := repository.NewQueryLogRepository(db)
	auditRepo := repository.NewAuditRepository(db)

	// Initialize cache
	kbCache := kbcache.NewKBCache(redisClient)

	// Initialize document processing components
	docParser := service.NewDocumentParser(100000)      // 100K chars max per document
	docChunker := service.NewDocumentChunker(1000, 200) // 1000 chars per chunk, 200 chars overlap

	// Initialize embedding service based on provider
	var embeddingClient service.EmbeddingClient
	switch cfg.Embedding.Provider {
	case "bge":
		log.Printf("🔢 Initializing BGE embedding service: %s (dimension: %d)", cfg.Embedding.Model, cfg.Embedding.Dimension)
		embeddingClient = service.NewEmbeddingService(
			cfg.Embedding.APIURL+"/embeddings",
			cfg.Embedding.APIKey,
			cfg.Embedding.Model,
			cfg.Embedding.Dimension,
			cfg.Embedding.Timeout,
		)
	case "mock":
		log.Printf("🧪 Using mock embedding service (dimension: %d)", cfg.Embedding.Dimension)
		embeddingClient = service.NewMockEmbeddingService(cfg.Embedding.Dimension)
	default:
		log.Printf("⚠️  Unknown embedding provider '%s', using mock service", cfg.Embedding.Provider)
		embeddingClient = service.NewMockEmbeddingService(1024)
	}

	// Initialize document processor
	docProcessor := service.NewDocumentProcessor(docRepo, chunkRepo, vectorRepo, docParser, docChunker, embeddingClient)

	// Initialize LLM client based on provider
	var llmClient service.LLMClient
	switch cfg.LLM.Provider {
	case "qwen":
		if cfg.LLM.APIKey != "" {
			log.Printf("🤖 Initializing Qwen LLM client with model: %s", cfg.LLM.Model)
			llmClient = service.NewQwenClient(cfg.LLM.APIKey, cfg.LLM.APIURL, cfg.LLM.Model, cfg.LLM.Timeout)
		} else {
			log.Println("⚠️  LLM_API_KEY not set, using mock LLM client")
			llmClient = service.NewMockLLMClient()
		}
	case "mock":
		log.Println("🧪 Using mock LLM client (for testing)")
		llmClient = service.NewMockLLMClient()
	default:
		log.Printf("⚠️  Unknown LLM provider '%s', using mock client", cfg.LLM.Provider)
		llmClient = service.NewMockLLMClient()
	}

	// Initialize services
	kbService := service.NewKBService(kbRepo, mountRepo, docRepo, kbCache, cfg.Query.MaxKBQueryLimit)
	searchService := service.NewSearchService(vectorRepo, queryLogRepo, redisClient, cfg.Query.MaxKBQueryLimit, cfg.Features.CacheTTL)
	ragService := service.NewRAGService(searchService, vectorRepo, queryLogRepo, llmClient, 8000)                                // 8000 chars max context
	docService := service.NewDocumentService(docRepo, chunkRepo, kbService, docProcessor, "./uploads", 100*1024*1024, 1000, 200) // 100MB max, 1000 char chunks, 200 char overlap
	auditService := service.NewAuditService(auditRepo)

	// Initialize handlers
	kbHandler := handler.NewKBHandler(kbService)
	searchHandler := handler.NewSearchHandler(searchService, ragService, kbService, queryLogRepo)
	docHandler := handler.NewDocumentHandler(docService)
	embeddingHandler := handler.NewEmbeddingHandler(embeddingClient)
	monitoringHandler := handler.NewMonitoringHandler(db, redisClient)
	auditHandler := handler.NewAuditHandler(auditService)

	// Initialize audit middleware
	auditMiddleware := middleware.NewAuditMiddleware(auditRepo)
	log.Println("✅ Audit logging system initialized")

	// Swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Prometheus metrics endpoint (no auth required)
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Health check endpoint (no auth required)
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"services": gin.H{
				"database": "up",
				"redis":    "up",
			},
			"version": "1.0.0",
		})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Public endpoints (no auth)
		v1.GET("/ping", func(c *gin.Context) {
			middleware.RespondWithSuccess(c, gin.H{
				"message": "pong",
			})
		})

		// Health check endpoint (no auth required) - same as root /health
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":    "healthy",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
				"services": gin.H{
					"database": "up",
					"redis":    "up",
				},
				"version": "1.0.0",
			})
		})

		// Authenticated endpoints (using Logto)
		authenticated := v1.Group("")
		authenticated.Use(logtoAuth.Authenticate()) // Use Logto JWT verification
		authenticated.Use(rlsMiddleware.SetRLSContext())
		authenticated.Use(auditMiddleware.AuditLogger()) // Add audit logging
		{
			// User info
			authenticated.GET("/me", func(c *gin.Context) {
				userInfo := middleware.GetUserInfo(c)
				middleware.RespondWithSuccess(c, userInfo)
			})

			// Knowledge Bases
			kbs := authenticated.Group("/knowledge-bases")
			{
				kbs.GET("", kbHandler.ListKBs)
				kbs.POST("", kbHandler.CreateKB)
				kbs.GET("/:id", kbHandler.GetKB)
				kbs.PUT("/:id", kbHandler.UpdateKB)
				kbs.DELETE("/:id", kbHandler.DeleteKB)
				kbs.GET("/:id/stats", kbHandler.GetKBStats)
				kbs.GET("/:id/mounts", kbHandler.ListKBMounts)
			}

			// Mounts
			mounts := authenticated.Group("/mounts")
			{
				mounts.GET("", kbHandler.ListMounts)
				mounts.GET("/:id", kbHandler.GetMount)
				mounts.POST("/tenant", kbHandler.MountKBToTenant)
				mounts.POST("/organization", kbHandler.MountKBToOrganization)
				mounts.POST("/user", kbHandler.MountKBToUser)
				mounts.DELETE("/:id", kbHandler.Unmount)
				mounts.PUT("/:id/permissions", kbHandler.UpdateMountPermissions)
			}

			// User accessible KBs
			authenticated.GET("/user/accessible-kbs", kbHandler.GetAccessibleKBs)
			authenticated.GET("/user/mounts", kbHandler.GetUserMounts)

			// Documents
			docs := authenticated.Group("/documents")
			{
				docs.POST("", docHandler.UploadDocument)
				docs.GET("", docHandler.ListDocuments)
				docs.GET("/:id", docHandler.GetDocument)
				docs.DELETE("/:id", docHandler.DeleteDocument)
				docs.PUT("/:id/status", docHandler.UpdateDocumentStatus)
				docs.POST("/batch-delete", docHandler.BatchDeleteDocuments)
				docs.POST("/batch-update-status", docHandler.BatchUpdateStatus)
				docs.GET("/:id/chunks", docHandler.ListDocumentChunks)
				docs.GET("/:id/download", docHandler.DownloadDocument)
				docs.GET("/:id/preview", docHandler.PreviewDocument)
			}

			// Search endpoints
			search := authenticated.Group("/search")
			{
				search.POST("", searchHandler.Search)
			}

			// RAG endpoints
			rag := authenticated.Group("/ask")
			{
				rag.POST("", searchHandler.Ask)
			}

			// Streaming RAG endpoint
			authenticated.POST("/ask-stream", searchHandler.AskStream)

			// Query history and statistics
			authenticated.GET("/query-history", searchHandler.GetQueryHistory)
			authenticated.GET("/query-stats", searchHandler.GetQueryStats)

			// Embedding endpoints
			authenticated.POST("/embedding", embeddingHandler.GenerateEmbedding)
			authenticated.POST("/embeddings/batch", embeddingHandler.GenerateBatchEmbeddings)

			// Monitoring endpoints
			system := authenticated.Group("/system")
			{
				system.GET("/status", monitoringHandler.GetSystemStatus)
				system.GET("/metrics", monitoringHandler.GetMetricsSnapshot)
			}

			// Audit logs endpoints (admin only - should add role check in production)
			auditHandler.RegisterRoutes(authenticated)
		}
	}

	// Create HTTP server
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// Start server in goroutine
	go func() {
		log.Printf("✅ Server listening on http://0.0.0.0:%d", cfg.Server.Port)
		log.Println("📖 Swagger UI: http://localhost:" + fmt.Sprint(cfg.Server.Port) + "/swagger/index.html")
		log.Println("💊 Health Check: http://localhost:" + fmt.Sprint(cfg.Server.Port) + "/health")

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")

	// Graceful shutdown with 5 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("✅ Server exited gracefully")
}
