package updates

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
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

type transport func(*http.Request) (*http.Response, error)

func (f transport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func response(data []byte) *http.Response {
	return &http.Response{StatusCode: 200, ContentLength: int64(len(data)), Body: io.NopCloser(bytes.NewReader(data)), Header: make(http.Header)}
}
func sha(data []byte) string { sum := sha256.Sum256(data); return hex.EncodeToString(sum[:]) }

type releaseFixture struct {
	config            Config
	release           Release
	private           ed25519.PrivateKey
	envelope, archive []byte
}

func fixture(t *testing.T) releaseFixture {
	t.Helper()
	public, private, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	archive := []byte("a complete application archive")
	f := releaseFixture{config: Config{Repository: "owner/monolith", PublicKey: base64.StdEncoding.EncodeToString(public), Version: "1.0.0", Target: "windows-amd64", Protocol: 1}, private: private, archive: archive}
	f.release = Release{Format: 1, Version: "1.1.0", Channel: "stable", Protocol: 1, SchemaHash: strings.Repeat("a", 64), Notes: "A new build", Artifacts: []Artifact{{Target: "windows-amd64", URL: "https://github.com/owner/monolith/releases/download/v1.1.0/app.zip", SHA256: sha(archive), Bytes: int64(len(archive)), Format: "zip"}}}
	f.sign()
	return f
}
func (f *releaseFixture) sign() {
	payload, _ := json.Marshal(f.release)
	f.envelope, _ = json.Marshal(Envelope{base64.StdEncoding.EncodeToString(payload), base64.StdEncoding.EncodeToString(ed25519.Sign(f.private, payload))})
}
func (f *releaseFixture) client() *http.Client {
	return &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
		switch {
		case r.URL.Host == "api.github.com":
			data, _ := json.Marshal(map[string]any{"tag_name": "v" + f.release.Version, "draft": false, "prerelease": f.release.Channel == "beta", "assets": []map[string]string{{"name": ManifestName, "browser_download_url": "https://github.com/owner/monolith/releases/download/v" + f.release.Version + "/" + ManifestName}}})
			if strings.HasSuffix(r.URL.Path, "/releases") {
				data = append(append([]byte("["), data...), ']')
			}
			return response(data), nil
		case strings.HasSuffix(r.URL.Path, ManifestName):
			return response(f.envelope), nil
		default:
			return response(f.archive), nil
		}
	})}
}

type installerFixture struct {
	prepareErr, activateErr, healthErr, rollbackErr error
	activations, rollbacks                          int
}

func (i *installerFixture) Prepare(context.Context, *Release, Artifact, string) (*Journal, error) {
	return &Journal{Kind: "fixture"}, i.prepareErr
}
func (i *installerFixture) Activate(context.Context, *Journal) error {
	i.activations++
	return i.activateErr
}
func (i *installerFixture) Healthy(context.Context, *Journal) error { return i.healthErr }
func (i *installerFixture) Rollback(context.Context, *Journal) error {
	i.rollbacks++
	return i.rollbackErr
}
func engineFixture(t *testing.T) (*Engine, *releaseFixture, *installerFixture) {
	t.Helper()
	f := fixture(t)
	installer := &installerFixture{}
	e, err := New(f.config, t.TempDir(), installer)
	if err != nil {
		t.Fatal(err)
	}
	e.Client = f.client()
	return e, &f, installer
}
func downloadFixture(t *testing.T, e *Engine) {
	t.Helper()
	if err := e.Check(context.Background()); err != nil {
		t.Fatal(err)
	}
	if err := e.Download(context.Background()); err != nil {
		t.Fatal(err)
	}
}

func TestSignedManifest(t *testing.T) {
	f := fixture(t)
	if _, err := Verify(f.envelope, f.config); err != nil {
		t.Fatal(err)
	}
	for _, alter := range []func(*releaseFixture){func(f *releaseFixture) { f.config.PublicKey = fixture(t).config.PublicKey }, func(f *releaseFixture) {
		f.envelope = bytes.Replace(f.envelope, []byte(`"payload":"`), []byte(`"payload":"AAAA`), 1)
	}, func(f *releaseFixture) {
		f.release.Artifacts[0].URL = "https://github.com/other/repository/releases/download/v1.1.0/app.zip"
		f.sign()
	}, func(f *releaseFixture) {
		f.release.Artifacts = append(f.release.Artifacts, f.release.Artifacts[0])
		f.sign()
	}, func(f *releaseFixture) { f.release.Artifacts[0].Bytes = 17 << 30; f.sign() }} {
		copy := fixture(t)
		alter(&copy)
		if _, err := Verify(copy.envelope, copy.config); err == nil {
			t.Fatal("Accepted an untrusted release")
		}
	}
}
func TestURLAndVersions(t *testing.T) {
	for _, url := range []string{"http://github.com/file", "https://github.com.evil.test/a", "https://user:pass@github.com/a", "https://127.0.0.1/a", "https://github.com:444/a"} {
		if allowedURL(url) == nil {
			t.Fatalf("Accepted %s", url)
		}
	}
	for _, pair := range [][2]string{{"1.10.0", "1.9.0"}, {"1.0.0", "1.0.0-rc.9"}, {"1.0.0-rc.10", "1.0.0-rc.2"}, {"2.0.0-beta-hyphen.2", "2.0.0-beta-hyphen.1"}} {
		if Compare(pair[0], pair[1]) <= 0 || Compare(pair[1], pair[0]) >= 0 {
			t.Fatal(pair)
		}
	}
	client := NewClient()
	request, _ := http.NewRequest("GET", "http://localhost/private", nil)
	if client.CheckRedirect(request, nil) == nil {
		t.Fatal("Redirect escaped the HTTPS release allowlist")
	}
}
func TestDownloadIntegrityAndProgress(t *testing.T) {
	f := fixture(t)
	var received int64
	file := filepath.Join(t.TempDir(), "artifact")
	if err := Download(context.Background(), f.client(), f.release.Artifacts[0], file, func(n int64) { received = n }); err != nil {
		t.Fatal(err)
	}
	if received != int64(len(f.archive)) {
		t.Fatal("Missing download progress")
	}
	for _, bad := range [][]byte{[]byte("short"), append(f.archive, 'x'), bytes.Repeat([]byte("x"), len(f.archive))} {
		f.archive = bad
		destination := filepath.Join(t.TempDir(), "bad")
		if Download(context.Background(), f.client(), f.release.Artifacts[0], destination, func(int64) {}) == nil {
			t.Fatal("Accepted damaged download")
		}
		if _, err := os.Stat(destination); !os.IsNotExist(err) {
			t.Fatal("Failed download was retained as installable")
		}
	}
}
func TestHealthyInstallAndManualRollback(t *testing.T) {
	e, _, installer := engineFixture(t)
	downloadFixture(t, e)
	if err := e.Check(context.Background()); err != nil {
		t.Fatal(err)
	}
	if e.Snapshot().Phase != "ready" {
		t.Fatal("Checking discarded a staged update")
	}
	if err := e.Install(context.Background()); err != nil {
		t.Fatal(err)
	}
	s := e.Snapshot()
	if s.CurrentVersion != "1.1.0" || !s.CanRollback || installer.activations != 1 {
		t.Fatal(s)
	}
	if err := e.Rollback(context.Background()); err != nil {
		t.Fatal(err)
	}
	if e.Snapshot().CurrentVersion != "1.0.0" || installer.rollbacks != 1 {
		t.Fatal("Previous version was not restored")
	}
}
func TestFailureRestoresPrevious(t *testing.T) {
	for _, stage := range []string{"activate", "health"} {
		t.Run(stage, func(t *testing.T) {
			e, _, installer := engineFixture(t)
			downloadFixture(t, e)
			if stage == "activate" {
				installer.activateErr = errors.New("cannot replace")
			} else {
				installer.healthErr = errors.New("startup failed")
			}
			if e.Install(context.Background()) == nil {
				t.Fatal("Failure was hidden")
			}
			s := e.Snapshot()
			if s.Phase != "rolledBack" || s.CurrentVersion != "1.0.0" || s.FailedVersion != "1.1.0" || installer.rollbacks != 1 {
				t.Fatal(s)
			}
			if _, err := os.Stat(e.path("pending.json")); !os.IsNotExist(err) {
				t.Fatal("Completed recovery retained pending transaction")
			}
		})
	}
}
func TestFailedRollbackRetainsRecoveryJournal(t *testing.T) {
	e, f, installer := engineFixture(t)
	downloadFixture(t, e)
	installer.healthErr = errors.New("startup failed")
	installer.rollbackErr = errors.New("file locked")
	if e.Install(context.Background()) == nil {
		t.Fatal("Expected failure")
	}
	if _, err := os.Stat(e.path("pending.json")); err != nil {
		t.Fatal("Lost recovery journal")
	}
	journal, _ := os.ReadFile(e.path("pending.json"))
	for _, action := range []func(context.Context) error{e.Check, e.Download, e.Install, e.Rollback} {
		if action(context.Background()) == nil {
			t.Fatal("Allowed a new operation before failed recovery finished")
		}
	}
	if e.Settings(Preferences{Channel: "beta"}) == nil {
		t.Fatal("Cleared recovery state by changing settings")
	}
	retained, _ := os.ReadFile(e.path("pending.json"))
	if !bytes.Equal(journal, retained) {
		t.Fatal("Replaced unfinished recovery journal")
	}
	installer.rollbackErr = nil
	reopened, err := New(f.config, e.Root, installer)
	if err != nil {
		t.Fatal(err)
	}
	if err = reopened.Recover(context.Background()); err != nil {
		t.Fatal(err)
	}
	if reopened.Snapshot().Phase != "rolledBack" {
		t.Fatal(reopened.Snapshot())
	}
}
func TestInterruptedActivationRecovery(t *testing.T) {
	e, _, installer := engineFixture(t)
	if err := atomicJSON(e.path("pending.json"), Journal{Kind: "fixture", From: "1.0.0", To: "1.1.0", Activated: true}); err != nil {
		t.Fatal(err)
	}
	if err := e.Recover(context.Background()); err != nil {
		t.Fatal(err)
	}
	if installer.rollbacks != 1 || e.Snapshot().Phase != "rolledBack" {
		t.Fatal("Interrupted activation not restored")
	}
}
func TestTamperedStagingAndDowngradesNeverActivate(t *testing.T) {
	e, _, installer := engineFixture(t)
	downloadFixture(t, e)
	os.WriteFile(e.path("package"), []byte("changed"), 0600)
	if e.Install(context.Background()) == nil || installer.activations != 0 {
		t.Fatal("Changed staging activated")
	}
	_ = e.change(func(s *State) { s.CurrentVersion = "2.0.0" })
	if e.Download(context.Background()) == nil {
		t.Fatal("Offered a downgrade")
	}
}
func TestMigrationGateAndProtocol(t *testing.T) {
	e, f, _ := engineFixture(t)
	downloadFixture(t, e)
	e.Config.Compose = &ComposeConfig{}
	e.Config.SchemaHash = strings.Repeat("b", 64)
	if e.Install(context.Background()) == nil {
		t.Fatal("Unapproved schema change activated")
	}
	e.Config.Compose = nil
	f.release.Protocol = 2
	f.sign()
	if e.Check(context.Background()) != nil {
		t.Fatal("Could not discover blocked release")
	}
	if e.Snapshot().Blocked == "" || e.Download(context.Background()) == nil {
		t.Fatal("Updater protocol not enforced")
	}
}
func TestAutomaticPreferencesAndRetrySuppression(t *testing.T) {
	e, _, installer := engineFixture(t)
	_ = e.Settings(Preferences{Channel: "stable", AutoDownload: false, InstallHourUTC: 3})
	e.Automatic(context.Background())
	if e.Snapshot().Phase != "available" {
		t.Fatal(e.Snapshot())
	}
	_ = e.Settings(Preferences{Channel: "stable", AutoDownload: true, AutoInstall: true, InstallHourUTC: 3})
	e.Automatic(context.Background())
	if e.Snapshot().Phase != "ready" || installer.activations != 0 {
		t.Fatal("Desktop update restarted without a clean idle UI")
	}
	_ = e.change(func(s *State) { s.Phase = "available"; s.FailedVersion = "1.1.0" })
	e.Automatic(context.Background())
	if e.Snapshot().Phase != "available" {
		t.Fatal("Automatically retried the failed build")
	}
	if e.Settings(Preferences{Channel: "unstable"}) == nil {
		t.Fatal("Invalid channel accepted")
	}
}
func TestGitHubFailuresBackOff(t *testing.T) {
	e, _, _ := engineFixture(t)
	calls := 0
	e.Client = &http.Client{Transport: transport(func(*http.Request) (*http.Response, error) { calls++; return nil, errors.New("offline") })}
	e.Automatic(context.Background())
	e.Automatic(context.Background())
	if calls != 1 {
		t.Fatal("Automatic errors must not poll GitHub every timer tick")
	}
}
func TestBetaDiscovery(t *testing.T) {
	f := fixture(t)
	f.release.Version = "1.2.0-beta.1"
	f.release.Channel = "beta"
	f.release.Artifacts[0].URL = strings.Replace(f.release.Artifacts[0].URL, "1.1.0", f.release.Version, 1)
	f.sign()
	if _, _, err := Discover(context.Background(), f.client(), f.config, "beta"); err != nil {
		t.Fatal(err)
	}
	if _, _, err := Discover(context.Background(), f.client(), f.config, "stable"); err == nil {
		t.Fatal("Stable accepted a prerelease")
	}
}
func TestArchiveRejectsTraversalAndSymlinks(t *testing.T) {
	for _, name := range []string{"../outside", "C:/danger", "/absolute", "updater/../../outside", "assets\\escape", "CON.js", "a/./b", "a /b"} {
		if safeArchivePath(name) {
			t.Fatal(name)
		}
	}
	for _, symlink := range []bool{false, true} {
		var data bytes.Buffer
		writer := zip.NewWriter(&data)
		header := &zip.FileHeader{Name: "../outside"}
		if symlink {
			header.Name = "link"
			header.SetMode(os.ModeSymlink | 0777)
		}
		file, _ := writer.CreateHeader(header)
		file.Write([]byte("target"))
		writer.Close()
		archive := filepath.Join(t.TempDir(), "app.zip")
		os.WriteFile(archive, data.Bytes(), 0600)
		if extractZip(archive, t.TempDir()) == nil {
			t.Fatal("Unsafe zip extracted")
		}
	}
}
func TestRecoveryPathsCannotEscapeInstallation(t *testing.T) {
	root := t.TempDir()
	desktop := Desktop{InstallPath: filepath.Join(root, "Monolith")}
	j := Journal{Kind: "desktop", Install: desktop.InstallPath, Stage: filepath.Join(root, ".monolith-stage"), Backup: filepath.Join(filepath.Dir(root), ".monolith-backup")}
	if desktop.validateJournal(&j) == nil {
		t.Fatal("Escaped recovery directory")
	}
}
func TestSupervisorLock(t *testing.T) {
	path := filepath.Join(t.TempDir(), "lock")
	one, _ := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0600)
	defer one.Close()
	two, _ := os.OpenFile(path, os.O_RDWR, 0600)
	defer two.Close()
	if lockFile(one) != nil || lockFile(two) == nil {
		t.Fatal("Multiple supervisors can mutate one installation")
	}
}
func TestSettingsBusyGuard(t *testing.T) {
	e, _, _ := engineFixture(t)
	if err := e.begin("downloading"); err != nil {
		t.Fatal(err)
	}
	defer e.op.Unlock()
	if e.Settings(Preferences{Channel: "beta"}) == nil {
		t.Fatal("Settings changed during activation")
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if e.Install(ctx) == nil {
		t.Fatal("Concurrent activation accepted")
	}
}
