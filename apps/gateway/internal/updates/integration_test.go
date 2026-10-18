package updates

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func desktopFixture(t *testing.T) (*Engine, *Desktop, *releaseFixture) {
	t.Helper()
	f := fixture(t)
	parent := t.TempDir()
	installed := filepath.Join(parent, "Monolith")
	root := filepath.Join(parent, "state")
	if err := os.MkdirAll(filepath.Join(installed, "updater"), 0700); err != nil {
		t.Fatal(err)
	}
	if err := atomicJSON(filepath.Join(installed, "updater", "settings.json"), f.config); err != nil {
		t.Fatal(err)
	}
	os.WriteFile(filepath.Join(installed, "monolith-desktop.exe"), []byte("old application"), 0600)
	os.WriteFile(filepath.Join(installed, "uninstall.exe"), []byte("keep the installer registration"), 0600)
	candidate := f.config
	candidate.Version = f.release.Version
	config, _ := json.Marshal(candidate)
	var data bytes.Buffer
	archive := zip.NewWriter(&data)
	for path, contents := range map[string][]byte{"monolith-desktop.exe": []byte("new application"), "updater/settings.json": config} {
		file, _ := archive.Create(path)
		file.Write(contents)
	}
	archive.Close()
	f.archive = data.Bytes()
	f.release.Artifacts[0].Bytes = int64(len(f.archive))
	f.release.Artifacts[0].SHA256 = sha(f.archive)
	f.sign()
	d := &Desktop{Config: f.config, Root: root, InstallPath: installed}
	d.Launch = func(path string) (int, error) {
		cfg, err := LoadConfig(d.marker(path))
		if err != nil {
			return 0, err
		}
		d.Ready(cfg.Version, 0)
		return 0, nil
	}
	e, err := New(f.config, root, d)
	if err != nil {
		t.Fatal(err)
	}
	e.Client = f.client()
	return e, d, &f
}
func TestDesktopFileActivationAndRollback(t *testing.T) {
	e, d, _ := desktopFixture(t)
	downloadFixture(t, e)
	if err := e.Install(context.Background()); err != nil {
		t.Fatal(err)
	}
	data, _ := os.ReadFile(d.executable(d.InstallPath))
	if string(data) != "new application" {
		t.Fatal("Candidate files not activated")
	}
	if _, err := os.Stat(filepath.Join(d.InstallPath, "uninstall.exe")); err != nil {
		t.Fatal("NSIS registration was discarded")
	}
	if err := e.Rollback(context.Background()); err != nil {
		t.Fatal(err)
	}
	data, _ = os.ReadFile(d.executable(d.InstallPath))
	if string(data) != "old application" {
		t.Fatal("Old executable was not restored")
	}
}
func TestDesktopFailedLaunchRestoresFiles(t *testing.T) {
	e, d, _ := desktopFixture(t)
	downloadFixture(t, e)
	d.Launch = func(root string) (int, error) {
		cfg, err := LoadConfig(d.marker(root))
		if err != nil {
			return 0, err
		}
		if cfg.Version == "1.1.0" {
			return 0, errors.New("New executable cannot launch")
		}
		return 0, nil
	}
	if e.Install(context.Background()) == nil {
		t.Fatal("Broken executable was accepted")
	}
	data, _ := os.ReadFile(d.executable(d.InstallPath))
	if string(data) != "old application" || e.Snapshot().Phase != "rolledBack" {
		t.Fatal(e.Snapshot())
	}
}
func TestDesktopRecoversInterruptedFileSet(t *testing.T) {
	e, d, f := desktopFixture(t)
	downloadFixture(t, e)
	j, err := d.Prepare(context.Background(), &f.release, f.release.Artifacts[0], e.path("package"))
	if err != nil {
		t.Fatal(err)
	}
	j.From = "1.0.0"
	j.To = "1.1.0"
	j.Activated = true
	if err = atomicJSON(e.path("pending.json"), j); err != nil {
		t.Fatal(err)
	}
	// Crash after replacing the executable but before replacing its settings.
	if err = atomicWrite(d.executable(d.InstallPath), []byte("partial candidate")); err != nil {
		t.Fatal(err)
	}
	if err = e.Recover(context.Background()); err != nil {
		t.Fatal(err)
	}
	data, _ := os.ReadFile(d.executable(d.InstallPath))
	if string(data) != "old application" {
		t.Fatal("Mixed-version files survived recovery")
	}
}
func TestMultipartDownload(t *testing.T) {
	f := fixture(t)
	one, two := []byte("first part"), []byte("second part")
	f.archive = append(append([]byte{}, one...), two...)
	artifact := f.release.Artifacts[0]
	artifact.Bytes = int64(len(f.archive))
	artifact.SHA256 = sha(f.archive)
	artifact.Parts = []ArtifactPart{{URL: artifact.URL + ".part01", Bytes: int64(len(one)), SHA256: sha(one)}, {URL: artifact.URL + ".part02", Bytes: int64(len(two)), SHA256: sha(two)}}
	client := &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
		if strings.HasSuffix(r.URL.Path, "part01") {
			return response(one), nil
		}
		return response(two), nil
	})}
	file := filepath.Join(t.TempDir(), "archive")
	var progress int64
	if err := Download(context.Background(), client, artifact, file, func(n int64) { progress = n }); err != nil {
		t.Fatal(err)
	}
	got, _ := os.ReadFile(file)
	if !bytes.Equal(got, f.archive) || progress != artifact.Bytes {
		t.Fatal("Multipart stream was not verified and reassembled")
	}
	artifact.Parts[1].SHA256 = strings.Repeat("0", 64)
	if Download(context.Background(), client, artifact, filepath.Join(t.TempDir(), "bad"), func(int64) {}) == nil {
		t.Fatal("Accepted an invalid part")
	}
}
func TestComposeInstallAndRollbackNeverTouchDatabase(t *testing.T) {
	f := fixture(t)
	root := t.TempDir()
	oldImage := "sha256:" + strings.Repeat("1", 64)
	newImage := "sha256:" + strings.Repeat("2", 64)
	active := oldImage
	version := "1.0.0"
	cfg := f.config
	cfg.Target = "linux-amd64"
	cfg.SchemaHash = f.release.SchemaHash
	cfg.Compose = &ComposeConfig{Files: []string{filepath.Join(root, "compose.yaml")}, EnvFile: filepath.Join(root, ".env"), Project: "monolith", HealthURL: "http://localhost/healthz"}
	var calls [][]string
	c := &Compose{Config: cfg, Root: root, Client: &http.Client{Transport: transport(func(*http.Request) (*http.Response, error) {
		data, _ := json.Marshal(map[string]any{"status": "ok", "version": version, "apiHealthy": true})
		return response(data), nil
	})}}
	c.Run = func(_ context.Context, name string, args ...string) ([]byte, error) {
		calls = append(calls, append([]string{name}, args...))
		joined := strings.Join(args, " ")
		switch {
		case strings.Contains(joined, "ps --all --quiet"):
			return []byte("container"), nil
		case args[0] == "inspect":
			return []byte(active), nil
		case len(args) > 1 && args[0] == "image" && args[1] == "inspect":
			image := args[2]
			v := "1.0.0"
			if image == newImage {
				v = "1.1.0"
			}
			data, _ := json.Marshal([]any{map[string]any{"Id": image, "Architecture": "amd64", "Os": "linux", "Config": map[string]any{"Labels": map[string]string{"org.opencontainers.image.version": v, "app.monolith.schema": cfg.SchemaHash}}}})
			return data, nil
		case strings.Contains(joined, "up --detach"):
			var override struct {
				Services map[string]struct{ Image string }
			}
			if err := readJSON(filepath.Join(root, "active-compose.json"), &override); err != nil {
				// The override also includes pull_policy; decode the known image only.
				data, _ := os.ReadFile(filepath.Join(root, "active-compose.json"))
				if json.Unmarshal(data, &override) != nil {
					return nil, err
				}
			}
			active = override.Services["server"].Image
			version = "1.0.0"
			if active == newImage {
				version = "1.1.0"
			}
			return nil, nil
		default:
			return nil, nil
		}
	}
	artifact := Artifact{ImageID: newImage}
	j, err := c.Prepare(context.Background(), &f.release, artifact, "verified.tar.gz")
	if err != nil {
		t.Fatal(err)
	}
	j.From = "1.0.0"
	j.To = "1.1.0"
	if err = c.Activate(context.Background(), j); err != nil {
		t.Fatal(err)
	}
	if err = c.Healthy(context.Background(), j); err != nil {
		t.Fatal(err)
	}
	if err = c.Rollback(context.Background(), j); err != nil {
		t.Fatal(err)
	}
	if active != oldImage {
		t.Fatal("Previous pinned image was not restored")
	}
	for _, args := range calls {
		joined := strings.Join(args, " ")
		if strings.Contains(joined, " down") || strings.Contains(joined, " migrate") || strings.Contains(joined, "volume ") {
			t.Fatal("Update attempted to modify database or volumes")
		}
		if strings.Contains(joined, "up --detach") && !strings.Contains(joined, "--no-deps --no-build --pull never") {
			t.Fatal("Unsafe compose activation")
		}
	}
}
func TestSupervisorAuthenticationAndCommandGuards(t *testing.T) {
	f := fixture(t)
	f.config.PublicKey = ""
	root := t.TempDir()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	done := make(chan error, 1)
	go func() { done <- Serve(ctx, Options{Config: f.config, Root: root}) }()
	var endpoint Endpoint
	deadline := time.Now().Add(5 * time.Second)
	for readJSON(filepath.Join(root, "endpoint.json"), &endpoint) != nil {
		if time.Now().After(deadline) {
			t.Fatal("Supervisor did not start")
		}
		time.Sleep(20 * time.Millisecond)
	}
	client := &http.Client{Timeout: time.Second}
	call := func(method, path, token, origin string) int {
		t.Helper()
		r, _ := http.NewRequest(method, endpoint.URL+path, nil)
		if token != "" {
			r.Header.Set("Authorization", "Bearer "+token)
		}
		if origin != "" {
			r.Header.Set("Origin", origin)
		}
		res, err := client.Do(r)
		if err != nil {
			t.Fatal(err)
		}
		io.Copy(io.Discard, res.Body)
		res.Body.Close()
		return res.StatusCode
	}
	if call("GET", "/status", "", "") != 403 || call("GET", "/status", endpoint.Token, "https://evil.test") != 403 || call("GET", "/status", endpoint.Token, "") != 200 {
		t.Fatal("Supervisor authentication failed")
	}
	if call("POST", "/install", endpoint.Token, "") != 409 || call("POST", "/rollback", endpoint.Token, "") != 409 {
		t.Fatal("Unavailable operation was accepted")
	}
	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Supervisor did not shut down")
	}
}

type changedDeployment struct{ installerFixture }

func (*changedDeployment) InstalledVersion(context.Context) (string, error) { return "1.0.1", nil }
func TestChangedDeploymentRequiresNewCheck(t *testing.T) {
	e, _, _ := engineFixture(t)
	downloadFixture(t, e)
	installer := &changedDeployment{}
	e.Installer = installer
	if e.Install(context.Background()) == nil || installer.activations != 0 || e.Snapshot().CurrentVersion != "1.0.1" {
		t.Fatal("Updated a deployment using a stale rollback version")
	}
}
func TestComposeRejectsIncompleteHealth(t *testing.T) {
	for _, body := range []string{`{"status":"ok","version":"1.0.0","apiHealthy":true}`, `{"status":"ok","version":"1.1.0","apiHealthy":false}`, `{"status":"ok","version":"1.1.0"}`, `not JSON`} {
		c := &Compose{Config: Config{Compose: &ComposeConfig{HealthURL: "http://localhost/healthz"}}, Client: &http.Client{Transport: transport(func(*http.Request) (*http.Response, error) { return response([]byte(body)), nil })}}
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
		err := c.health(ctx, "1.1.0")
		cancel()
		if err == nil {
			t.Fatalf("Accepted incomplete health: %s", body)
		}
	}
}

func TestRollbackRefusesChangedSchema(t *testing.T) {
	c := &Compose{Config: Config{SchemaHash: strings.Repeat("b", 64)}}
	c.Run = func(_ context.Context, _ string, args ...string) ([]byte, error) {
		if strings.Join(args[:2], " ") != "image inspect" {
			t.Fatal("Attempted to activate an incompatible rollback image")
		}
		return []byte(`[{"Config":{"Labels":{"org.opencontainers.image.version":"1.0.0","app.monolith.schema":"` + strings.Repeat("a", 64) + `"}}}]`), nil
	}
	err := c.Rollback(context.Background(), &Journal{Kind: "compose", From: "1.0.0", OldImages: map[string]string{"server": "sha256:" + strings.Repeat("1", 64)}})
	if err == nil {
		t.Fatal("Accepted rollback across a schema migration")
	}
}
