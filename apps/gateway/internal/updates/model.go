// Package updates implements the signed release protocol shared by the native
// clients and the independently supervised Docker host updater.
package updates

import (
	"crypto/ed25519"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
)

const ManifestName = "monolith-release.json"

type Config struct {
	Repository string         `json:"repository"`
	PublicKey  string         `json:"publicKey"`
	Version    string         `json:"version"`
	Target     string         `json:"target"`
	Protocol   int            `json:"protocol"`
	SchemaHash string         `json:"schemaHash,omitempty"`
	MacTeamID  string         `json:"macTeamId,omitempty"`
	Compose    *ComposeConfig `json:"compose,omitempty"`
	Listen     string         `json:"listen,omitempty"`
	TokenFile  string         `json:"tokenFile,omitempty"`
}
type ComposeConfig struct {
	Files     []string `json:"files"`
	EnvFile   string   `json:"envFile"`
	Project   string   `json:"project"`
	HealthURL string   `json:"healthUrl"`
}
type Preferences struct {
	Channel        string `json:"channel"`
	AutoDownload   bool   `json:"autoDownload"`
	AutoInstall    bool   `json:"autoInstall"`
	InstallHourUTC int    `json:"installHourUTC"`
}
type Artifact struct {
	Target  string         `json:"target"`
	URL     string         `json:"url"`
	SHA256  string         `json:"sha256"`
	Bytes   int64          `json:"bytes"`
	Format  string         `json:"format"`
	ImageID string         `json:"imageId,omitempty"`
	Parts   []ArtifactPart `json:"parts,omitempty"`
}
type ArtifactPart struct {
	URL    string `json:"url"`
	SHA256 string `json:"sha256"`
	Bytes  int64  `json:"bytes"`
}
type Release struct {
	Format     int        `json:"format"`
	Version    string     `json:"version"`
	Channel    string     `json:"channel"`
	Protocol   int        `json:"protocol"`
	SchemaHash string     `json:"schemaHash"`
	Notes      string     `json:"notes"`
	Artifacts  []Artifact `json:"artifacts"`
}
type Envelope struct {
	Payload   string `json:"payload"`
	Signature string `json:"signature"`
}
type State struct {
	Configured      bool        `json:"configured"`
	Target          string      `json:"target"`
	CurrentVersion  string      `json:"currentVersion"`
	Phase           string      `json:"phase"`
	Release         *Release    `json:"release"`
	Received        int64       `json:"received"`
	Total           int64       `json:"total"`
	Error           string      `json:"error"`
	Blocked         string      `json:"blocked"`
	CheckedAt       string      `json:"checkedAt"`
	Preferences     Preferences `json:"preferences"`
	PreviousVersion string      `json:"previousVersion"`
	FailedVersion   string      `json:"failedVersion"`
	CanRollback     bool        `json:"canRollback"`
	NoticeID        string      `json:"noticeId"`
}
type Journal struct {
	Kind         string            `json:"kind"`
	From         string            `json:"from"`
	To           string            `json:"to"`
	Backup       string            `json:"backup,omitempty"`
	Stage        string            `json:"stage,omitempty"`
	Install      string            `json:"install,omitempty"`
	OldImages    map[string]string `json:"oldImages,omitempty"`
	NewImage     string            `json:"newImage,omitempty"`
	CandidatePID int               `json:"candidatePid,omitempty"`
	Activated    bool              `json:"activated"`
}
type Endpoint struct {
	URL   string `json:"url"`
	Token string `json:"token"`
}

var repositoryPattern = regexp.MustCompile(`^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`)
var versionPattern = regexp.MustCompile(`^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z.-]+)?$`)
var hashPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)

func key(value string) (ed25519.PublicKey, error) {
	value = strings.ReplaceAll(value, `\n`, "\n")
	if block, _ := pem.Decode([]byte(value)); block != nil {
		parsed, err := x509.ParsePKIXPublicKey(block.Bytes)
		if err == nil {
			if key, ok := parsed.(ed25519.PublicKey); ok {
				return key, nil
			}
		}
	}
	decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(value))
	if err != nil || len(decoded) != ed25519.PublicKeySize {
		return nil, errors.New("An Ed25519 release public key is required")
	}
	return ed25519.PublicKey(decoded), nil
}

func (c Config) Validate() error {
	if !repositoryPattern.MatchString(c.Repository) || !versionPattern.MatchString(c.Version) || c.Protocol != 1 {
		return errors.New("Invalid updater configuration")
	}
	if c.PublicKey != "" {
		if _, err := key(c.PublicKey); err != nil {
			return err
		}
	}
	switch c.Target {
	case "windows-amd64", "darwin-universal":
		if c.Compose != nil {
			return errors.New("Desktop configuration cannot manage a server")
		}
	case "linux-amd64", "linux-arm64":
		if c.Compose == nil || len(c.Compose.Files) == 0 || !hashPattern.MatchString(c.SchemaHash) {
			return errors.New("A server requires Compose files and the installed schema fingerprint")
		}
		for _, file := range append(append([]string{}, c.Compose.Files...), c.Compose.EnvFile) {
			if !filepath.IsAbs(file) {
				return errors.New("Compose paths must be absolute")
			}
		}
		if !regexp.MustCompile(`^[a-z0-9][a-z0-9_-]*$`).MatchString(c.Compose.Project) {
			return errors.New("Invalid Compose project")
		}
	default:
		return fmt.Errorf("Unsupported update target %s", c.Target)
	}
	return nil
}

func Compare(a, b string) int {
	left, right := versionPattern.FindStringSubmatch(a), versionPattern.FindStringSubmatch(b)
	if left == nil || right == nil {
		return 0
	}
	for i := 1; i <= 3; i++ {
		if c := numericCompare(left[i], right[i]); c != 0 {
			return c
		}
	}
	if left[4] == right[4] {
		return 0
	}
	if left[4] == "" {
		return 1
	}
	if right[4] == "" {
		return -1
	}
	x, y := strings.Split(left[4], "."), strings.Split(right[4], ".")
	for i := 0; i < len(x) && i < len(y); i++ {
		if x[i] == y[i] {
			continue
		}
		nx, ny := allDigits(x[i]), allDigits(y[i])
		if nx && ny {
			return numericCompare(x[i], y[i])
		}
		if nx {
			return -1
		}
		if ny {
			return 1
		}
		return strings.Compare(x[i], y[i])
	}
	if len(x) < len(y) {
		return -1
	}
	return 1
}
func allDigits(s string) bool {
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return s != ""
}
func numericCompare(a, b string) int {
	a = strings.TrimLeft(a, "0")
	b = strings.TrimLeft(b, "0")
	if len(a) < len(b) {
		return -1
	}
	if len(a) > len(b) {
		return 1
	}
	return strings.Compare(a, b)
}
func busy(phase string) bool {
	return phase == "checking" || phase == "downloading" || phase == "verifying" || phase == "installing" || phase == "restarting" || phase == "rollingBack"
}
