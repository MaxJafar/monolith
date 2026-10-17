package updates

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"time"
)

type Options struct {
	Config      Config
	Root        string
	InstallPath string
	ParentPID   int
}

func Serve(ctx context.Context, options Options) error {
	if !filepath.IsAbs(options.Root) {
		return errors.New("State path must be absolute")
	}
	if err := os.MkdirAll(options.Root, 0700); err != nil {
		return err
	}
	lock, err := os.OpenFile(filepath.Join(options.Root, "daemon.lock"), os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return err
	}
	defer lock.Close()
	if err = lockFile(lock); err != nil {
		return errors.New("The update supervisor is already running")
	}
	cfg := options.Config
	var installer Installer
	var desktop *Desktop
	if cfg.Compose != nil {
		installer = &Compose{Config: cfg, Root: options.Root}
	} else {
		desktop = &Desktop{Config: cfg, Root: options.Root, InstallPath: options.InstallPath}
		desktop.SetParent(options.ParentPID)
		installer = desktop
	}
	engine, err := New(cfg, options.Root, installer)
	if err != nil {
		return err
	}
	token := randomID()
	if cfg.Compose != nil {
		bytes, err := os.ReadFile(cfg.TokenFile)
		if err != nil {
			return errors.New("Server updater token file is unavailable")
		}
		token = strings.TrimSpace(string(bytes))
		if len(token) < 48 {
			return errors.New("Server update token must contain at least 48 random characters")
		}
	}
	address := cfg.Listen
	if address == "" {
		address = "127.0.0.1:0"
	}
	if desktop != nil && address != "127.0.0.1:0" {
		return errors.New("Desktop updater must use an ephemeral loopback port")
	}
	listener, err := net.Listen("tcp", address)
	if err != nil {
		return err
	}
	defer listener.Close()
	endpoint := Endpoint{URL: "http://" + listener.Addr().String(), Token: token}
	if err = atomicJSON(filepath.Join(options.Root, "endpoint.json"), endpoint); err != nil {
		return err
	}
	defer os.Remove(filepath.Join(options.Root, "endpoint.json"))
	var available atomic.Bool
	var submitted atomic.Bool
	mux := http.NewServeMux()
	write := func(w http.ResponseWriter, status int, value any) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(value)
	}
	mux.HandleFunc("GET /status", func(w http.ResponseWriter, r *http.Request) { write(w, 200, engine.Snapshot()) })
	launch := func(name string, action func(context.Context) error) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			snapshot := engine.Snapshot()
			if err := engine.requireRecovered(); err != nil {
				write(w, 409, map[string]string{"error": err.Error()})
				return
			}
			if !available.Load() || busy(snapshot.Phase) || !submitted.CompareAndSwap(false, true) {
				write(w, 409, map[string]string{"error": "Recovery or another update operation is in progress"})
				return
			}
			if (name == "install" && (snapshot.Phase != "ready" || snapshot.Blocked != "")) || (name == "rollback" && !snapshot.CanRollback) {
				submitted.Store(false)
				write(w, 409, map[string]string{"error": "This update operation is not available in the current state"})
				return
			}
			go func() {
				defer submitted.Store(false)
				if err := action(ctx); err != nil {
					log.Printf("update operation: %v", err)
				}
			}()
			write(w, 202, engine.Snapshot())
		}
	}
	mux.HandleFunc("POST /check", launch("check", engine.Check))
	mux.HandleFunc("POST /download", launch("download", engine.Download))
	mux.HandleFunc("POST /install", launch("install", engine.Install))
	mux.HandleFunc("POST /rollback", launch("rollback", engine.Rollback))
	mux.HandleFunc("POST /settings", func(w http.ResponseWriter, r *http.Request) {
		var p Preferences
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096))
		decoder.DisallowUnknownFields()
		if decoder.Decode(&p) != nil {
			write(w, 400, map[string]string{"error": "Invalid preferences"})
			return
		}
		if !available.Load() {
			write(w, 409, map[string]string{"error": "Recovery is in progress"})
			return
		}
		if err := engine.Settings(p); err != nil {
			write(w, 409, map[string]string{"error": err.Error()})
			return
		}
		write(w, 200, engine.Snapshot())
	})
	mux.HandleFunc("POST /ready", func(w http.ResponseWriter, r *http.Request) {
		if desktop == nil {
			write(w, 404, map[string]string{"error": "Desktop operation"})
			return
		}
		var ready struct {
			Version string `json:"version"`
			PID     int    `json:"pid"`
		}
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&ready) != nil || !versionPattern.MatchString(ready.Version) || ready.PID <= 0 {
			write(w, 400, map[string]string{"error": "Invalid readiness acknowledgement"})
			return
		}
		desktop.Ready(ready.Version, ready.PID)
		write(w, 200, engine.Snapshot())
	})
	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Origin") != "" || subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte("Bearer "+token)) != 1 {
			write(w, 403, map[string]string{"error": "Updater authentication required"})
			return
		}
		mux.ServeHTTP(w, r)
	}), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 8192}
	stopped := make(chan error, 1)
	go func() { stopped <- server.Serve(listener) }()
	// Recovery runs before any download/install commands and before automatic work.
	if err = engine.Recover(ctx); err != nil {
		log.Printf("Updater recovery requires attention: %v", err)
		_ = engine.fail(err)
	} else {
		if compose, ok := installer.(*Compose); ok {
			version, err := compose.InstalledVersion(ctx)
			if err != nil {
				_ = engine.fail(err)
			} else {
				_ = engine.change(func(s *State) {
					if s.CurrentVersion != version {
						s.CanRollback = false
						s.Phase = "idle"
						s.CheckedAt = ""
					}
					s.CurrentVersion = version
				})
				available.Store(true)
			}
		} else {
			available.Store(true)
		}
	}
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	parentTicker := time.NewTicker(5 * time.Second)
	defer parentTicker.Stop()
	if available.Load() {
		go engine.Automatic(ctx)
	}
	for {
		select {
		case err := <-stopped:
			if err == http.ErrServerClosed {
				return nil
			}
			return err
		case <-ctx.Done():
			available.Store(false)
			shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_ = server.Shutdown(shutdown)
			settled := make(chan struct{})
			go func() { engine.op.Lock(); engine.op.Unlock(); close(settled) }()
			select {
			case <-settled:
			case <-time.After(210 * time.Second):
			}
			return nil
		case <-ticker.C:
			if available.Load() && !submitted.Load() {
				go engine.Automatic(ctx)
			}
		case <-parentTicker.C:
			if desktop != nil && desktop.Parent() > 0 && !processAlive(desktop.Parent()) && !busy(engine.Snapshot().Phase) {
				_ = server.Close()
				return nil
			}
		}
	}
}

func PrintConfigError(err error) error { return fmt.Errorf("Monolith updater: %w", err) }
