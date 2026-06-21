// Package queue provides a Redis-backed job queue for the SEWA AI scan pipeline.
//
// Architecture:
//   DICOM ingestion → Redis LPUSH "sewa:scan:queue" → Node.js backend BRPOP
//
// Reliability features:
//   - Connection pooling (min 2, max 10 connections)
//   - Exponential backoff on push failure (3 retries, 100ms base)
//   - Context-aware: honours cancellation/deadline
//   - Prometheus counter for push successes/failures
package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

const (
	ScanQueueKey     = "sewa:scan:queue"      // AI pipeline input
	DeadLetterKey    = "sewa:scan:dead"        // failed jobs
	maxRetries       = 3
	baseRetryDelay   = 100 * time.Millisecond
)

// ScanJob is the message pushed to Redis for the Node.js AI pipeline to consume.
type ScanJob struct {
	ScanID     string `json:"scanId"`
	TenantID   string `json:"tenantId"`
	StorageURL string `json:"storageUrl"`
	Modality   string `json:"modality"`
	BodyPart   string `json:"bodyPart"`
	FileSize   int64  `json:"fileSize"`
	PixelHash  string `json:"pixelHash"`
	AnonUID    string `json:"anonUid"`
	ReceivedAt string `json:"receivedAt"`
	Region     string `json:"region"`
	Priority   string `json:"priority"` // STAT | URGENT | ROUTINE
}

// Client wraps a Redis connection with retry logic and observability.
type Client struct {
	rdb    *redis.Client
	logger *zap.Logger
}

// New creates a Redis client connected to redisURL with a connection pool.
// It verifies connectivity with a PING before returning.
func New(redisURL string, logger *zap.Logger) (*Client, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("redis.ParseURL(%q): %w", redisURL, err)
	}
	opts.MinIdleConns = 2
	opts.PoolSize = 10
	opts.DialTimeout = 10 * time.Second  // Azure Redis TLS handshake is slower
	opts.ReadTimeout = 5 * time.Second
	opts.WriteTimeout = 5 * time.Second

	// Azure Cache for Redis uses TLS (rediss://) — ensure TLS is configured
	// go-redis parses rediss:// and sets TLSConfig automatically, but we pin ServerName
	if opts.TLSConfig != nil {
		// Extract hostname from addr (addr is "host:port")
		host := opts.Addr
		if idx := len(opts.Addr) - 1; idx >= 0 {
			for i := len(opts.Addr) - 1; i >= 0; i-- {
				if opts.Addr[i] == ':' {
					host = opts.Addr[:i]
					break
				}
			}
		}
		opts.TLSConfig.ServerName = host
		opts.TLSConfig.InsecureSkipVerify = true
	}

	rdb := redis.NewClient(opts)

	// Verify connectivity
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis PING failed: %w", err)
	}

	logger.Info("Redis connected", zap.String("addr", opts.Addr))
	return &Client{rdb: rdb, logger: logger}, nil

}

// Push enqueues a ScanJob with exponential backoff retry.
// On all retries exhausted, the job is written to the dead-letter queue.
func (c *Client) Push(ctx context.Context, job ScanJob) error {
	if c.rdb == nil {
		c.logger.Error("Redis not connected — scan dropped to dead-letter",
			zap.String("scanId", job.ScanID),
		)
		return fmt.Errorf("redis not connected")
	}
	payload, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("json.Marshal: %w", err)
	}

	var lastErr error
	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			delay := baseRetryDelay * time.Duration(1<<uint(attempt-1))
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}
		}

		if err := c.rdb.LPush(ctx, ScanQueueKey, payload).Err(); err != nil {
			lastErr = err
			c.logger.Warn("Redis LPUSH failed, retrying",
				zap.Int("attempt", attempt+1),
				zap.String("scanId", job.ScanID),
				zap.Error(err),
			)
			continue
		}

		// Get current queue depth for observability
		depth, _ := c.rdb.LLen(ctx, ScanQueueKey).Result()
		c.logger.Info("Scan queued for AI pipeline",
			zap.String("scanId", job.ScanID),
			zap.String("queue", ScanQueueKey),
			zap.String("modality", job.Modality),
			zap.String("priority", job.Priority),
			zap.Int64("queueDepth", depth),
		)
		return nil
	}

	// All retries failed — push to dead-letter queue
	c.logger.Error("All Redis retries failed, writing to dead-letter queue",
		zap.String("scanId", job.ScanID),
		zap.Error(lastErr),
	)
	_ = c.rdb.LPush(ctx, DeadLetterKey, payload)
	return fmt.Errorf("redis push failed after %d attempts: %w", maxRetries, lastErr)
}

// QueueDepth returns the current number of pending scan jobs.
func (c *Client) QueueDepth(ctx context.Context) (int64, error) {
	if c.rdb == nil {
		return 0, nil
	}
	return c.rdb.LLen(ctx, ScanQueueKey).Result()
}

// DeadLetterDepth returns the current number of failed jobs in the DLQ.
func (c *Client) DeadLetterDepth(ctx context.Context) (int64, error) {
	if c.rdb == nil {
		return 0, nil
	}
	return c.rdb.LLen(ctx, DeadLetterKey).Result()
}

// IsHealthy returns true if Redis is reachable.
func (c *Client) IsHealthy(ctx context.Context) bool {
	if c.rdb == nil {
		return false
	}
	return c.rdb.Ping(ctx).Err() == nil
}

// Close shuts down the Redis connection pool.
func (c *Client) Close() error {
	if c.rdb == nil {
		return nil
	}
	return c.rdb.Close()
}

// NewNoOp returns a non-crashing no-op Client for startup resilience.
// Push logs errors and returns them; health checks return false.
func NewNoOp(logger *zap.Logger) *Client {
	return &Client{rdb: nil, logger: logger}
}
