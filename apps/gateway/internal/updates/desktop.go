package updates

import (
	"archive/zip"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

type Desktop struct {
	Config       Config
	Root         string
	InstallPath  string
	Launch       func(string) (int, error)
	mu           sync.Mutex
	parent       int
	readyVersion string
	readyPID     int
}

func (d *Desktop) Ready(version string, pid int) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.readyVersion = version
	d.readyPID = pid
	d.parent = pid
}
func (d *Desktop) Parent() int       { d.mu.Lock(); defer d.mu.Unlock(); return d.parent }
func (d *Desktop) SetParent(pid int) { d.mu.Lock(); defer d.mu.Unlock(); d.parent = pid }
func safeArchivePath(value string) bool {
	if value == "" || len(value) > 500 || strings.ContainsAny(value, "\\:\x00") || strings.HasPrefix(value, "/") {
		return false
	}
	for _, part := range strings.Split(strings.TrimSuffix(value, "/"), "/") {
		if part == "" || part == "." || part == ".." || strings.HasSuffix(part, " ") || strings.HasSuffix(part, ".") {
			return false
		}
		base := strings.ToUpper(strings.SplitN(part, ".", 2)[0])
		if regexp.MustCompile(`^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$`).MatchString(base) {
			return false
		}
	}
	return true
}
func extractZip(archive, directory string) error {
	z, err := zip.OpenReader(archive)
	if err != nil {
		return err
	}
	defer z.Close()
	if len(z.File) > 50000 {
		return errors.New("Too many files in the application archive")
	}
	seen := map[string]bool{}
	var total uint64
	for _, f := range z.File {
		name := strings.TrimSuffix(f.Name, "/")
		if !safeArchivePath(f.Name) || seen[strings.ToLower(name)] || f.Mode()&os.ModeSymlink != 0 || (!f.Mode().IsRegular() && !f.FileInfo().IsDir()) {
			return errors.New("Unsafe application archive path or file type")
		}
		seen[strings.ToLower(name)] = true
		total += f.UncompressedSize64
		if total > 4<<30 {
			return errors.New("Application archive expands beyond its limit")
		}
		dest := filepath.Join(directory, filepath.FromSlash(name))
		if f.FileInfo().IsDir() {
			if err = os.MkdirAll(dest, 0755); err != nil {
				return err
			}
			continue
		}
		if err = os.MkdirAll(filepath.Dir(dest), 0755); err != nil {
			return err
		}
		source, err := f.Open()
		if err != nil {
			return err
		}
		mode := os.FileMode(0644)
		if f.Mode()&0111 != 0 {
			mode = 0755
		}
		out, err := os.OpenFile(dest, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, mode)
		if err != nil {
			source.Close()
			return err
		}
		n, err := io.Copy(out, io.LimitReader(source, int64(f.UncompressedSize64)+1))
		source.Close()
		syncErr := out.Sync()
		closeErr := out.Close()
		if err != nil {
			return err
		}
		if uint64(n) != f.UncompressedSize64 {
			return errors.New("Invalid archive entry size")
		}
		if syncErr != nil {
			return syncErr
		}
		if closeErr != nil {
			return closeErr
		}
		if err = os.Chmod(dest, mode); err != nil {
			return err
		}
	}
	return nil
}
func copyTree(source, destination string) error {
	return filepath.WalkDir(source, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		relative, err := filepath.Rel(source, path)
		if err != nil {
			return err
		}
		target := filepath.Join(destination, relative)
		if entry.Type()&os.ModeSymlink != 0 {
			return errors.New("Symlink in application installation")
		}
		if entry.IsDir() {
			return os.MkdirAll(target, 0755)
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		if !info.Mode().IsRegular() {
			return errors.New("Unexpected installed file type")
		}
		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()
		out, err := os.OpenFile(target, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, info.Mode().Perm())
		if err != nil {
			return err
		}
		_, err = io.Copy(out, in)
		syncErr := out.Sync()
		closeErr := out.Close()
		if err != nil {
			return err
		}
		if syncErr != nil {
			return syncErr
		}
		return closeErr
	})
}
func (d *Desktop) marker(root string) string {
	if d.Config.Target == "darwin-universal" {
		return filepath.Join(root, "Contents", "Resources", "updater", "settings.json")
	}
	return filepath.Join(root, "updater", "settings.json")
}
func (d *Desktop) executable(root string) string {
	if d.Config.Target == "darwin-universal" {
		return filepath.Join(root, "Contents", "MacOS", "Monolith")
	}
	return filepath.Join(root, "monolith-desktop.exe")
}
func (d *Desktop) validateRoot() error {
	if !filepath.IsAbs(d.InstallPath) || filepath.Clean(d.InstallPath) == filepath.VolumeName(d.InstallPath)+string(os.PathSeparator) {
		return errors.New("Invalid application installation directory")
	}
	installed, err := LoadConfig(d.marker(d.InstallPath))
	if err != nil || installed.Target != d.Config.Target || installed.Repository != d.Config.Repository || installed.PublicKey != d.Config.PublicKey {
		return errors.New("Application installation marker does not match this updater")
	}
	if d.Config.Target == "darwin-universal" && !strings.HasSuffix(d.InstallPath, ".app") {
		return errors.New("Expected an installed macOS application")
	}
	if _, err = os.Stat(d.executable(d.InstallPath)); err != nil {
		return err
	}
	return nil
}
func (d *Desktop) validateJournal(j *Journal) error {
	if j.Kind != "desktop" || j.Install != d.InstallPath {
		return errors.New("Recovery journal does not belong to this application")
	}
	parent := filepath.Dir(d.InstallPath)
	for _, p := range []string{j.Stage, j.Backup} {
		if filepath.Dir(p) != parent || !strings.HasPrefix(filepath.Base(p), ".monolith-") {
			return errors.New("Recovery path is outside the application directory")
		}
	}
	return nil
}
func (d *Desktop) Prepare(ctx context.Context, r *Release, _ Artifact, archive string) (*Journal, error) {
	if err := d.validateRoot(); err != nil {
		return nil, err
	}
	parent := filepath.Dir(d.InstallPath)
	suffix := ""
	if d.Config.Target == "darwin-universal" {
		suffix = ".app"
	}
	id := randomID()
	j := &Journal{Kind: "desktop", Install: d.InstallPath, Stage: filepath.Join(parent, ".monolith-candidate-"+id+suffix), Backup: filepath.Join(parent, ".monolith-previous-"+id+suffix)}
	if err := os.Mkdir(j.Stage, 0700); err != nil {
		return nil, errors.New("The application directory is not writable; move Monolith to a user-writable installation")
	}
	ok := false
	defer func() {
		if !ok {
			os.RemoveAll(j.Stage)
			os.RemoveAll(j.Backup)
		}
	}()
	// Keep NSIS uninstall metadata. Runtime assets themselves are replaced by the
	// signed archive, and macOS receives a completely fresh signed app bundle.
	if d.Config.Target == "windows-amd64" {
		if err := copyTree(d.InstallPath, j.Backup); err != nil {
			return nil, err
		}
		if err := copyTree(d.InstallPath, j.Stage); err != nil {
			return nil, err
		}
	}
	if err := extractZip(archive, j.Stage); err != nil {
		return nil, err
	}
	candidate, err := LoadConfig(d.marker(j.Stage))
	if err != nil || candidate.Version != r.Version || candidate.Target != d.Config.Target || candidate.Repository != d.Config.Repository || candidate.PublicKey != d.Config.PublicKey {
		return nil, errors.New("Candidate application identity, version or signing key does not match")
	}
	if _, err = os.Stat(d.executable(j.Stage)); err != nil {
		return nil, err
	}
	if d.Config.Target == "darwin-universal" {
		requirement, notarized, err := macRequirement(d.Config, candidate)
		if err != nil {
			return nil, err
		}
		command := exec.CommandContext(ctx, "/usr/bin/codesign", "--verify", "--deep", "--strict", "-R", requirement, j.Stage)
		if out, err := command.CombinedOutput(); err != nil {
			return nil, fmt.Errorf("macOS signature verification failed: %s", strings.TrimSpace(string(out)))
		}
		if notarized {
			command = exec.CommandContext(ctx, "/usr/sbin/spctl", "--assess", "--type", "execute", j.Stage)
			if err := command.Run(); err != nil {
				return nil, errors.New("macOS did not accept this notarized application")
			}
		}
	}
	if d.Config.Target == "darwin-universal" {
		j.Backup = j.Stage
	}
	ok = true
	return j, nil
}

// The Ed25519 release envelope authenticates every candidate before extraction.
// Ad-hoc distributions additionally verify the bundle's sealed contents and ID.
// Once a Developer ID is installed, subsequent updates must retain that team.
func macRequirement(installed, candidate Config) (string, bool, error) {
	if installed.MacTeamID != "" && installed.MacTeamID != candidate.MacTeamID {
		return "", false, errors.New("The macOS update must retain the installed Developer ID team")
	}
	if installed.MacTeamID == "" && !installed.MacAllowAdHoc {
		return "", false, errors.New("This installation has not enabled ad-hoc macOS updates")
	}
	if candidate.MacTeamID != "" {
		if !regexp.MustCompile(`^[A-Z0-9]{10}$`).MatchString(candidate.MacTeamID) {
			return "", false, errors.New("Invalid macOS Developer ID team")
		}
		return `anchor apple generic and identifier "app.monolith.desktop" and certificate leaf[subject.OU] = "` + candidate.MacTeamID + `"`, true, nil
	}
	if !candidate.MacAllowAdHoc {
		return "", false, errors.New("Candidate does not declare its macOS signing policy")
	}
	return `identifier "app.monolith.desktop"`, false, nil
}

func waitExit(ctx context.Context, pid int) error {
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()
	for processAlive(pid) {
		select {
		case <-ctx.Done():
			return errors.New("The application did not close in time")
		case <-ticker.C:
		}
	}
	return nil
}
func (d *Desktop) launch(root string) (int, error) {
	if d.Launch != nil {
		return d.Launch(root)
	}
	cmd := exec.Command(d.executable(root))
	cmd.Dir = root
	quietCommand(cmd)
	if err := cmd.Start(); err != nil {
		return 0, err
	}
	pid := cmd.Process.Pid
	go cmd.Wait()
	return pid, nil
}
func (d *Desktop) Activate(ctx context.Context, j *Journal) error {
	if err := d.validateJournal(j); err != nil {
		return err
	}
	wait, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()
	if err := waitExit(wait, d.Parent()); err != nil {
		return err
	}
	j.Activated = true
	if err := atomicJSON(filepath.Join(d.Root, "pending.json"), j); err != nil {
		return err
	}
	if d.Config.Target == "darwin-universal" {
		if err := swapApplications(j.Install, j.Stage); err != nil {
			return err
		}
	} else if err := replaceTree(j.Stage, j.Install); err != nil {
		return err
	}
	d.mu.Lock()
	d.readyVersion = ""
	d.readyPID = 0
	d.mu.Unlock()
	pid, err := d.launch(j.Install)
	j.CandidatePID = pid
	return err
}
func (d *Desktop) Healthy(ctx context.Context, j *Journal) error {
	ticker := time.NewTicker(250 * time.Millisecond)
	defer ticker.Stop()
	for {
		d.mu.Lock()
		ready := d.readyVersion == j.To && d.readyPID == j.CandidatePID
		d.mu.Unlock()
		if ready {
			return nil
		}
		if j.CandidatePID > 0 && !processAlive(j.CandidatePID) {
			return errors.New("The updated application exited before it became ready")
		}
		select {
		case <-ctx.Done():
			return errors.New("The updated application did not report a healthy UI")
		case <-ticker.C:
		}
	}
}
func (d *Desktop) Rollback(ctx context.Context, j *Journal) error {
	if err := d.validateJournal(j); err != nil {
		return err
	}
	_, backupErr := os.Stat(j.Backup)
	if os.IsNotExist(backupErr) {
		if installed, err := LoadConfig(d.marker(j.Install)); err == nil && installed.Version == j.From {
			return nil
		}
		return errors.New("Previous application is unavailable")
	}
	if backupErr != nil {
		return backupErr
	}
	installed, _ := LoadConfig(d.marker(j.Install))
	if !j.Activated || (d.Config.Target == "darwin-universal" && installed.Version == j.From) {
		if !processAlive(d.Parent()) {
			_, err := d.launch(j.Install)
			return err
		}
		return nil
	}
	previous, err := LoadConfig(d.marker(j.Backup))
	if err != nil || previous.Version != j.From {
		return errors.New("Recovery backup does not contain the expected previous release")
	}
	pid := j.CandidatePID
	d.mu.Lock()
	readyVersion := d.readyVersion
	d.mu.Unlock()
	if readyVersion == j.To || pid == 0 || (processAlive(d.Parent()) && strings.EqualFold(filepath.Clean(processExecutable(d.Parent())), filepath.Clean(d.executable(j.Install)))) {
		pid = d.Parent()
	}
	if pid > 0 && processAlive(pid) {
		if !strings.EqualFold(filepath.Clean(processExecutable(pid)), filepath.Clean(d.executable(j.Install))) {
			return errors.New("Candidate process identity changed; recovery files were preserved")
		}
		process, err := os.FindProcess(pid)
		if err == nil {
			_ = process.Kill()
		}
		if err = waitExit(ctx, pid); err != nil {
			return err
		}
	}
	if d.Config.Target == "darwin-universal" {
		if err := swapApplications(j.Install, j.Backup); err != nil {
			return err
		}
	} else if err := replaceTree(j.Backup, j.Install); err != nil {
		return err
	}
	_, err = d.launch(j.Install)
	return err
}

// Windows keeps the install directory and executable path present at all times.
// Each file replacement is atomic; the durable journal repairs a partial set on
// the next launch. The supervisor itself runs from its independent state copy.
func replaceTree(source, destination string) error {
	return filepath.WalkDir(source, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		relative, err := filepath.Rel(source, path)
		if err != nil {
			return err
		}
		target := filepath.Join(destination, relative)
		if entry.Type()&os.ModeSymlink != 0 {
			return errors.New("Symlink in update staging")
		}
		if entry.IsDir() {
			return os.MkdirAll(target, 0755)
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if current, err := os.ReadFile(target); err == nil && bytes.Equal(current, data) {
			return nil
		}
		return atomicWrite(target, data)
	})
}
