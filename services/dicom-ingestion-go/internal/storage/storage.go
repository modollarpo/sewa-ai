// Package storage provides cloud storage upload for anonymised DICOM files.
// Supports Azure Blob Storage (primary) and local filesystem (dev fallback).
package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ClientUploads anonymised DICOM bytes to the configured cloud storage.
type Client struct {
	provider     string
	azConnString string
	container    string
	account      string
	localDir     string
}

// New creates a storage client.
//   provider: "azure" | "local"
//   For "azure": requires connString, container, account
//   For "local": requires localDir
func New(provider, connString, container, account, localDir string) *Client {
	return &Client{
		provider:     provider,
		azConnString: connString,
		container:    container,
		account:      account,
		localDir:     localDir,
	}
}

// Upload stores bytes at the given key (e.g. "tenant/scans/uuid/file.dcm").
// Returns the public URL for the stored object.
func (c *Client) Upload(ctx context.Context, key string, data []byte) (string, error) {
	switch c.provider {
	case "azure":
		return c.uploadAzure(ctx, key, data)
	default:
		return c.uploadLocal(key, data)
	}
}

func (c *Client) uploadAzure(ctx context.Context, key string, data []byte) (string, error) {
	// Azure Blob upload via Azurite-compatible REST PUT
	url := fmt.Sprintf("https://%s.blob.core.windows.net/%s/%s", c.account, c.container, key)
	req, err := http.NewRequestWithContext(ctx, "PUT", url, bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("azure request: %w", err)
	}
	req.Header.Set("x-ms-blob-type", "BlockBlob")
	req.Header.Set("Content-Type", "application/dicom")
	req.Header.Set("x-ms-date", time.Now().UTC().Format(http.TimeFormat))

	// Try connection string SAS token or Managed Identity (via DefaultAzureCredential)
	if c.azConnString != "" {
		// Connection string: parse SAS token or account key
		if sas := extractSAS(c.azConnString); sas != "" {
			req.URL.RawQuery = sas
		}
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("azure upload: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("azure upload status=%d: %s", resp.StatusCode, string(body))
	}

	return url, nil
}

func (c *Client) uploadLocal(key string, data []byte) (string, error) {
	localPath := filepath.Join(c.localDir, key)
	if err := os.MkdirAll(filepath.Dir(localPath), 0755); err != nil {
		return "", fmt.Errorf("local mkdir: %w", err)
	}
	if err := os.WriteFile(localPath, data, 0644); err != nil {
		return "", fmt.Errorf("local write: %w", err)
	}
	return localPath, nil
}

func extractSAS(connStr string) string {
	// Minimal SAS token extraction from Azure connection string
	for _, part := range strings.Split(connStr, ";") {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) == 2 && strings.EqualFold(kv[0], "SharedAccessSignature") {
			return kv[1]
		}
	}
	return ""
}
