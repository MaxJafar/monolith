package updates

import (
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

func allowedURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.User != nil || u.Fragment != "" || u.Port() != "" {
		return errors.New("Release downloads require HTTPS without credentials")
	}
	switch u.Hostname() {
	case "api.github.com", "github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com":
		return nil
	}
	return errors.New("Release URL is not a GitHub release host")
}
func downloadURL(raw, repository, version string) error {
	if err := allowedURL(raw); err != nil {
		return err
	}
	u, _ := url.Parse(raw)
	prefix := "/" + repository + "/releases/download/v" + version + "/"
	if u.Hostname() != "github.com" || !strings.HasPrefix(u.Path, prefix) || strings.Contains(strings.TrimPrefix(u.Path, prefix), "/") || strings.TrimPrefix(u.Path, prefix) == "" || u.RawQuery != "" {
		return errors.New("Asset does not belong to the expected repository and version")
	}
	return nil
}
func NewClient() *http.Client {
	return &http.Client{Timeout: 30 * time.Minute, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 5 {
			return errors.New("Too many release redirects")
		}
		return allowedURL(req.URL.String())
	}}
}
func request(ctx context.Context, client *http.Client, raw string) (*http.Response, error) {
	if err := allowedURL(raw); err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, raw, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Monolith-Updater/1")
	req.Header.Set("Accept", "application/vnd.github+json")
	response, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	if response.StatusCode != http.StatusOK {
		response.Body.Close()
		if response.StatusCode == 403 || response.StatusCode == 429 {
			return nil, errors.New("GitHub rate limit reached; the updater will retry later")
		}
		return nil, fmt.Errorf("GitHub returned HTTP %d", response.StatusCode)
	}
	return response, nil
}
func readURL(ctx context.Context, client *http.Client, raw string, limit int64) ([]byte, error) {
	response, err := request(ctx, client, raw)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	bytes, err := io.ReadAll(io.LimitReader(response.Body, limit+1))
	if int64(len(bytes)) > limit {
		return nil, errors.New("Release metadata is too large")
	}
	return bytes, err
}

type githubRelease struct {
	Tag        string `json:"tag_name"`
	Draft      bool   `json:"draft"`
	Prerelease bool   `json:"prerelease"`
	Assets     []struct {
		Name string `json:"name"`
		URL  string `json:"browser_download_url"`
	} `json:"assets"`
}

func Discover(ctx context.Context, client *http.Client, cfg Config, channel string) (*Release, []byte, error) {
	ctx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()
	endpoint := "https://api.github.com/repos/" + cfg.Repository + "/releases/latest"
	if channel == "beta" {
		endpoint = "https://api.github.com/repos/" + cfg.Repository + "/releases?per_page=30"
	}
	data, err := readURL(ctx, client, endpoint, 2<<20)
	if err != nil {
		return nil, nil, err
	}
	var releases []githubRelease
	if channel == "beta" {
		err = json.Unmarshal(data, &releases)
	} else {
		var release githubRelease
		err = json.Unmarshal(data, &release)
		releases = []githubRelease{release}
	}
	if err != nil {
		return nil, nil, errors.New("Invalid GitHub release response")
	}
	var selected *githubRelease
	for i := range releases {
		r := &releases[i]
		version := strings.TrimPrefix(r.Tag, "v")
		if r.Draft || !strings.HasPrefix(r.Tag, "v") || !versionPattern.MatchString(version) || (channel == "stable" && (r.Prerelease || strings.Contains(version, "-"))) {
			continue
		}
		if selected == nil || Compare(version, strings.TrimPrefix(selected.Tag, "v")) > 0 {
			selected = r
		}
	}
	if selected == nil {
		return nil, nil, errors.New("No published release is available for this channel")
	}
	var asset string
	for _, candidate := range selected.Assets {
		if candidate.Name == ManifestName {
			if asset != "" {
				return nil, nil, errors.New("Duplicate release manifest")
			}
			asset = candidate.URL
		}
	}
	if err := downloadURL(asset, cfg.Repository, strings.TrimPrefix(selected.Tag, "v")); err != nil {
		return nil, nil, err
	}
	envelope, err := readURL(ctx, client, asset, 512<<10)
	if err != nil {
		return nil, nil, err
	}
	release, err := Verify(envelope, cfg)
	if err != nil {
		return nil, nil, err
	}
	if "v"+release.Version != selected.Tag || (channel == "stable" && release.Channel != "stable") {
		return nil, nil, errors.New("Signed release channel or tag does not match GitHub")
	}
	return release, envelope, nil
}
func Verify(data []byte, cfg Config) (*Release, error) {
	var envelope Envelope
	if len(data) > 512<<10 || json.Unmarshal(data, &envelope) != nil {
		return nil, errors.New("Invalid signed release manifest")
	}
	publicKey, err := key(cfg.PublicKey)
	if err != nil {
		return nil, err
	}
	payload, err := base64.StdEncoding.DecodeString(envelope.Payload)
	if err != nil {
		return nil, errors.New("Invalid signed payload")
	}
	signature, err := base64.StdEncoding.DecodeString(envelope.Signature)
	if err != nil || !ed25519.Verify(publicKey, payload, signature) {
		return nil, errors.New("Release signature verification failed")
	}
	var release Release
	if json.Unmarshal(payload, &release) != nil || release.Format != 1 || !versionPattern.MatchString(release.Version) || release.Protocol < 1 || !hashPattern.MatchString(release.SchemaHash) || len(release.Notes) > 32000 || (release.Channel != "stable" && release.Channel != "beta") || (release.Channel == "stable" && strings.Contains(release.Version, "-")) {
		return nil, errors.New("Invalid signed release fields")
	}
	seen := map[string]bool{}
	for _, a := range release.Artifacts {
		if seen[a.Target] || !hashPattern.MatchString(a.SHA256) || a.Bytes <= 0 || a.Bytes > 16<<30 {
			return nil, errors.New("Invalid or duplicate release artifact")
		}
		seen[a.Target] = true
		if err := downloadURL(a.URL, cfg.Repository, release.Version); err != nil {
			return nil, err
		}
		var sum int64
		partURLs := map[string]bool{}
		if len(a.Parts) > 32 {
			return nil, errors.New("Too many artifact parts")
		}
		for _, part := range a.Parts {
			if part.Bytes <= 0 || part.Bytes >= 2<<30 || !hashPattern.MatchString(part.SHA256) || partURLs[part.URL] {
				return nil, errors.New("Invalid artifact part")
			}
			partURLs[part.URL] = true
			if err := downloadURL(part.URL, cfg.Repository, release.Version); err != nil {
				return nil, err
			}
			sum += part.Bytes
		}
		if (len(a.Parts) > 0 && sum != a.Bytes) || (len(a.Parts) == 0 && a.Bytes >= 2<<30) {
			return nil, errors.New("Artifact exceeds GitHub asset limits or part sizes do not match")
		}
		if a.Target == "windows-amd64" || a.Target == "darwin-universal" {
			if a.Format != "zip" || a.Bytes > 2<<30 {
				return nil, errors.New("Invalid desktop archive")
			}
		} else if a.Target == "linux-amd64" || a.Target == "linux-arm64" {
			if a.Format != "docker-archive" || !strings.HasPrefix(a.ImageID, "sha256:") || !hashPattern.MatchString(strings.TrimPrefix(a.ImageID, "sha256:")) {
				return nil, errors.New("Invalid server image")
			}
		} else {
			return nil, errors.New("Unknown release target")
		}
	}
	if len(seen) == 0 {
		return nil, errors.New("Release has no artifacts")
	}
	return &release, nil
}
func (r *Release) Artifact(target string) (Artifact, error) {
	for _, a := range r.Artifacts {
		if a.Target == target {
			return a, nil
		}
	}
	return Artifact{}, errors.New("This release has no download for this platform")
}

func Download(ctx context.Context, client *http.Client, artifact Artifact, destination string, progress func(int64)) error {
	file, err := os.OpenFile(destination, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	ok := false
	defer func() {
		file.Close()
		if !ok {
			os.Remove(destination)
		}
	}()
	hash := sha256.New()
	buffer := make([]byte, 128<<10)
	var total int64
	last := time.Time{}
	parts := artifact.Parts
	if len(parts) == 0 {
		parts = []ArtifactPart{{URL: artifact.URL, SHA256: artifact.SHA256, Bytes: artifact.Bytes}}
	}
	for _, part := range parts {
		err = func() error {
			response, err := request(ctx, client, part.URL)
			if err != nil {
				return err
			}
			defer response.Body.Close()
			if response.ContentLength >= 0 && response.ContentLength != part.Bytes {
				return errors.New("Download length does not match the signed manifest")
			}
			partHash := sha256.New()
			var received int64
			for {
				n, readErr := response.Body.Read(buffer)
				if n > 0 {
					received += int64(n)
					total += int64(n)
					if received > part.Bytes || total > artifact.Bytes {
						return errors.New("Download exceeded its signed size")
					}
					if _, err = file.Write(buffer[:n]); err != nil {
						return err
					}
					hash.Write(buffer[:n])
					partHash.Write(buffer[:n])
					if time.Since(last) > 200*time.Millisecond {
						progress(total)
						last = time.Now()
					}
				}
				if readErr == io.EOF {
					break
				}
				if readErr != nil {
					return readErr
				}
			}
			if received != part.Bytes || hex.EncodeToString(partHash.Sum(nil)) != part.SHA256 {
				return errors.New("Release part failed checksum verification")
			}
			return nil
		}()
		if err != nil {
			return err
		}
	}
	if total != artifact.Bytes || hex.EncodeToString(hash.Sum(nil)) != artifact.SHA256 {
		return errors.New("Downloaded release failed checksum verification")
	}
	if err = file.Sync(); err != nil {
		return err
	}
	if err = file.Close(); err != nil {
		return err
	}
	ok = true
	progress(total)
	return nil
}
