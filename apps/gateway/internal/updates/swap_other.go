//go:build !darwin

package updates

import "errors"

func swapApplications(string, string) error {
	return errors.New("Atomic app bundle exchange requires macOS")
}
