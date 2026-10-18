//go:build linux

package updates

import (
	"fmt"
	"os"
)

func processExecutable(pid int) string {
	path, _ := os.Readlink(fmt.Sprintf("/proc/%d/exe", pid))
	return path
}
