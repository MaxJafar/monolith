package main

import (
	"context"
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/MaxJafar/monolith/gateway/internal/server"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	cfg := server.Environment()
	if len(os.Args) > 1 && os.Args[1] == "schema" {
		if err := server.MigrateSchema(ctx, cfg); err != nil {
			log.Fatal(err)
		}
		return
	}
	app, err := server.Open(ctx, cfg)
	if err != nil {
		log.Fatal(err)
	}
	defer app.Close()
	if len(os.Args) > 1 && (os.Args[1] == "migrate" || os.Args[1] == "recover") {
		flags := flag.NewFlagSet(os.Args[1], flag.ExitOnError)
		actor := flags.String("actor", "", "workspace owner UUID")
		workspace := flags.String("workspace", "", "workspace UUID")
		apply := flags.Bool("apply", false, "commit conversion; default is dry-run")
		_ = flags.Parse(os.Args[2:])
		if os.Args[1] == "recover" {
			if err = app.RecoveryMode(ctx, *actor, *workspace); err != nil {
				log.Fatal(err)
			}
			return
		}
		report, err := app.ConvertWorkspace(ctx, *actor, *workspace, !*apply)
		if err != nil {
			log.Fatal(err)
		}
		_ = json.NewEncoder(os.Stdout).Encode(report)
		return
	}
	httpServer := &http.Server{Addr: cfg.Address, Handler: app.Handler(), ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 30 * time.Second, IdleTimeout: 90 * time.Second, MaxHeaderBytes: 1 << 20}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = httpServer.Shutdown(shutdown)
	}()
	log.Printf("monolith gateway listening on %s", cfg.Address)
	if err = httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
