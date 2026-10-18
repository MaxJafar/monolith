package updates

import (
	"context"
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
