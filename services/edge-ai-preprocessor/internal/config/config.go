package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	RedisURL   string
	SiteID     string
	TenantID   string
	DICOMPort  int
	HTTPPort   int
	SQLitePath string
}

func Load() (*Config, error) {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	siteID := os.Getenv("SITE_ID")
	if siteID == "" {
		return nil, fmt.Errorf("SITE_ID environment variable is required")
	}

	tenantID := os.Getenv("TENANT_ID")
	if tenantID == "" {
		return nil, fmt.Errorf("TENANT_ID environment variable is required")
	}

	dicomPort := envIntOr("DICOM_PORT", 11112)

	httpPort := envIntOr("HTTP_PORT", 8080)

	sqlitePath := os.Getenv("SQLITE_PATH")
	if sqlitePath == "" {
		sqlitePath = "./edge_outbox.db"
	}

	return &Config{
		RedisURL:   redisURL,
		SiteID:     siteID,
		TenantID:   tenantID,
		DICOMPort:  dicomPort,
		HTTPPort:   httpPort,
		SQLitePath: sqlitePath,
	}, nil
}

func envIntOr(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return v
}
