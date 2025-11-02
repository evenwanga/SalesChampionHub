package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds all application configuration
type Config struct {
	Database   DatabaseConfig
	Redis      RedisConfig
	UserCenter UserCenterConfig
	Server     ServerConfig
	Logto      LogtoConfig
	Features   FeatureFlags
	Query      QueryConfig
}

// DatabaseConfig holds database connection settings
type DatabaseConfig struct {
	Host     string
	Port     int
	Name     string
	User     string
	Password string
	SSLMode  string
}

// RedisConfig holds Redis connection settings
type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

// UserCenterConfig holds sub-project 0 integration settings
type UserCenterConfig struct {
	APIBaseURL string
	APIKey     string
	Timeout    time.Duration
}

// ServerConfig holds server settings
type ServerConfig struct {
	Port         int
	Mode         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
}

// LogtoConfig holds Logto OIDC settings
type LogtoConfig struct {
	Endpoint    string
	AppID       string
	AppSecret   string
	APIResource string
}

// FeatureFlags holds feature toggle settings
type FeatureFlags struct {
	EnableAuditLog bool
	EnableCache    bool
	CacheTTL       time.Duration
}

// QueryConfig holds query-related settings
type QueryConfig struct {
	MaxKBQueryLimit int
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnvInt("DB_PORT", 5434),
			Name:     getEnv("DB_NAME", "knowledge_platform"),
			User:     getEnv("DB_USER", "admin"),
			Password: getEnv("DB_PASSWORD", ""),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnvInt("REDIS_PORT", 6381),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvInt("REDIS_DB", 0),
		},
		UserCenter: UserCenterConfig{
			APIBaseURL: getEnv("USER_CENTER_API", "http://localhost:3003"),
			APIKey:     getEnv("USER_CENTER_API_KEY", ""),
			Timeout:    time.Duration(getEnvInt("USER_CENTER_TIMEOUT", 30)) * time.Second,
		},
		Server: ServerConfig{
			Port:         getEnvInt("SERVER_PORT", 8080),
			Mode:         getEnv("SERVER_MODE", "debug"),
			ReadTimeout:  time.Duration(getEnvInt("SERVER_READ_TIMEOUT", 30)) * time.Second,
			WriteTimeout: time.Duration(getEnvInt("SERVER_WRITE_TIMEOUT", 30)) * time.Second,
		},
		Logto: LogtoConfig{
			Endpoint:    getEnv("LOGTO_ENDPOINT", "http://localhost:3001"),
			AppID:       getEnv("LOGTO_M2M_APP_ID", ""),
			AppSecret:   getEnv("LOGTO_M2M_APP_SECRET", ""),
			APIResource: getEnv("LOGTO_API_RESOURCE", "https://api.saleschampionhub.com/kb"),
		},
		Features: FeatureFlags{
			EnableAuditLog: getEnvBool("ENABLE_AUDIT_LOG", true),
			EnableCache:    getEnvBool("ENABLE_CACHE", true),
			CacheTTL:       time.Duration(getEnvInt("CACHE_TTL_SECONDS", 300)) * time.Second,
		},
		Query: QueryConfig{
			MaxKBQueryLimit: getEnvInt("MAX_KB_QUERY_LIMIT", 4),
		},
	}

	// Validate required fields
	if cfg.Database.Password == "" {
		return nil, fmt.Errorf("DB_PASSWORD is required")
	}
	if cfg.UserCenter.APIKey == "" {
		return nil, fmt.Errorf("USER_CENTER_API_KEY is required")
	}

	return cfg, nil
}

// DatabaseDSN returns the PostgreSQL DSN
func (c *DatabaseConfig) DatabaseDSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.Name, c.SSLMode,
	)
}

// RedisAddr returns the Redis address
func (c *RedisConfig) RedisAddr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

// Helper functions for environment variables

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return defaultValue
}
