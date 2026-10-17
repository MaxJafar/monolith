package updates

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
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
