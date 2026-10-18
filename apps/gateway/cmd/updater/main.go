package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/MaxJafar/monolith/gateway/internal/updates"
)

func main() {
	config := flag.String("config", "", "Trusted updater configuration JSON")
	state := flag.String("state", "", "Absolute update state directory")
	install := flag.String("install", "", "Desktop application installation directory")
	parent := flag.Int("parent", 0, "Desktop process ID")
	flag.Parse()
	cfg, err := updates.LoadConfig(*config)
	if err != nil {
		log.Fatal(updates.PrintConfigError(err))
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	if err = updates.Serve(ctx, updates.Options{Config: cfg, Root: *state, InstallPath: *install, ParentPID: *parent}); err != nil {
		log.Fatal(updates.PrintConfigError(err))
	}
}
