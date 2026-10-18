package updates

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAutomaticDefaultsAndPersistedChoice(t *testing.T) {
	e, f, installer := engineFixture(t)
	if !e.Snapshot().Preferences.AutoDownload || !e.Snapshot().Preferences.AutoInstall {
		t.Fatal("A configured installation must enable automatic updates by default")
	}
	p := Preferences{Channel: "stable", AutoDownload: true, AutoInstall: false, InstallHourUTC: 7}
	if err := e.Settings(p); err != nil {
		t.Fatal(err)
	}
	reopened, err := New(f.config, e.Root, installer)
	if err != nil || reopened.Snapshot().Preferences != p {
		t.Fatal("Lost the user's saved update settings", err)
	}
	// A manual-only installer had no usable update controls.
	if err := e.change(func(s *State) { s.Configured = false }); err != nil {
		t.Fatal(err)
	}
	reopened, err = New(f.config, e.Root, installer)
	if err != nil || !reopened.Snapshot().Preferences.AutoInstall {
		t.Fatal("Manual installation was not upgraded", err)
	}
	reopened.Client = f.client()
	reopened.Automatic(context.Background())
	if reopened.Snapshot().Phase != "ready" || installer.activations != 0 {
		t.Fatal("Desktop must download automatically and wait for the UI idle guard")
	}
}

func TestMacSigningPolicyBridgeAndDowngradeProtection(t *testing.T) {
	adhoc := Config{MacAllowAdHoc: true}
	signed := Config{MacTeamID: "ABCDE12345"}
	requirement, notarized, err := macRequirement(adhoc, adhoc)
	if err != nil || notarized || requirement != `identifier "app.monolith.desktop"` {
		t.Fatal(requirement, notarized, err)
	}
	for _, current := range []Config{adhoc, signed} {
		requirement, notarized, err = macRequirement(current, signed)
		if err != nil || !notarized || !strings.Contains(requirement, signed.MacTeamID) {
			t.Fatal("Signed bridge must verify team and notarization", err)
		}
	}
	for _, pair := range [][2]Config{{{}, adhoc}, {signed, adhoc}, {signed, {MacTeamID: "OTHER12345"}}, {adhoc, {MacTeamID: "invalid"}}, {adhoc, {}}} {
		if _, _, err := macRequirement(pair[0], pair[1]); err == nil {
			t.Fatal("Accepted an undeclared or downgraded signing policy", pair)
		}
	}
}

func TestMacPolicyUsesInstalledBundleAfterAnUpgrade(t *testing.T) {
	f := fixture(t)
	f.config.Target = "darwin-universal"
	f.config.MacAllowAdHoc = true
	parent := t.TempDir()
	d := &Desktop{Config: f.config, Root: filepath.Join(parent, "state"), InstallPath: filepath.Join(parent, "Monolith.app")}
	installed := f.config
	installed.MacTeamID = "ABCDE12345"
	installed.MacAllowAdHoc = false
	if err := os.MkdirAll(filepath.Dir(d.marker(d.InstallPath)), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Dir(d.executable(d.InstallPath)), 0755); err != nil {
		t.Fatal(err)
	}
	if err := atomicJSON(d.marker(d.InstallPath), installed); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(d.executable(d.InstallPath), []byte("installed"), 0755); err != nil {
		t.Fatal(err)
	}
	candidate := f.config
	candidate.Version = f.release.Version
	config, _ := json.Marshal(candidate)
	var data bytes.Buffer
	writer := zip.NewWriter(&data)
	for file, contents := range map[string][]byte{"Contents/MacOS/Monolith": []byte("candidate"), "Contents/Resources/updater/settings.json": config} {
		out, err := writer.Create(file)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = out.Write(contents); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	archive := filepath.Join(parent, "candidate.zip")
	if err := os.WriteFile(archive, data.Bytes(), 0600); err != nil {
		t.Fatal(err)
	}
	_, err := d.Prepare(context.Background(), &f.release, Artifact{}, archive)
	if err == nil || !strings.Contains(err.Error(), "retain the installed Developer ID team") {
		t.Fatal("Stale supervisor allowed a downgrade of the installed identity", err)
	}
}
