//go:build darwin

package updates

import "golang.org/x/sys/unix"

// The app path always exists, including across a power failure between writes.
func swapApplications(left, right string) error { return unix.RenamexNp(left, right, unix.RENAME_SWAP) }
