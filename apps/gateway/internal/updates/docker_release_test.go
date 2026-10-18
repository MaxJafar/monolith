package updates

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

// Opt-in: only the disposable release CI project. Uses the packaged application,
// real Docker/Compose and persistent volumes; GitHub discovery is served locally.
func TestComposeRealDockerRelease(t *testing.T) {
	if os.Getenv("MONOLITH_DOCKER_REHEARSAL") != "1" {
		t.Skip("enabled by the disposable server release rehearsal")
	}
	if os.Getenv("CI") != "true" || runtime.GOOS != "linux" {
		t.Fatal("Docker rehearsal requires a disposable Linux CI runner")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 18*time.Minute)
	defer cancel()
	kit := os.Getenv("MONOLITH_REHEARSAL_KIT")
	if !filepath.IsAbs(kit) || !strings.HasPrefix(filepath.Base(kit), "server-kit-") {
		t.Fatal("Invalid rehearsal kit")
	}
	metadata := os.Getenv("MONOLITH_REHEARSAL_ARTIFACT")
	var artifact Artifact
	data, err := os.ReadFile(metadata)
	if err != nil || json.Unmarshal(data, &artifact) != nil {
		t.Fatal("Missing packaged server artifact")
	}
	version := os.Getenv("MONOLITH_REHEARSAL_VERSION")
	if !versionPattern.MatchString(version) || Compare(version, "0.0.0") <= 0 {
		t.Fatal("Invalid candidate version")
	}
	f := fixture(t)
	f.config.Version = "0.0.0"
	f.config.Target = os.Getenv("MONOLITH_REHEARSAL_TARGET")
	f.config.Compose = &ComposeConfig{Files: []string{filepath.Join(kit, "compose.yaml")}, EnvFile: filepath.Join(kit, "env/.env.docker"), Project: "monolith-release-test", HealthURL: "http://127.0.0.1:8080/healthz"}
	run := func(args ...string) string {
		t.Helper()
		out, err := command(ctx, "docker", args...)
		if err != nil {
			t.Fatal(err)
		}
		return strings.TrimSpace(string(out))
	}
	f.config.SchemaHash = run("image", "inspect", "--format", `{{index .Config.Labels "app.monolith.schema"}}`, artifact.ImageID)
	root := t.TempDir()
	c := &Compose{Config: f.config, Root: root}
	old, err := c.current(ctx)
	if err != nil {
		t.Fatal(err)
	}
	// Database and migration containers must survive every switch unchanged.
	dbID := run(c.args(false, "ps", "--all", "--quiet", "db")...)
	migrationID := run(c.args(false, "ps", "--all", "--quiet", "migrate")...)
	run(c.args(false, "exec", "-T", "server", "sh", "-c", "printf monolith-rehearsal > /monolith/storage/update-rehearsal.txt")...)
	run(c.args(false, "exec", "-T", "db", "psql", "-U", "monolith_admin", "-d", "monolith", "-c", "CREATE TABLE monolith_update_rehearsal (value text); INSERT INTO monolith_update_rehearsal VALUES ('preserved');")...)
	assertPreserved := func() {
		t.Helper()
		if run(c.args(false, "ps", "--all", "--quiet", "db")...) != dbID || run(c.args(false, "ps", "--all", "--quiet", "migrate")...) != migrationID {
			t.Fatal("Updater recreated database or migration service")
		}
		if run(c.args(false, "exec", "-T", "server", "cat", "/monolith/storage/update-rehearsal.txt")...) != "monolith-rehearsal" || run(c.args(false, "exec", "-T", "db", "psql", "-U", "monolith_admin", "-d", "monolith", "-Atc", "SELECT value FROM monolith_update_rehearsal")...) != "preserved" {
			t.Fatal("Persistent data did not survive the update")
		}
	}
	f.release.Version = version
	f.release.SchemaHash = f.config.SchemaHash
	f.release.Artifacts = []Artifact{artifact}
	if strings.Contains(version, "-") {
		f.release.Channel = "beta"
	}
	// Preserve the real artifact hashes while routing the release feed to fixtures.
	f.config.Repository = "MaxJafar/monolith"
	f.sign()
	e, err := New(f.config, root, c)
	if err != nil {
		t.Fatal(err)
	}
	if err = e.Settings(Preferences{Channel: f.release.Channel, AutoDownload: true, AutoInstall: true, InstallHourUTC: time.Now().UTC().Hour()}); err != nil {
		t.Fatal(err)
	}
	base := f.client().Transport
	e.Client = &http.Client{Transport: transport(func(req *http.Request) (*http.Response, error) {
		if req.URL.Host == "api.github.com" {
			body, _ := json.Marshal(map[string]any{"tag_name": "v" + version, "draft": false, "prerelease": f.release.Channel == "beta", "assets": []map[string]string{{"name": ManifestName, "browser_download_url": "https://github.com/MaxJafar/monolith/releases/download/v" + version + "/" + ManifestName}}})
			if strings.HasSuffix(req.URL.Path, "/releases") {
				body = append(append([]byte("["), body...), ']')
			}
			return response(body), nil
		}
		if strings.HasSuffix(req.URL.Path, ManifestName) {
			return base.RoundTrip(req)
		}
		name := filepath.Base(req.URL.Path)
		file, err := os.Open(filepath.Join(filepath.Dir(metadata), name))
		if err != nil {
			return nil, err
		}
		info, err := file.Stat()
		if err != nil {
			file.Close()
			return nil, err
		}
		return &http.Response{StatusCode: 200, Body: file, ContentLength: info.Size(), Header: make(http.Header)}, nil
	})}
	e.Automatic(ctx)
	if e.Snapshot().Phase != "complete" || e.Snapshot().CurrentVersion != version || e.Snapshot().Received != artifact.Bytes {
		t.Fatalf("Automatic download/install failed: %+v", e.Snapshot())
	}
	assertPreserved()
	if err = e.Rollback(ctx); err != nil {
		t.Fatal(err)
	}
	assertPreserved()
	// Fail the actual replacement API health check by pausing its container after
	// activation. Engine recovery must restore both old immutable images itself.
	failedCandidate := &unhealthyDockerCandidate{Compose: c, run: run}
	e.Installer = failedCandidate
	if err = e.Check(ctx); err != nil {
		t.Fatal(err)
	}
	if err = e.Install(ctx); err == nil || e.Snapshot().Phase != "rolledBack" || e.Snapshot().CurrentVersion != "0.0.0" {
		t.Fatalf("Failed candidate was not automatically rolled back: %+v", e.Snapshot())
	}
	if !failedCandidate.observed {
		t.Fatal("The failure rehearsal did not observe a real unhealthy candidate")
	}
	current, err := c.current(ctx)
	if err != nil || current["server"] != old["server"] || current["gateway"] != old["gateway"] {
		t.Fatal("Rollback did not restore the exact previous images", err)
	}
	assertPreserved()
	if _, err = os.Stat(e.path("pending.json")); !os.IsNotExist(err) {
		t.Fatal("Successful recovery retained a pending transaction")
	}
	t.Log("Real packaged server: automatic download and activation, explicit rollback, failed-health rollback and persistent data preservation passed")
}

type unhealthyDockerCandidate struct {
	*Compose
	run      func(...string) string
	observed bool
}

func (c *unhealthyDockerCandidate) Healthy(ctx context.Context, j *Journal) error {
	id := c.run(c.args(true, "ps", "--all", "--quiet", "server")...)
	c.run("pause", id)
	defer c.run("unpause", id)
	// The gateway can cache its last API probe briefly. Wait for an actual unhealthy
	// response before testing the normal expected-version health predicate.
	deadline, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()
	client := &http.Client{Timeout: 10 * time.Second}
	for {
		req, _ := http.NewRequestWithContext(deadline, "GET", c.Config.Compose.HealthURL, nil)
		res, err := client.Do(req)
		if err == nil {
			body, _ := io.ReadAll(res.Body)
			res.Body.Close()
			if res.StatusCode != 200 || !strings.Contains(string(body), `"apiHealthy":true`) {
				check, done := context.WithTimeout(ctx, 2*time.Second)
				defer done()
				err := c.Compose.Healthy(check, j)
				c.observed = err != nil
				return err
			}
		}
		select {
		case <-deadline.Done():
			return fmt.Errorf("Health failure injection timed out: %w", deadline.Err())
		case <-time.After(time.Second):
		}
	}
}
