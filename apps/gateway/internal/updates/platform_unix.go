//go:build linux || darwin

package updates

import (
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

func replaceFile(from, to string) error {
	if err := os.Rename(from, to); err != nil {
		return err
	}
	directory, err := os.Open(filepath.Dir(to))
	if err != nil {
		return err
	}
	defer directory.Close()
	return directory.Sync()
}
func lockFile(file *os.File) error {
	return syscall.Flock(int(file.Fd()), syscall.LOCK_EX|syscall.LOCK_NB)
}
func processAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	err := syscall.Kill(pid, 0)
	return err == nil || errors.Is(err, syscall.EPERM)
}
func quietCommand(command *exec.Cmd) {}
