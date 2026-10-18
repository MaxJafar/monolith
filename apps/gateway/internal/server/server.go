package server

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrations embed.FS

//go:embed openapi.json
var openAPI []byte

type Config struct{ Address, DatabaseURL, AdminURL, PublicURL, PrivateURL, WebRoot, Name, JWTKey, MasterKey, BootstrapToken string }

func Environment() Config {
	return Config{
		Address: env("GATEWAY_ADDRESS", "127.0.0.1:8080"), DatabaseURL: os.Getenv("DATABASE_URL"), AdminURL: os.Getenv("DATABASE_ADMIN_URL"),
		PublicURL: os.Getenv("PUBLIC_URL"), PrivateURL: env("PRIVATE_API_URL", "http://127.0.0.1:3636"), WebRoot: env("WEB_ROOT", "../web/dist"), Name: env("SERVER_NAME", "monolith"),
		JWTKey: os.Getenv("JWT_SIGNING_KEY"), MasterKey: os.Getenv("MASTER_KEY"), BootstrapToken: os.Getenv("BOOTSTRAP_TOKEN"),
	}
}
func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

type Server struct {
	cfg      Config
	pool     *pgxpool.Pool
	serverID string
	mux      *http.ServeMux
}
type Problem struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
type failure struct {
	status        int
	code, message string
}

func (e failure) Error() string                   { return e.message }
func fail(status int, code, message string) error { return failure{status, code, message} }

type handler func(http.ResponseWriter, *http.Request) error

func (s *Server) handle(pattern string, fn handler) {
	s.mux.HandleFunc(pattern, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-store")
		if r.Method != "GET" && r.Method != "HEAD" {
			if origin := r.Header.Get("Origin"); origin != "" && origin != strings.TrimRight(s.cfg.PublicURL, "/") {
				respond(w, 403, Problem{"origin_rejected", "Request origin is not permitted"})
				return
			}
		}
		if err := fn(w, r); err != nil {
			var problem failure
			if errors.As(err, &problem) {
				respond(w, problem.status, Problem{problem.code, problem.message})
				return
			}
			if errors.Is(err, pgx.ErrNoRows) {
				respond(w, 404, Problem{"not_found", "Resource not found"})
				return
			}
			slog.Error("gateway request failed", "path", r.URL.Path, "error", err)
			respond(w, 500, Problem{"internal_error", "The server could not complete this request"})
		}
	})
}
func respond(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if value != nil {
		_ = json.NewEncoder(w).Encode(value)
	}
}
func decode(w http.ResponseWriter, r *http.Request, value any, limit int64) error {
	if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		return fail(415, "invalid_content_type", "Use application/json")
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, limit))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(value); err != nil {
		return fail(400, "invalid_request", "Request body is invalid or too large")
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		return fail(400, "invalid_request", "Request body must contain exactly one JSON value")
	}
	return nil
}
func Open(ctx context.Context, cfg Config) (*Server, error) {
	public, err := url.Parse(cfg.PublicURL)
	if err != nil || public.Host == "" || public.Path != "" && public.Path != "/" || public.User != nil || public.RawQuery != "" || public.Fragment != "" || (public.Scheme != "https" && !(public.Scheme == "http" && (public.Hostname() == "localhost" || public.Hostname() == "127.0.0.1"))) {
		return nil, errors.New("PUBLIC_URL must be an HTTPS origin (loopback HTTP is allowed for development)")
	}
	if len(cfg.JWTKey) < 32 || cfg.MasterKey == "" {
		return nil, errors.New("JWT_SIGNING_KEY (32+ characters) and MASTER_KEY are required")
	}
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	var privileged bool
	if err = pool.QueryRow(ctx, "select rolsuper or rolbypassrls from pg_roles where rolname=current_user").Scan(&privileged); err != nil || privileged {
		pool.Close()
		return nil, errors.New("DATABASE_URL must use a restricted role without SUPERUSER or BYPASSRLS")
	}
	s := &Server{cfg: cfg, pool: pool, mux: http.NewServeMux()}
	if err = pool.QueryRow(ctx, "select id::text from monolith_server_identity where singleton").Scan(&s.serverID); err != nil {
		pool.Close()
		return nil, fmt.Errorf("gateway migrations are required: %w", err)
	}
	s.routes()
	return s, nil
}
func (s *Server) Close()                { s.pool.Close() }
func (s *Server) Handler() http.Handler { return s.mux }
func (s *Server) routes() {
	s.mux.HandleFunc("GET /api/v1/openapi.json", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(openAPI)
	})
	s.handle("GET /.well-known/monolith", func(w http.ResponseWriter, r *http.Request) error {
		respond(w, 200, map[string]any{"serverId": s.serverID, "name": s.cfg.Name, "apiVersion": 1, "editorVersion": 2, "publicUrl": s.cfg.PublicURL, "capabilities": []string{"device-sessions", "editor-v2", "local-drafts", "revision-conflicts"}})
		return nil
	})
	s.handle("GET /healthz", func(w http.ResponseWriter, r *http.Request) error {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := s.pool.Ping(ctx); err != nil {
			return fail(503, "database_unavailable", "Database is unavailable")
		}
		version := os.Getenv("MONOLITH_RELEASE_VERSION")
		if version == "" {
			version = "development"
		}
		request, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimSuffix(s.cfg.PrivateURL, "/")+"/status", nil)
		if err != nil {
			return fail(503, "api_unavailable", "API health check is unavailable")
		}
		client := &http.Client{Timeout: 2 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
		response, err := client.Do(request)
		if err != nil {
			return fail(503, "api_unavailable", "API is unavailable")
		}
		defer response.Body.Close()
		var status struct {
			State string `json:"state"`
			Data  struct {
				Version string `json:"version"`
				Healthy bool   `json:"healthy"`
			} `json:"data"`
		}
		if response.StatusCode != 200 || json.NewDecoder(io.LimitReader(response.Body, 16384)).Decode(&status) != nil || status.State != "success" || !status.Data.Healthy || (version != "development" && status.Data.Version != version) {
			return fail(503, "api_unavailable", "API version or database health does not match the gateway")
		}
		respond(w, 200, map[string]any{"status": "ok", "version": version, "apiHealthy": true})
		return nil
	})
	s.handle("POST /api/v1/device-sessions", s.login)
	s.handle("POST /api/v1/device-sessions/totp", s.verifyTOTP)
	s.handle("POST /api/v1/device-sessions/refresh", s.refresh)
	s.handle("GET /api/v1/device-sessions", s.sessions)
	s.handle("DELETE /api/v1/device-sessions/{id}", s.revoke)
	s.handle("GET /api/v1/editor-documents/{kind}/{id}", s.getDocument)
	s.handle("GET /api/v1/editor-sources/{kind}/{id}", s.resolveSource)
	s.handle("PUT /api/v1/editor-documents/{kind}/{id}", s.saveDocument)
	s.handle("POST /api/v1/editor-documents/{kind}/{id}/initialize", s.initializeDocument)
	s.handle("POST /api/v1/editor-documents/{kind}/{id}/recover", s.recoverDocument)
	s.handle("GET /api/v1/workspaces/{id}/editor", s.rollout)
	s.handle("POST /api/v1/bootstrap", s.bootstrap)
	private, err := url.Parse(s.cfg.PrivateURL)
	if err != nil {
		panic(err)
	}
	proxy := httputil.NewSingleHostReverseProxy(private)
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		respond(w, 502, Problem{"backend_unavailable", "The application service is unavailable"})
	}
	s.mux.Handle("/api/", http.StripPrefix("/api", proxy))
	s.mux.Handle("/socket.io/", proxy)
	s.mux.Handle("/files/", proxy)
	// Installed clients also use these root-level service URLs.
	s.mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/auth/") || strings.HasPrefix(r.URL.Path, "/user/") || strings.HasPrefix(r.URL.Path, "/modules/") {
			proxy.ServeHTTP(w, r)
			return
		}
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" || !strings.Contains(path, ".") {
			http.ServeFile(w, r, s.cfg.WebRoot+"/index.html")
			return
		}
		http.FileServer(http.Dir(s.cfg.WebRoot)).ServeHTTP(w, r)
	}))
}
func MigrateSchema(ctx context.Context, cfg Config) error {
	if cfg.AdminURL == "" {
		return errors.New("DATABASE_ADMIN_URL is required for schema migrations")
	}
	conn, err := pgx.Connect(ctx, cfg.AdminURL)
	if err != nil {
		return err
	}
	defer conn.Close(ctx)
	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, "select pg_advisory_xact_lock(718305432)"); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, "create table if not exists monolith_gateway_migrations(version text primary key, applied_at timestamptz not null default now())"); err != nil {
		return err
	}
	files, _ := migrations.ReadDir("migrations")
	for _, file := range files {
		var exists bool
		if err = tx.QueryRow(ctx, "select exists(select 1 from monolith_gateway_migrations where version=$1)", file.Name()).Scan(&exists); err != nil {
			return err
		}
		if exists {
			continue
		}
		sql, _ := migrations.ReadFile("migrations/" + file.Name())
		if _, err = tx.Exec(ctx, string(sql)); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, "insert into monolith_gateway_migrations(version)values($1)", file.Name()); err != nil {
			return err
		}
	}
	// Grant only to the explicitly configured restricted application role.
	app, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	role := pgx.Identifier{app.ConnConfig.User}.Sanitize()
	for _, table := range []string{"monolith_server_identity", "monolith_editor_documents", "monolith_editor_aliases", "monolith_editor_rollouts", "monolith_migration_checkpoints", "monolith_device_sessions", "monolith_device_refresh", "monolith_login_challenges", "monolith_login_limits"} {
		grant := "select,insert,update,delete"
		if table == "monolith_server_identity" {
			grant = "select"
		}
		if _, err = tx.Exec(ctx, "grant "+grant+" on "+table+" to "+role); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
func setIdentity(ctx context.Context, tx pgx.Tx, user, workspace, device string) error {
	_, err := tx.Exec(ctx, "select set_config('zillion.user_id',$1,true),set_config('monolith.workspace_id',$2,true),set_config('monolith.device_id',$3,true)", user, workspace, device)
	return err
}
func validID(value string) bool { _, err := uuid.Parse(value); return err == nil }
