package updates

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func identityArchive(t *testing.T, configID string, corrupt bool) (string, string) {
	t.Helper()
	data, _ := json.Marshal(map[string]any{"schemaVersion": 2, "mediaType": "application/vnd.oci.image.manifest.v1+json", "config": map[string]string{"digest": configID}})
	hash := fmt.Sprintf("%x", sha256.Sum256(data))
	name := hash
	if corrupt {
		name = strings.Repeat("0", 64)
	}
	path := filepath.Join(t.TempDir(), "image.tar.gz")
	file, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	gz := gzip.NewWriter(file)
	tw := tar.NewWriter(gz)
	if err := tw.WriteHeader(&tar.Header{Name: "blobs/sha256/" + name, Mode: 0600, Size: int64(len(data))}); err != nil {
		t.Fatal(err)
	}
	if _, err := tw.Write(data); err != nil {
		t.Fatal(err)
	}
	for _, close := range []func() error{tw.Close, gz.Close, file.Close} {
		if err := close(); err != nil {
			t.Fatal(err)
		}
	}
	return path, "sha256:" + hash
}

func TestDockerImageStoreIdentity(t *testing.T) {
	configID := "sha256:" + strings.Repeat("a", 64)
	archive, manifestID := identityArchive(t, configID, false)
	release := &Release{Version: "1.2.3", SchemaHash: strings.Repeat("b", 64)}
	for _, store := range []string{"classic", "containerd"} {
		t.Run(store, func(t *testing.T) {
			installedID := configID
			if store == "containerd" {
				installedID = manifestID
			}
			c := &Compose{Config: Config{Target: "linux-amd64"}, Run: func(_ context.Context, name string, args ...string) ([]byte, error) {
				if name != "docker" || len(args) != 3 || args[0] != "image" || args[1] != "inspect" {
					t.Fatalf("Unexpected command %s %v", name, args)
				}
				if args[2] != installedID {
					return nil, errors.New("No such image")
				}
				return json.Marshal([]any{map[string]any{"Id": installedID, "Os": "linux", "Architecture": "amd64", "Config": map[string]any{"Labels": map[string]string{"org.opencontainers.image.version": release.Version, "app.monolith.schema": release.SchemaHash}}}})
			}}
			got, err := c.resolveImage(context.Background(), release, Artifact{ImageID: configID}, archive)
			if err != nil || got != installedID {
				t.Fatalf("Identity %q, want %q: %v", got, installedID, err)
			}
			wrong := *release
			wrong.SchemaHash = strings.Repeat("c", 64)
			if _, err := c.resolveImage(context.Background(), &wrong, Artifact{ImageID: configID}, archive); err == nil {
				t.Fatal("Accepted an image with a different schema")
			}
		})
	}
}

func TestDockerArchiveIdentityRejectsUnrelatedAndCorruptBlobs(t *testing.T) {
	configID := "sha256:" + strings.Repeat("a", 64)
	archive, _ := identityArchive(t, configID, false)
	if _, err := archiveImageAliases(archive, "sha256:"+strings.Repeat("b", 64)); err == nil {
		t.Fatal("Accepted an unrelated config digest")
	}
	archive, _ = identityArchive(t, configID, true)
	if _, err := archiveImageAliases(archive, configID); err == nil {
		t.Fatal("Accepted a corrupt manifest blob")
	}
}
