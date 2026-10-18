package updates

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type Runner func(context.Context, string, ...string) ([]byte, error)
type Compose struct {
	Config Config
	Root   string
	Run    Runner
	Client *http.Client
}

func command(ctx context.Context, name string, args ...string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	quietCommand(cmd)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("%s failed: %s", name, strings.TrimSpace(string(out)))
	}
	return out, nil
}
func (c *Compose) args(override bool, extra ...string) []string {
	args := []string{"compose", "--project-name", c.Config.Compose.Project, "--env-file", c.Config.Compose.EnvFile}
	for _, file := range c.Config.Compose.Files {
		args = append(args, "-f", file)
	}
	if override {
		args = append(args, "-f", filepath.Join(c.Root, "active-compose.json"))
	}
	return append(args, extra...)
}
func (c *Compose) run(ctx context.Context, name string, args ...string) ([]byte, error) {
	if c.Run != nil {
		return c.Run(ctx, name, args...)
	}
	return command(ctx, name, args...)
}
func (c *Compose) current(ctx context.Context) (map[string]string, error) {
	images := map[string]string{}
	for _, service := range []string{"server", "gateway"} {
		out, err := c.run(ctx, "docker", c.args(false, "ps", "--all", "--quiet", service)...)
		if err != nil {
			return nil, err
		}
		id := strings.TrimSpace(string(out))
		if id == "" || strings.ContainsAny(id, "\r\n") {
			return nil, errors.New("Expected one running server and one gateway in this Compose project")
		}
		out, err = c.run(ctx, "docker", "inspect", "--format", "{{.Image}}", id)
		if err != nil {
			return nil, err
		}
		image := strings.TrimSpace(string(out))
		if !strings.HasPrefix(image, "sha256:") || !hashPattern.MatchString(strings.TrimPrefix(image, "sha256:")) {
			return nil, errors.New("Could not identify the previous immutable image")
		}
		images[service] = image
	}
	return images, nil
}
func (c *Compose) Prepare(ctx context.Context, r *Release, a Artifact, archive string) (*Journal, error) {
	if _, err := c.InstalledVersion(ctx); err != nil {
		return nil, err
	}
	old, err := c.current(ctx)
	if err != nil {
		return nil, err
	}
	if _, err = c.run(ctx, "docker", "image", "load", "--input", archive); err != nil {
		return nil, err
	}
	image, err := c.resolveImage(ctx, r, a, archive)
	if err != nil {
		return nil, err
	}
	return &Journal{Kind: "compose", OldImages: old, NewImage: image}, nil
}

// Inspect the running immutable images, rather than assuming an old config file
// still describes a deployment that an administrator may have changed manually.
func (c *Compose) InstalledVersion(ctx context.Context) (string, error) {
	images, err := c.current(ctx)
	if err != nil {
		return "", err
	}
	version := ""
	for _, image := range images {
		out, err := c.run(ctx, "docker", "image", "inspect", image)
		if err != nil {
			return "", err
		}
		var result []struct {
			Config struct{ Labels map[string]string }
		}
		if json.Unmarshal(out, &result) != nil || len(result) != 1 {
			return "", errors.New("Installed image metadata is unavailable")
		}
		labels := result[0].Config.Labels
		next := labels["org.opencontainers.image.version"]
		if !versionPattern.MatchString(next) || labels["app.monolith.schema"] != c.Config.SchemaHash || (version != "" && version != next) {
			return "", errors.New("Installed server versions or schema do not match the supervisor configuration")
		}
		version = next
	}
	check, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := c.health(check, version); err != nil {
		return "", err
	}
	return version, nil
}
func (c *Compose) apply(ctx context.Context, images map[string]string) error {
	if len(images) != 2 {
		return errors.New("Invalid server recovery image set")
	}
	services := map[string]any{}
	for _, service := range []string{"server", "gateway"} {
		image := images[service]
		if !strings.HasPrefix(image, "sha256:") || !hashPattern.MatchString(strings.TrimPrefix(image, "sha256:")) {
			return errors.New("Invalid server image identifier")
		}
		services[service] = map[string]any{"image": image, "pull_policy": "never"}
	}
	if err := atomicJSON(filepath.Join(c.Root, "active-compose.json"), map[string]any{"services": services}); err != nil {
		return err
	}
	_, err := c.run(ctx, "docker", c.args(true, "up", "--detach", "--no-deps", "--no-build", "--pull", "never", "--wait", "--wait-timeout", "120", "server", "gateway")...)
	return err
}
func (c *Compose) Activate(ctx context.Context, j *Journal) error {
	if j.Kind != "compose" {
		return errors.New("Invalid server transaction")
	}
	return c.apply(ctx, map[string]string{"server": j.NewImage, "gateway": j.NewImage})
}
func (c *Compose) health(ctx context.Context, version string) error {
	u, err := url.Parse(c.Config.Compose.HealthURL)
	if err != nil || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Scheme != "http" && u.Scheme != "https") || u.Path != "/healthz" {
		return errors.New("Configure the gateway health URL ending in /healthz")
	}
	client := c.Client
	if client == nil {
		client = &http.Client{Timeout: 5 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	}
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
		res, err := client.Do(req)
		if err == nil {
			var body struct {
				Status     string `json:"status"`
				Version    string `json:"version"`
				APIHealthy bool   `json:"apiHealthy"`
			}
			data, readErr := io.ReadAll(io.LimitReader(res.Body, 16384))
			res.Body.Close()
			if readErr == nil && res.StatusCode == 200 && json.Unmarshal(data, &body) == nil && body.Status == "ok" && body.Version == version && body.APIHealthy {
				return nil
			}
		}
		select {
		case <-ctx.Done():
			return errors.New("Replacement server did not report the expected version, database and API health")
		case <-ticker.C:
		}
	}
}
func (c *Compose) Healthy(ctx context.Context, j *Journal) error { return c.health(ctx, j.To) }
func (c *Compose) Rollback(ctx context.Context, j *Journal) error {
	if j.Kind != "compose" {
		return errors.New("Invalid server recovery journal")
	}
	// A manual migration may have invalidated the retained image since it was
	// installed. Refuse to bring old code up against a changed schema baseline.
	for _, image := range j.OldImages {
		out, err := c.run(ctx, "docker", "image", "inspect", image)
		if err != nil {
			return err
		}
		var images []struct {
			Config struct{ Labels map[string]string }
		}
		if json.Unmarshal(out, &images) != nil || len(images) != 1 || images[0].Config.Labels["org.opencontainers.image.version"] != j.From || images[0].Config.Labels["app.monolith.schema"] != c.Config.SchemaHash {
			return errors.New("The retained server image does not match the current schema; use the planned migration recovery procedure")
		}
	}
	if err := c.apply(ctx, j.OldImages); err != nil {
		return err
	}
	return c.health(ctx, j.From)
}
