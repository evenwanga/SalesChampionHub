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
	"github.com/SalesChampionHub/ai-knowledge-base/internal/middleware"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/service"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/usercenter"
	"github.com/SalesChampionHub/ai-knowledge-base/pkg/cache"
	"github.com/SalesChampionHub/ai-knowledge-base/pkg/config"
	"github.com/SalesChampionHub/ai-knowledge-base/pkg/database"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
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

	// Initialize middleware instances
	authMiddleware := middleware.NewAuthMiddleware(
		userCenterClient,
		redisClient,
		cfg.Features.CacheTTL,
	)

	rlsMiddleware := middleware.NewRLSMiddleware(db)

	// Initialize repositories
	kbRepo := repository.NewKBRepository(db)
	mountRepo := repository.NewMountRepository(db)
	docRepo := repository.NewDocumentRepository(db)
	vectorRepo := repository.NewVectorRepository(db)
	queryLogRepo := repository.NewQueryLogRepository(db)

	// Initialize cache
	kbCache := kbcache.NewKBCache(redisClient)

	// Initialize services
	kbService := service.NewKBService(kbRepo, mountRepo, docRepo, kbCache, cfg.Query.MaxKBQueryLimit)
	searchService := service.NewSearchService(vectorRepo, queryLogRepo, cfg.Query.MaxKBQueryLimit)
	ragService := service.NewRAGService(searchService, vectorRepo, queryLogRepo, 8000) // 8000 chars max context

	// Initialize handlers
	kbHandler := handler.NewKBHandler(kbService)
	searchHandler := handler.NewSearchHandler(searchService, ragService, kbService)

	// Swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

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

		// Authenticated endpoints
		authenticated := v1.Group("")
		authenticated.Use(authMiddleware.Authenticate())
		authenticated.Use(rlsMiddleware.SetRLSContext())
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
			}

			// Mounts
			mounts := authenticated.Group("/mounts")
			{
				mounts.POST("/tenant", kbHandler.MountKBToTenant)
				mounts.POST("/organization", kbHandler.MountKBToOrganization)
				mounts.POST("/user", kbHandler.MountKBToUser)
				mounts.DELETE("/:id", kbHandler.Unmount)
			}

			// User accessible KBs
			authenticated.GET("/user/accessible-kbs", kbHandler.GetAccessibleKBs)

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

			// Query history
			authenticated.GET("/query-history", searchHandler.GetQueryHistory)
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
