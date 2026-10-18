//go:build darwin

package updates

import (
	"archive/zip"
	"bytes"
	"context"
	"errors"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

// Exercise actual macOS code-signature checks, executable launch, bundle swap
// and recovery on the native CI runner, without an Apple developer account.
func TestAdHocMacUpdateAndFailedLaunchRecovery(t *testing.T) {
	for _, broken := range []bool{false, true} {
		t.Run(map[bool]string{false: "healthy", true: "failed-launch"}[broken], func(t *testing.T) {
			f := fixture(t)
			f.config.Target = "darwin-universal"
			f.config.MacAllowAdHoc = true
			f.release.Artifacts[0].Target = f.config.Target
			parent := t.TempDir()
			source := filepath.Join(parent, "main.c")
			if err := os.WriteFile(source, []byte("#include <unistd.h>\nint main(void) { sleep(60); return 0; }\n"), 0600); err != nil {
				t.Fatal(err)
			}
			build := func(name string, cfg Config) string {
				app := filepath.Join(parent, name+".app")
				for _, directory := range []string{"Contents/MacOS", "Contents/Resources/updater"} {
					if err := os.MkdirAll(filepath.Join(app, directory), 0755); err != nil {
						t.Fatal(err)
					}
				}
				plist := `<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>app.monolith.desktop</string><key>CFBundleExecutable</key><string>Monolith</string><key>CFBundlePackageType</key><string>APPL</string></dict></plist>`
				if err := os.WriteFile(filepath.Join(app, "Contents/Info.plist"), []byte(plist), 0644); err != nil {
					t.Fatal(err)
				}
				if err := atomicJSON(filepath.Join(app, "Contents/Resources/updater/settings.json"), cfg); err != nil {
					t.Fatal(err)
				}
				for _, command := range [][]string{{"/usr/bin/clang", source, "-o", filepath.Join(app, "Contents/MacOS/Monolith")}, {"/usr/bin/codesign", "--force", "--sign", "-", app}} {
					if out, err := exec.Command(command[0], command[1:]...).CombinedOutput(); err != nil {
						t.Fatalf("%v: %s", err, out)
					}
				}
				return app
			}
			installed := build("Monolith", f.config)
			candidate := f.config
			candidate.Version = f.release.Version
			app := build("Candidate", candidate)
			var archive bytes.Buffer
			writer := zip.NewWriter(&archive)
			if err := filepath.WalkDir(app, func(file string, entry fs.DirEntry, err error) error {
				if err != nil || entry.IsDir() {
					return err
				}
				info, err := entry.Info()
				if err != nil {
					return err
				}
				header, err := zip.FileInfoHeader(info)
				if err != nil {
					return err
				}
				relative, _ := filepath.Rel(app, file)
				header.Name = filepath.ToSlash(relative)
				out, err := writer.CreateHeader(header)
				if err != nil {
					return err
				}
				data, err := os.ReadFile(file)
				if err != nil {
					return err
				}
				_, err = out.Write(data)
				return err
			}); err != nil {
				t.Fatal(err)
			}
			if err := writer.Close(); err != nil {
				t.Fatal(err)
			}
			f.archive = archive.Bytes()
			f.release.Artifacts[0].Bytes = int64(len(f.archive))
			f.release.Artifacts[0].SHA256 = sha(f.archive)
			f.sign()
			d := &Desktop{Config: f.config, Root: filepath.Join(parent, "state"), InstallPath: installed}
			d.Launch = func(root string) (int, error) {
				cfg, err := LoadConfig(d.marker(root))
				if err != nil {
					return 0, err
				}
				if broken && cfg.Version == candidate.Version {
					return 0, errors.New("Injected candidate launch failure")
				}
				command := exec.Command(d.executable(root))
				if err := command.Start(); err != nil {
					return 0, err
				}
				go command.Wait()
				t.Cleanup(func() { _ = command.Process.Kill() })
				d.Ready(cfg.Version, command.Process.Pid)
				return command.Process.Pid, nil
			}
			e, err := New(f.config, d.Root, d)
			if err != nil {
				t.Fatal(err)
			}
			e.Client = f.client()
			downloadFixture(t, e)
			err = e.Install(context.Background())
			if broken {
				if err == nil || e.Snapshot().Phase != "rolledBack" {
					t.Fatal("Failed launch did not restore the previous app", err)
				}
			} else {
				if err != nil || e.Snapshot().CurrentVersion != candidate.Version {
					t.Fatal("Ad-hoc update failed", err)
				}
				if err = e.Rollback(context.Background()); err != nil {
					t.Fatal(err)
				}
			}
			actual, err := LoadConfig(d.marker(installed))
			if err != nil || actual.Version != f.config.Version {
				t.Fatal("Previous app was not restored", err)
			}
		})
	}
}
