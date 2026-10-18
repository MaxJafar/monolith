package updates

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Installer interface {
	Prepare(context.Context, *Release, Artifact, string) (*Journal, error)
	Activate(context.Context, *Journal) error
	Healthy(context.Context, *Journal) error
	Rollback(context.Context, *Journal) error
}
type Engine struct {
	Config    Config
	Root      string
	Client    *http.Client
	Installer Installer
	mu        sync.Mutex
	op        sync.Mutex
	state     State
}

func New(cfg Config, root string, installer Installer) (*Engine, error) {
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	if !filepath.IsAbs(root) {
		return nil, errors.New("Update storage must be an absolute path")
	}
	if err := os.MkdirAll(root, 0700); err != nil {
		return nil, err
	}
	e := &Engine{Config: cfg, Root: root, Client: NewClient(), Installer: installer, state: State{Phase: "idle", Preferences: Preferences{Channel: "stable", AutoDownload: true, AutoInstall: true, InstallHourUTC: 3}}}
	if err := readJSON(e.path("state.json"), &e.state); err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("Update state is unreadable; recovery data was preserved: %w", err)
	}
	// Manual-only builds could not offer update preferences. Enable automation
	// when such an installation first receives its trusted release key. Preserve
	// explicit preferences from already configured installations.
	if !e.state.Configured && cfg.PublicKey != "" {
		e.state.Preferences.AutoDownload = true
		e.state.Preferences.AutoInstall = true
	}
	e.state.Configured = cfg.PublicKey != ""
	e.state.Target = cfg.Target
	// A completed server update survives supervisor restarts until configuration
	// is refreshed. Native versions are read from the actual launched application.
	if cfg.Compose == nil && e.state.CurrentVersion != "" && e.state.CurrentVersion != cfg.Version {
		e.state.CanRollback = false
		e.state.Phase = "idle"
		e.state.CheckedAt = ""
	}
	if cfg.Compose == nil || e.state.CurrentVersion == "" {
		e.state.CurrentVersion = cfg.Version
	}
	if busy(e.state.Phase) {
		e.state.Phase = "failed"
		e.state.Error = "The previous update was interrupted; retry the download"
	}
	if data, err := os.ReadFile(e.path("release.signed.json")); err == nil {
		if release, err := Verify(data, cfg); err == nil {
			e.state.Release = release
		} else {
			e.state.Release = nil
			e.state.Phase = "failed"
			e.state.Error = err.Error()
		}
	} else {
		e.state.Release = nil
	}
	return e, e.persist()
}
func (e *Engine) path(name string) string { return filepath.Join(e.Root, name) }
func (e *Engine) Snapshot() State         { e.mu.Lock(); defer e.mu.Unlock(); return e.state }
func (e *Engine) persist() error          { return atomicJSON(e.path("state.json"), e.state) }
func (e *Engine) change(fn func(*State)) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	fn(&e.state)
	return e.persist()
}
func (e *Engine) fail(err error) error {
	_ = e.change(func(s *State) { s.Phase = "failed"; s.Error = err.Error(); s.NoticeID = randomID() })
	return err
}
func (e *Engine) requireRecovered() error {
	if _, err := os.Stat(e.path("pending.json")); !os.IsNotExist(err) {
		return errors.New("An unfinished update requires recovery. Resolve the reported problem and restart the update supervisor")
	}
	return nil
}
func (e *Engine) begin(phase string) error {
	if !e.op.TryLock() {
		return errors.New("An update operation is already running")
	}
	if phase != "rollingBack" {
		if err := e.requireRecovered(); err != nil {
			e.op.Unlock()
			return err
		}
	}
	if err := e.change(func(s *State) { s.Phase = phase; s.Error = "" }); err != nil {
		e.op.Unlock()
		return err
	}
	return nil
}
func (e *Engine) Check(ctx context.Context) error {
	before := e.Snapshot()
	if err := e.begin("checking"); err != nil {
		return err
	}
	defer e.op.Unlock()
	channel := e.Snapshot().Preferences.Channel
	if e.Config.PublicKey == "" {
		return e.fail(errors.New("Release signing has not been configured for this installation"))
	}
	_ = e.change(func(s *State) { s.CheckedAt = time.Now().UTC().Format(time.RFC3339) })
	release, envelope, err := Discover(ctx, e.Client, e.Config, channel)
	if err != nil {
		return e.fail(err)
	}
	if err = atomicWrite(e.path("release.signed.json"), envelope); err != nil {
		return e.fail(err)
	}
	blocked := ""
	artifact, err := release.Artifact(e.Config.Target)
	if err != nil {
		blocked = err.Error()
	}
	if release.Protocol != e.Config.Protocol {
		blocked = "This release requires a manual updater upgrade"
	}
	if e.Config.Compose != nil && release.SchemaHash != e.Config.SchemaHash {
		blocked = "This release requires a verified database migration before it can be installed"
	}
	return e.change(func(s *State) {
		s.Release = release
		s.Blocked = blocked
		s.CheckedAt = time.Now().UTC().Format(time.RFC3339)
		s.Total = artifact.Bytes
		s.Received = 0
		s.Phase = "idle"
		if Compare(release.Version, s.CurrentVersion) > 0 {
			s.Phase = "available"
			if before.Release == nil || before.Release.Version != release.Version {
				s.NoticeID = randomID()
			}
		}
		if before.Release != nil && before.Release.Version == release.Version && before.Phase == "ready" && before.Preferences.Channel == channel {
			s.Phase = "ready"
			s.Received = artifact.Bytes
		}
	})
}
func (e *Engine) verified() (*Release, Artifact, error) {
	data, err := os.ReadFile(e.path("release.signed.json"))
	if err != nil {
		return nil, Artifact{}, err
	}
	release, err := Verify(data, e.Config)
	if err != nil {
		return nil, Artifact{}, err
	}
	s := e.Snapshot()
	if s.Release == nil || s.Release.Version != release.Version {
		return nil, Artifact{}, errors.New("Release changed; check again")
	}
	if s.Preferences.Channel == "stable" && release.Channel != "stable" {
		return nil, Artifact{}, errors.New("This release does not belong to the selected stable channel")
	}
	if Compare(release.Version, s.CurrentVersion) <= 0 {
		return nil, Artifact{}, errors.New("This release is not newer than the installed version")
	}
	if release.Protocol != e.Config.Protocol {
		return nil, Artifact{}, errors.New("Updater protocol is incompatible")
	}
	if e.Config.Compose != nil && release.SchemaHash != e.Config.SchemaHash {
		return nil, Artifact{}, errors.New("Database migration required; automatic file rollback cannot reverse database changes")
	}
	artifact, err := release.Artifact(e.Config.Target)
	return release, artifact, err
}
func (e *Engine) Download(ctx context.Context) error {
	if err := e.begin("downloading"); err != nil {
		return err
	}
	defer e.op.Unlock()
	_, artifact, err := e.verified()
	if err != nil {
		return e.fail(err)
	}
	temporary := e.path("download-" + randomID() + ".tmp")
	defer os.Remove(temporary)
	if err = e.change(func(s *State) { s.Received = 0; s.Total = artifact.Bytes }); err != nil {
		return e.fail(err)
	}
	err = Download(ctx, e.Client, artifact, temporary, func(n int64) { _ = e.change(func(s *State) { s.Received = n }) })
	if err != nil {
		return e.fail(err)
	}
	if err = replaceFile(temporary, e.path("package")); err != nil {
		return e.fail(err)
	}
	return e.change(func(s *State) { s.Phase = "ready"; s.NoticeID = randomID() })
}
func checkFile(path string, artifact Artifact) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	hash := sha256.New()
	size, err := io.Copy(hash, io.LimitReader(f, artifact.Bytes+1))
	if err != nil {
		return err
	}
	if size != artifact.Bytes || hex.EncodeToString(hash.Sum(nil)) != artifact.SHA256 {
		return errors.New("Staged release no longer matches its signature")
	}
	return nil
}
func (e *Engine) Install(ctx context.Context) error {
	if err := e.begin("verifying"); err != nil {
		return err
	}
	defer e.op.Unlock()
	release, artifact, err := e.verified()
	if err != nil {
		return e.fail(err)
	}
	if err = checkFile(e.path("package"), artifact); err != nil {
		return e.fail(err)
	}
	if installed, ok := e.Installer.(interface {
		InstalledVersion(context.Context) (string, error)
	}); ok {
		version, err := installed.InstalledVersion(ctx)
		if err != nil {
			return e.fail(err)
		}
		if version != e.Snapshot().CurrentVersion {
			_ = e.change(func(s *State) { s.CurrentVersion = version; s.CanRollback = false })
			return e.fail(errors.New("The deployment changed outside the updater; check for updates again"))
		}
	}
	journal, err := e.Installer.Prepare(ctx, release, artifact, e.path("package"))
	if err != nil {
		return e.fail(err)
	}
	journal.From = e.Snapshot().CurrentVersion
	journal.To = release.Version
	if err = atomicJSON(e.path("pending.json"), journal); err != nil {
		return e.fail(err)
	}
	if err = e.change(func(s *State) { s.Phase = "installing" }); err != nil {
		return e.revert(ctx, journal, err)
	}
	if err = e.Installer.Activate(ctx, journal); err != nil {
		return e.revert(ctx, journal, err)
	}
	journal.Activated = true
	if err = atomicJSON(e.path("pending.json"), journal); err != nil {
		return e.revert(ctx, journal, err)
	}
	if err = e.change(func(s *State) { s.Phase = "restarting" }); err != nil {
		return e.revert(ctx, journal, err)
	}
	healthCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()
	if err = e.Installer.Healthy(healthCtx, journal); err != nil {
		return e.revert(ctx, journal, err)
	}
	if err = atomicJSON(e.path("previous.json"), journal); err != nil {
		return e.revert(ctx, journal, err)
	}
	if err = e.change(func(s *State) {
		s.CurrentVersion = journal.To
		s.PreviousVersion = journal.From
		s.CanRollback = true
		s.Phase = "complete"
		s.Error = ""
		s.FailedVersion = ""
		s.NoticeID = randomID()
	}); err != nil {
		return e.revert(ctx, journal, err)
	}
	if err = os.Remove(e.path("pending.json")); err != nil {
		return err
	}
	return nil
}
func (e *Engine) revert(ctx context.Context, journal *Journal, cause error) error {
	_ = e.change(func(s *State) { s.Phase = "rollingBack"; s.Error = cause.Error() })
	// Recovery must finish even when the activating HTTP request or daemon stops.
	recovery, cancel := context.WithTimeout(context.WithoutCancel(ctx), 3*time.Minute)
	defer cancel()
	if err := e.Installer.Rollback(recovery, journal); err != nil {
		_ = e.change(func(s *State) { s.Blocked = "Recovery must finish before another update can start" })
		return e.fail(fmt.Errorf("Update failed (%v); recovery also failed (%v). Previous version and journal were retained", cause, err))
	}
	if err := e.change(func(s *State) {
		s.CurrentVersion = journal.From
		s.Phase = "rolledBack"
		s.Error = cause.Error()
		s.FailedVersion = journal.To
		s.CanRollback = false
		s.Blocked = ""
		s.NoticeID = randomID()
	}); err != nil {
		return err
	}
	if err := os.Remove(e.path("pending.json")); err != nil && !os.IsNotExist(err) {
		return err
	}
	return cause
}
func (e *Engine) Recover(ctx context.Context) error {
	var journal Journal
	err := readJSON(e.path("pending.json"), &journal)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("Recovery journal is invalid; files have been preserved: %w", err)
	}
	if err = e.begin("rollingBack"); err != nil {
		return err
	}
	defer e.op.Unlock()
	_ = e.revert(ctx, &journal, errors.New("Recovered an interrupted update"))
	if e.Snapshot().Phase == "rolledBack" {
		return nil
	}
	return errors.New(e.Snapshot().Error)
}
func (e *Engine) Rollback(ctx context.Context) error {
	if err := e.begin("rollingBack"); err != nil {
		return err
	}
	defer e.op.Unlock()
	if err := e.requireRecovered(); err != nil {
		return e.fail(err)
	}
	var journal Journal
	if err := readJSON(e.path("previous.json"), &journal); err != nil {
		return e.fail(err)
	}
	if e.Snapshot().CurrentVersion != journal.To {
		return e.fail(errors.New("The retained build does not match the installed version"))
	}
	if err := atomicJSON(e.path("pending.json"), &journal); err != nil {
		return e.fail(err)
	}
	_ = e.revert(ctx, &journal, errors.New("Previous version restored by the administrator"))
	if e.Snapshot().Phase == "rolledBack" {
		return nil
	}
	return errors.New(e.Snapshot().Error)
}
func (e *Engine) Settings(p Preferences) error {
	if p.Channel != "stable" && p.Channel != "beta" || p.InstallHourUTC < 0 || p.InstallHourUTC > 23 {
		return errors.New("Invalid update settings")
	}
	if !e.op.TryLock() {
		return errors.New("Wait for the current operation before changing settings")
	}
	defer e.op.Unlock()
	if err := e.requireRecovered(); err != nil {
		return err
	}
	return e.change(func(s *State) {
		if p.Channel != s.Preferences.Channel {
			s.Release = nil
			s.Phase = "idle"
			s.Received = 0
			s.CheckedAt = ""
			s.Blocked = ""
			s.Error = ""
		}
		s.Preferences = p
	})
}
func (e *Engine) Automatic(ctx context.Context) {
	s := e.Snapshot()
	if !s.Configured || busy(s.Phase) {
		return
	}
	checked, _ := time.Parse(time.RFC3339, s.CheckedAt)
	if time.Since(checked) > 6*time.Hour && s.Phase != "ready" {
		if e.Check(ctx) != nil {
			return
		}
		s = e.Snapshot()
	}
	if s.Phase == "available" && s.Preferences.AutoDownload && s.Blocked == "" && s.Release != nil && s.Release.Version != s.FailedVersion {
		if e.Download(ctx) != nil {
			return
		}
		s = e.Snapshot()
	}
	if e.Config.Compose != nil && s.Phase == "ready" && s.Preferences.AutoInstall && s.Release != nil && s.Release.Version != s.FailedVersion && time.Now().UTC().Hour() == s.Preferences.InstallHourUTC {
		_ = e.Install(ctx)
	}
}
