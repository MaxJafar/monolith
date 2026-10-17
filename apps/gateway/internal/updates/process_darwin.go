//go:build darwin

package updates

import (
	"bytes"
	"golang.org/x/sys/unix"
	"path/filepath"
)

func processExecutable(pid int) string {
	// On supported macOS releases, procargs2 starts with a 32-bit argc followed
	// by the kernel's NUL-terminated executable path. Do not parse ps display text.
	data, err := unix.SysctlRaw("kern.procargs2", pid)
	if err != nil || len(data) <= 4 {
		return ""
	}
	end := bytes.IndexByte(data[4:], 0)
	if end < 1 {
		return ""
	}
	path := string(data[4 : 4+end])
	if !filepath.IsAbs(path) {
		return ""
	}
	return path
}
