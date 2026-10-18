package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"sync/atomic"
	"testing"
)

// Read-only database integration: no schema changes or production endpoint.
func TestReleaseHealthIntegration(t *testing.T) {
	if os.Getenv("MONOLITH_UPDATE_HEALTH_TEST") != "1" {
		t.Skip("requires isolated local database")
	}
	cfg := Environment()
	u, err := url.Parse(cfg.DatabaseURL)
	if err != nil || (u.Hostname() != "localhost" && u.Hostname() != "127.0.0.1") || u.Port() != "55432" || (u.Path != "/zillion_dev" && u.Path != "/monolith_dev") {
		t.Fatal("Use isolated development database")
	}
	t.Setenv("MONOLITH_RELEASE_VERSION", "1.2.0")
	var body atomic.Value
	body.Store(`{"state":"success","data":{"version":"1.2.0","healthy":true}}`)
	private := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/status" {
			t.Error("Unexpected health URL")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(body.Load().(string)))
	}))
	defer private.Close()
	cfg.PrivateURL = private.URL
	cfg.PublicURL = "http://127.0.0.1:8080"
	app, err := Open(context.Background(), cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer app.Close()
	probe := func() *httptest.ResponseRecorder {
		out := httptest.NewRecorder()
		app.Handler().ServeHTTP(out, httptest.NewRequest("GET", "/healthz", nil))
		return out
	}
	response := probe()
	var state struct {
		Version    string
		APIHealthy bool
	}
	if response.Code != 200 || json.Unmarshal(response.Body.Bytes(), &state) != nil || state.Version != "1.2.0" || !state.APIHealthy {
		t.Fatal(response.Code, response.Body.String())
	}
	for _, bad := range []string{`{"state":"success","data":{"version":"1.1.0","healthy":true}}`, `{"state":"success","data":{"version":"1.2.0","healthy":false}}`, `not JSON`} {
		body.Store(bad)
		if response = probe(); response.Code != 503 {
			t.Fatal("Unhealthy API accepted", response.Body.String())
		}
	}
}
