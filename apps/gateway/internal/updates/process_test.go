package updates

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

func TestProcessIdentityForRecovery(t *testing.T) {
	want, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	want, err = filepath.EvalSymlinks(want)
	if err != nil {
		t.Fatal(err)
	}
	actual, err := filepath.EvalSymlinks(processExecutable(os.Getpid()))
	if err != nil || !strings.EqualFold(filepath.Clean(want), filepath.Clean(actual)) || !processAlive(os.Getpid()) || processAlive(0) {
		t.Fatalf("Recovery could not identify its process: %q versus %q, %v", actual, want, err)
	}
}

func TestDesktopRecoveryChild(t *testing.T) {
	if os.Getenv("MONOLITH_RECOVERY_TEST_CHILD") != "1" {
		return
	}
	fmt.Println("ready")
	time.Sleep(time.Minute)
	os.Exit(0)
}

func TestWindowsRollbackStopsAliasedExecutable(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("Windows requires the running executable to close before replacement")
	}
	e, d, f := desktopFixture(t)
	downloadFixture(t, e)
	j, err := d.Prepare(context.Background(), &f.release, f.release.Artifacts[0], e.path("package"))
	if err != nil {
		t.Fatal(err)
	}
	j.From, j.To, j.Activated = f.config.Version, f.release.Version, true
	self, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	code, err := os.ReadFile(self)
	if err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(d.executable(d.InstallPath), code, 0700); err != nil {
		t.Fatal(err)
	}
	alias := filepath.Join(filepath.Dir(d.InstallPath), "redirected.exe")
	if err = os.Link(d.executable(d.InstallPath), alias); err != nil {
		t.Fatal(err)
	}
	child := exec.Command(alias, "-test.run=^TestDesktopRecoveryChild$")
	child.Env = append(os.Environ(), "MONOLITH_RECOVERY_TEST_CHILD=1")
	quietCommand(child)
	stdout, err := child.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	if err = child.Start(); err != nil {
		t.Fatal(err)
	}
	defer func() { _ = child.Process.Kill(); _ = child.Wait() }()
	ready := make(chan bool, 1)
	go func() {
		line, _ := bufio.NewReader(stdout).ReadString('\n')
		ready <- strings.TrimSpace(line) == "ready"
	}()
	select {
	case ok := <-ready:
		if !ok {
			t.Fatal("Recovery test child did not start")
		}
	case <-time.After(15 * time.Second):
		t.Fatal("Recovery test child startup timed out")
	}
	d.SetParent(child.Process.Pid)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err = d.Rollback(ctx, j); err != nil {
		t.Fatal(err)
	}
	if processAlive(child.Process.Pid) {
		t.Fatal("The aliased candidate was not stopped before restoring the old executable")
	}
	contents, err := os.ReadFile(d.executable(d.InstallPath))
	if err != nil || string(contents) != "old application" {
		t.Fatal("Previous executable was not restored", err)
	}
}

func TestRecoveryAcceptsOnlyAliasesOfTheSameFile(t *testing.T) {
	root := t.TempDir()
	installed := filepath.Join(root, "monolith-desktop.exe")
	alias := filepath.Join(root, "redirected.exe")
	impostor := filepath.Join(root, "different.exe")
	for _, path := range []string{installed, impostor} {
		if err := os.WriteFile(path, []byte("identical contents"), 0600); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.Link(installed, alias); err != nil {
		t.Fatal(err)
	}
	if !sameApplicationPath(installed, alias) {
		t.Fatal("The same executable reached through a filesystem alias was rejected")
	}
	if sameApplicationPath(installed, impostor) || sameApplicationPath(installed, "") || sameApplicationPath(installed, filepath.Join(root, "missing")) {
		t.Fatal("Recovery accepted a different or missing executable")
	}
}
