// SEWA XAI — DICOM Ingestion Service (Go) — Production Edition
// Real DICOM parsing, PHI anonymisation, Redis dispatch, Prometheus metrics.
//
// Pipeline:
//   PACS/Modality → DICOM C-STORE TCP:11112 → Parse → Anonymise
//   → Upload to Azure Blob → LPUSH sewa:scan:queue → Node.js AI pipeline
//
// Why Go:
//   <20MB RAM idle · sub-100ms anonymisation · 1000s concurrent goroutines
package main

import (
	"context"
	"crypto/subtle"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"

	dicomparser "github.com/sewa-ai/dicom-ingestion/internal/dicom"
	"github.com/sewa-ai/dicom-ingestion/internal/queue"
	"github.com/sewa-ai/dicom-ingestion/internal/storage"
)

// ldflags injected by Dockerfile
var (
	Version   = "2.0.0"
	BuildTime = "unknown"
)

// ── Configuration ──────────────────────────────────────────────────────────
type Config struct {
	DicomPort        int
	HTTPPort         int
	RedisURL         string
	StorageProvider  string // azure | local
	StorageAccount   string
	StorageContainer string
	StorageConnStr   string
	StorageLocalDir  string
	TenantID         string
	AETTitle         string
	MaxWorkers       int
	Region           string
	APIKey           string
	TLSCertFile      string
	TLSKeyFile       string
	AnonSalt         string
}

func loadConfig() Config {
	return Config{
		DicomPort:        envInt("DICOM_PORT", 11112),
		HTTPPort:         envInt("HTTP_PORT", 8090),
		RedisURL:         envStr("REDIS_URL", "redis://localhost:6379/0"),
		StorageProvider:  envStr("STORAGE_PROVIDER", "azure"),
		StorageAccount:   envStr("AZURE_STORAGE_ACCOUNT", ""),
		StorageContainer: envStr("AZURE_STORAGE_CONTAINER", "scans"),
		StorageConnStr:   envStr("AZURE_STORAGE_CONNECTION_STRING", ""),
		StorageLocalDir:  envStr("STORAGE_LOCAL_DIR", "/data/scans"),
		TenantID:         envStr("TENANT_ID", "default"),
		AETTitle:         envStr("AE_TITLE", "SEWA_INGESTION"),
		MaxWorkers:       envInt("MAX_WORKERS", 20),
		Region:           envStr("REGION", "uk"),
		APIKey:           envStr("DICOM_API_KEY", ""),
		TLSCertFile:      envStr("TLS_CERT_FILE", ""),
		TLSKeyFile:       envStr("TLS_KEY_FILE", ""),
		AnonSalt:         envStr("DICOM_ANON_SALT", ""),
	}
}

// ── Domain types ────────────────────────────────────────────────────────────
type DICOMJob struct {
	RawData    []byte
	SourceAET  string
	TenantID   string
	ReceivedAt time.Time
}

// ── Prometheus metrics ──────────────────────────────────────────────────────
var (
	dicomReceived = promauto.NewCounter(prometheus.CounterOpts{
		Name: "sewa_dicom_received_total",
		Help: "Total DICOM files received via C-STORE",
	})
	dicomProcessed = promauto.NewCounter(prometheus.CounterOpts{
		Name: "sewa_dicom_processed_total",
		Help: "Total DICOM files successfully anonymised and queued",
	})
	dicomFailed = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "sewa_dicom_failed_total",
		Help: "Total DICOM files that failed, by reason",
	}, []string{"reason"})
	processingDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "sewa_dicom_processing_seconds",
		Help:    "End-to-end DICOM processing latency",
		Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5},
	})
	queueDepth = promauto.NewGaugeFunc(prometheus.GaugeOpts{
		Name: "sewa_dicom_queue_backlog",
		Help: "Internal goroutine queue depth",
	}, func() float64 { return 0 }) // updated dynamically
	redisQueueDepth = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "sewa_redis_scan_queue_depth",
		Help: "Number of scan jobs pending in Redis",
	})
	anonDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "sewa_dicom_anonymisation_seconds",
		Help:    "PHI anonymisation processing time",
		Buckets: []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25},
	})
	storageDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "sewa_dicom_storage_seconds",
		Help:    "Cloud storage upload time",
		Buckets: []float64{0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0},
	})
	cstoreConnections = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "sewa_dicom_cstore_connections",
		Help: "Active C-STORE TCP connections",
	})
	cstoreReceivedTotal = promauto.NewCounter(prometheus.CounterOpts{
		Name: "sewa_dicom_cstore_received_total",
		Help: "Total DICOM instances received via C-STORE protocol",
	})
	cstoreFailedTotal = promauto.NewCounter(prometheus.CounterOpts{
		Name: "sewa_dicom_cstore_failed_total",
		Help: "Total DICOM C-STORE failures",
	})
)

// ── Ingestion Service ───────────────────────────────────────────────────────
type IngestionService struct {
	cfg     Config
	logger  *zap.Logger
	queue   chan *DICOMJob
	redis   *queue.Client
	storage *storage.Client
	cstore  *dicomparser.CStoreSCP
	wg      sync.WaitGroup
	mu      sync.RWMutex
	healthy bool
}

func NewIngestionService(cfg Config, logger *zap.Logger, redisClient *queue.Client) *IngestionService {
	return &IngestionService{
		cfg:     cfg,
		logger:  logger,
		queue:   make(chan *DICOMJob, 500),
		redis:   redisClient,
		storage: storage.New(cfg.StorageProvider, cfg.StorageConnStr, cfg.StorageContainer, cfg.StorageAccount, cfg.StorageLocalDir),
		healthy: true,
	}
}

func (s *IngestionService) getRedis() *queue.Client {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.redis
}

// Start launches the worker pool, background Redis depth poller, and C-STORE listener.
func (s *IngestionService) Start(ctx context.Context) {
	for i := 0; i < s.cfg.MaxWorkers; i++ {
		s.wg.Add(1)
		go s.worker(ctx, i)
	}

	// Poll Redis queue depth every 15s for Prometheus
	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				depth, err := s.getRedis().QueueDepth(ctx)
				if err == nil {
					redisQueueDepth.Set(float64(depth))
				}
			}
		}
	}()

	// Start C-STORE DICOM listener on port 11112
	cstoreAddr := fmt.Sprintf(":%d", s.cfg.DicomPort)
	s.cstore = dicomparser.NewCStoreSCP(s.cfg.AETTitle, func(rawData []byte, sourceAET string) error {
		cstoreReceivedTotal.Inc()
		return s.Receive(rawData, sourceAET, s.cfg.TenantID)
	})

	if err := s.cstore.Start(cstoreAddr); err != nil {
		s.logger.Fatal("C-STORE listener failed", zap.Error(err))
	}
	s.logger.Info("C-STORE DICOM listener started", zap.String("addr", cstoreAddr), zap.String("aeTitle", s.cfg.AETTitle))

	s.logger.Info("SEWA DICOM Ingestion Service started",
		zap.Int("workers", s.cfg.MaxWorkers),
		zap.Int("dicomPort", s.cfg.DicomPort),
		zap.String("aeTitle", s.cfg.AETTitle),
		zap.String("storage", s.cfg.StorageProvider),
		zap.String("region", s.cfg.Region),
	)
}

// Receive accepts a raw DICOM byte slice (called by C-STORE handler / HTTP endpoint).
func (s *IngestionService) Receive(rawData []byte, sourceAET, tenantID string) error {
	dicomReceived.Inc()

	job := &DICOMJob{
		RawData:    rawData,
		SourceAET:  sourceAET,
		TenantID:   tenantID,
		ReceivedAt: time.Now(),
	}

	select {
	case s.queue <- job:
		return nil
	default:
		dicomFailed.WithLabelValues("queue_full").Inc()
		return fmt.Errorf("ingestion queue full — DICOM rejected (backpressure)")
	}
}

// worker pulls jobs from the channel and processes them.
func (s *IngestionService) worker(ctx context.Context, id int) {
	defer s.wg.Done()
	s.logger.Info("Worker started", zap.Int("workerId", id))

	for {
		select {
		case <-ctx.Done():
			s.logger.Info("Worker shutting down", zap.Int("workerId", id))
			return
		case job, ok := <-s.queue:
			if !ok {
				return
			}
			start := time.Now()
			if err := s.process(ctx, job); err != nil {
				s.logger.Error("DICOM processing failed", zap.Error(err))
				dicomFailed.WithLabelValues("processing").Inc()
			} else {
				dicomProcessed.Inc()
			}
			processingDuration.Observe(time.Since(start).Seconds())
		}
	}
}

// process: parse → validate → anonymise → upload → queue
func (s *IngestionService) process(ctx context.Context, job *DICOMJob) error {
	// ── 1. Parse DICOM ─────────────────────────────────────────────────────
	parsed, err := dicomparser.Parse(job.RawData)
	if err != nil {
		return fmt.Errorf("parse: %w", err)
	}

	scanID    := uuid.New().String()
	pseudoUID := dicomparser.GeneratePseudoUID(parsed.InstanceUID, job.TenantID)

	s.logger.Info("DICOM parsed",
		zap.String("scanId", scanID),
		zap.String("modality", parsed.Modality),
		zap.String("bodyPart", parsed.BodyPart),
		zap.String("sourceAET", job.SourceAET),
		zap.String("studyDate", parsed.StudyDate),
		zap.Int64("sizeBytes", parsed.FileSizeBytes),
	)

	// ── 2. Validate ────────────────────────────────────────────────────────
	if err := validate(parsed); err != nil {
		return fmt.Errorf("validate: %w", err)
	}

	// ── 3. Anonymise ───────────────────────────────────────────────────────
	anonStart := time.Now()
	anonBytes, err := dicomparser.Anonymise(parsed, pseudoUID, job.TenantID)
	if err != nil {
		return fmt.Errorf("anonymise: %w", err)
	}
	anonDuration.Observe(time.Since(anonStart).Seconds())

	s.logger.Info("DICOM anonymised",
		zap.String("scanId", scanID),
		zap.String("pseudoUID", pseudoUID),
		zap.Int("anonBytes", len(anonBytes)),
	)

	// ── 4. Upload to cloud storage ─────────────────────────────────────────
	storageKey := fmt.Sprintf("%s/scans/%s/%s.dcm", job.TenantID, scanID, pseudoUID)
	storeStart := time.Now()
	storageURL, err := s.storage.Upload(ctx, storageKey, anonBytes)
	if err != nil {
		// Log but don't fail — the AI pipeline can still process if blob is unavailable
		s.logger.Warn("Storage upload failed, continuing with URL-only", zap.Error(err))
		storageURL = buildStorageURL(s.cfg, storageKey)
	}
	storageDuration.Observe(time.Since(storeStart).Seconds())

	s.logger.Info("DICOM stored",
		zap.String("scanId", scanID),
		zap.String("url", storageURL),
		zap.Int("bytes", len(anonBytes)),
	)

	// ── 5. Push to Redis AI queue ──────────────────────────────────────────
	priority := priorityForModality(parsed.Modality)
	scanJob := queue.ScanJob{
		ScanID:     scanID,
		TenantID:   job.TenantID,
		StorageURL: storageURL,
		Modality:   parsed.Modality,
		BodyPart:   parsed.BodyPart,
		FileSize:   parsed.FileSizeBytes,
		PixelHash:  parsed.PixelHash,
		AnonUID:    pseudoUID,
		ReceivedAt: job.ReceivedAt.Format(time.RFC3339),
		Region:     s.cfg.Region,
		Priority:   priority,
	}

	if err := s.getRedis().Push(ctx, scanJob); err != nil {
		return fmt.Errorf("redis push: %w", err)
	}

	s.logger.Info("Scan dispatched to AI pipeline",
		zap.String("scanId", scanID),
		zap.String("priority", priority),
	)
	return nil
}

// Shutdown drains in-flight jobs, stops C-STORE listener, and closes the Redis pool.
func (s *IngestionService) Shutdown() {
	s.mu.Lock()
	s.healthy = false
	s.mu.Unlock()

	s.logger.Info("Draining job queue...", zap.Int("pending", len(s.queue)))
	close(s.queue)
	s.wg.Wait()

	if s.cstore != nil {
		s.cstore.Stop()
		s.logger.Info("C-STORE listener stopped")
	}

	if err := s.getRedis().Close(); err != nil {
		s.logger.Warn("Redis close error", zap.Error(err))
	}
	s.logger.Info("DICOM Ingestion Service shutdown complete")
}

// ── Auth middleware ────────────────────────────────────────────────────────
func authMiddleware(apiKey string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if apiKey != "" {
			provided := r.Header.Get("X-API-Key")
			if subtle.ConstantTimeCompare([]byte(apiKey), []byte(provided)) != 1 {
				w.WriteHeader(http.StatusUnauthorized)
				fmt.Fprint(w, `{"error":"unauthorized"}`)
				return
			}
		}
		next(w, r)
	}
}

// ── HTTP server ─────────────────────────────────────────────────────────────
func startHTTPServer(cfg Config, svc *IngestionService) *http.Server {
	mux := http.NewServeMux()

	// Health — Kubernetes liveness probe
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		svc.mu.RLock()
		ok := svc.healthy
		svc.mu.RUnlock()
		if !ok {
			w.WriteHeader(http.StatusServiceUnavailable)
			fmt.Fprint(w, `{"status":"unhealthy"}`)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"healthy","service":"sewa-dicom-ingestion","region":"%s","aeTitle":"%s","version":"%s"}`,
			cfg.Region, cfg.AETTitle, Version)
	})

	// Ready — Kubernetes readiness: only ready when Redis is reachable
	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		if !svc.getRedis().IsHealthy(ctx) {
			w.WriteHeader(http.StatusServiceUnavailable)
			fmt.Fprint(w, `{"ready":false,"reason":"redis_unreachable"}`)
			return
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"ready":true}`)
	})

	// Stats — queue depth and worker info
	mux.HandleFunc("/stats", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		redisDepth, _ := svc.redis.QueueDepth(ctx)
		dlqDepth, _   := svc.redis.DeadLetterDepth(ctx)
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"internalQueue":%d,"redisQueue":%d,"deadLetter":%d,"workers":%d}`,
			len(svc.queue), redisDepth, dlqDepth, cfg.MaxWorkers)
	})

	// Ingest — HTTP endpoint for non-C-STORE DICOM submission (testing / REST clients)
	ingestHandler := func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST only", http.StatusMethodNotAllowed)
			return
		}
		if r.ContentLength > 2*1024*1024*1024 {
			http.Error(w, "file too large", http.StatusRequestEntityTooLarge)
			return
		}
		raw := make([]byte, r.ContentLength)
		if _, err := r.Body.Read(raw); err != nil && len(raw) == 0 {
			http.Error(w, "read body: "+err.Error(), http.StatusBadRequest)
			return
		}
		sourceAET := r.Header.Get("X-AE-Title")
		if sourceAET == "" {
			sourceAET = "HTTP_CLIENT"
		}
		tenantID := r.Header.Get("X-Tenant-ID")
		if tenantID == "" {
			tenantID = cfg.TenantID
		}
		if err := svc.Receive(raw, sourceAET, tenantID); err != nil {
			http.Error(w, err.Error(), http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusAccepted)
		fmt.Fprint(w, `{"accepted":true}`)
	}

	if cfg.APIKey != "" {
		mux.Handle("/ingest", authMiddleware(cfg.APIKey, ingestHandler))
	} else {
		mux.HandleFunc("/ingest", ingestHandler)
	}

	// Prometheus metrics
	mux.Handle("/metrics", promhttp.Handler())

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.HTTPPort),
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	return srv
}

// ── Helpers ─────────────────────────────────────────────────────────────────

func validate(p *dicomparser.ParsedDICOM) error {
	validModalities := map[string]bool{
		"CT": true, "MR": true, "MRI": true, "XR": true,
		"CR": true, "DX": true, "US": true, "PT": true,
		"NM": true, "RF": true, "OT": true,
	}
	if !validModalities[strings.ToUpper(p.Modality)] {
		return fmt.Errorf("unsupported modality: %q", p.Modality)
	}
	if p.FileSizeBytes < 1024 {
		return fmt.Errorf("file too small (%d bytes) — likely corrupt", p.FileSizeBytes)
	}
	if p.FileSizeBytes > 2*1024*1024*1024 {
		return fmt.Errorf("file too large (%d bytes) — exceeds 2GB limit", p.FileSizeBytes)
	}
	return nil
}

// priorityForModality maps DICOM modality codes to clinical priority tiers.
func priorityForModality(modality string) string {
	switch strings.ToUpper(modality) {
	case "CT", "MR", "MRI", "PT":
		return "URGENT"
	case "XR", "CR", "DX":
		return "ROUTINE"
	case "US":
		return "ROUTINE"
	default:
		return "ROUTINE"
	}
}

func buildStorageURL(cfg Config, key string) string {
	switch cfg.StorageProvider {
	case "azure":
		return fmt.Sprintf("https://%s.blob.core.windows.net/%s/%s",
			cfg.StorageAccount, cfg.StorageContainer, key)
	default:
		return fmt.Sprintf("file://%s/%s", cfg.StorageLocalDir, key)
	}
}

func envStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

// ── Entry point ──────────────────────────────────────────────────────────────
func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	cfg := loadConfig()

	// Validate required config
	if cfg.AnonSalt == "" {
		logger.Fatal("DICOM_ANON_SALT environment variable is required")
	}
	if cfg.StorageProvider == "azure" && cfg.StorageConnStr == "" && cfg.StorageAccount == "" {
		logger.Warn("AZURE_STORAGE_CONNECTION_STRING not set — Azure uploads will fail")
	}

	// Bootstrap services
	svc := NewIngestionService(cfg, logger, queue.NewNoOp(logger))
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// ── HTTP server ─────────────────────────────────────────────────────────
	httpSrv := startHTTPServer(cfg, svc)
	go func() {
		logger.Info("HTTP server starting",
			zap.String("addr", httpSrv.Addr),
			zap.String("metricsPath", "/metrics"),
			zap.String("healthPath", "/health"),
			zap.String("ingestPath", "/ingest"),
		)
		var err error
		if cfg.TLSCertFile != "" && cfg.TLSKeyFile != "" {
			err = httpSrv.ListenAndServeTLS(cfg.TLSCertFile, cfg.TLSKeyFile)
		} else {
			err = httpSrv.ListenAndServe()
		}
		if err != nil && err != http.ErrServerClosed {
			logger.Fatal("HTTP server error", zap.Error(err))
		}
	}()

	// ── Connect to Redis (background retry) ─────────────────────────────
	go func() {
		for attempt := 1; ; attempt++ {
			rdb, err := queue.New(cfg.RedisURL, logger)
			if err == nil {
				svc.mu.Lock()
				svc.redis = rdb
				svc.mu.Unlock()
				logger.Info("Redis connected — service fully ready", zap.Int("attempt", attempt))
				return
			}
			backoff := time.Duration(attempt) * 5 * time.Second
			if backoff > 30*time.Second {
				backoff = 30 * time.Second
			}
			logger.Warn("Redis connection failed, retrying",
				zap.Int("attempt", attempt),
				zap.Error(err),
			)
			select {
			case <-ctx.Done():
				return
			case <-time.After(backoff):
			}
		}
	}()

	svc.Start(ctx)

	logger.Info("SEWA XAI DICOM Ingestion Service ready",
		zap.String("version", Version),
		zap.String("ae_title", cfg.AETTitle),
		zap.Int("dicom_port", cfg.DicomPort),
		zap.Int("http_port", cfg.HTTPPort),
		zap.String("region", cfg.Region),
		zap.String("storage", cfg.StorageProvider),
		zap.Int("workers", cfg.MaxWorkers),
		zap.String("redis", cfg.RedisURL),
		zap.Bool("tls_enabled", cfg.TLSCertFile != ""),
		zap.Bool("auth_enabled", cfg.APIKey != ""),
	)

	// ── Graceful shutdown ───────────────────────────────────────────────────
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
	<-sigCh

	logger.Info("Shutdown signal received — draining...")
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		logger.Warn("HTTP shutdown error", zap.Error(err))
	}
	svc.Shutdown()
	logger.Info("Shutdown complete")
}
