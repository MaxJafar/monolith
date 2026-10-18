package updates

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
)

// Classic Docker identifies images by their config digest. The containerd
// image store uses the OCI manifest digest. Only accept equivalent identities
// derived from the already authenticated archive, never a mutable image tag.
func archiveImageAliases(archive, configID string) ([]string, error) {
	file, err := os.Open(archive)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	gz, err := gzip.NewReader(file)
	if err != nil {
		return nil, err
	}
	defer gz.Close()
	reader := tar.NewReader(gz)
	aliases := []string{}
	metadataBytes := int64(0)
	for count := 0; ; count++ {
		header, err := reader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		if count > 10000 {
			return nil, errors.New("Too many Docker archive entries")
		}
		name := strings.TrimPrefix(header.Name, "blobs/sha256/")
		if name == header.Name || !hashPattern.MatchString(name) || header.Size > 4<<20 || (header.Typeflag != tar.TypeReg && header.Typeflag != tar.TypeRegA) {
			continue
		}
		metadataBytes += header.Size
		if metadataBytes > 16<<20 {
			return nil, errors.New("Docker archive metadata exceeds the limit")
		}
		data, err := io.ReadAll(reader)
		if err != nil {
			return nil, err
		}
		if fmt.Sprintf("%x", sha256.Sum256(data)) != name {
			return nil, errors.New("Docker archive blob digest mismatch")
		}
		var manifest struct {
			SchemaVersion int
			MediaType     string
			Config        struct{ Digest string }
		}
		if json.Unmarshal(data, &manifest) == nil && manifest.SchemaVersion == 2 &&
			(manifest.MediaType == "application/vnd.oci.image.manifest.v1+json" || manifest.MediaType == "application/vnd.docker.distribution.manifest.v2+json") && manifest.Config.Digest == configID {
			aliases = append(aliases, "sha256:"+name)
		}
	}
	if len(aliases) == 0 {
		return nil, errors.New("No authenticated OCI manifest matches the release image config")
	}
	return aliases, nil
}

func (c *Compose) resolveImage(ctx context.Context, release *Release, artifact Artifact, archive string) (string, error) {
	inspect := func(identity string) bool {
		out, err := c.run(ctx, "docker", "image", "inspect", identity)
		if err != nil {
			return false
		}
		var images []struct {
			ID           string `json:"Id"`
			Architecture string
			OS           string `json:"Os"`
			Config       struct{ Labels map[string]string }
		}
		return json.Unmarshal(out, &images) == nil && len(images) == 1 && images[0].ID == identity && images[0].OS == "linux" && images[0].Architecture == strings.TrimPrefix(c.Config.Target, "linux-") && images[0].Config.Labels["org.opencontainers.image.version"] == release.Version && images[0].Config.Labels["app.monolith.schema"] == release.SchemaHash
	}
	if inspect(artifact.ImageID) {
		return artifact.ImageID, nil
	}
	aliases, err := archiveImageAliases(archive, artifact.ImageID)
	if err != nil {
		return "", err
	}
	for _, identity := range aliases {
		if inspect(identity) {
			return identity, nil
		}
	}
	return "", errors.New("Loaded server image identity, architecture, schema or version does not match the signed release")
}
