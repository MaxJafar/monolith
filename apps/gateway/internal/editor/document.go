package editor

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"
)

const FormatVersion = 2
const MaxBytes = 5_000_000
const TextTag = "$blocksuite:internal:text$"

type Source struct {
	Kind string `json:"kind"`
	ID   string `json:"id"`
}
type Document struct {
	Source        Source    `json:"source"`
	WorkspaceID   string    `json:"workspaceId"`
	Revision      int64     `json:"revision"`
	FormatVersion int       `json:"formatVersion"`
	Snapshot      Snapshot  `json:"snapshot"`
	Recovery      bool      `json:"recovery"`
	UpdatedAt     time.Time `json:"updatedAt"`
}
type Snapshot struct {
	Type   string `json:"type"`
	Meta   Meta   `json:"meta"`
	Blocks Block  `json:"blocks"`
}
type Meta struct {
	ID         string   `json:"id"`
	Title      string   `json:"title"`
	CreateDate int64    `json:"createDate"`
	Tags       []string `json:"tags"`
}
type Block struct {
	Type     string         `json:"type"`
	ID       string         `json:"id"`
	Flavour  string         `json:"flavour"`
	Version  int            `json:"version"`
	Props    map[string]any `json:"props"`
	Children []Block        `json:"children"`
}
type Reference struct {
	WorkspaceID string
	BaseID      string
	ViewID      string
}

func NormalizeKind(kind string) (string, error) {
	switch kind {
	case "page", "document", "documents", "workspace-page":
		return "page", nil
	case "record", "records":
		return "record", nil
	case "note", "notes":
		return "note", nil
	default:
		return "", errors.New("unsupported source kind")
	}
}

var content = map[string]bool{"affine:paragraph": true, "affine:list": true, "affine:code": true, "affine:divider": true, "affine:callout": true, "monolith:linked-database": true, "monolith:module": true, "monolith:group": true}

// Validation is independent of the browser. Unknown blocks stop a save instead
// of disappearing during a conversion or being rendered as executable content.
func Validate(snapshot Snapshot) ([]Reference, error) {
	raw, err := json.Marshal(snapshot)
	if err != nil || len(raw) > MaxBytes || snapshot.Type != "page" || snapshot.Meta.ID == "" || len(snapshot.Meta.Title) > 2000 {
		return nil, errors.New("invalid snapshot")
	}
	seen := map[string]bool{}
	references := []Reference{}
	count := 0
	var visit func(Block, string, int) error
	visit = func(b Block, parent string, depth int) error {
		count++
		if count > 10000 || depth > 40 || b.Type != "block" || b.ID == "" || len(b.ID) > 200 || seen[b.ID] || b.Props == nil || b.Children == nil {
			return errors.New("invalid block tree")
		}
		seen[b.ID] = true
		allowed := false
		switch parent {
		case "":
			allowed = b.Flavour == "affine:page" && b.Version == 2
		case "affine:page":
			allowed = b.Flavour == "affine:surface" || b.Flavour == "affine:note"
		case "affine:note":
			allowed = content[b.Flavour] || b.Flavour == "monolith:columns"
		case "monolith:columns":
			allowed = b.Flavour == "monolith:column"
		case "monolith:column", "monolith:group", "affine:paragraph", "affine:list", "affine:callout":
			allowed = content[b.Flavour]
		}
		if !allowed {
			return fmt.Errorf("unsupported %s in %s", b.Flavour, parent)
		}
		if b.Flavour == "affine:surface" {
			if _, ok := b.Props["elements"].(map[string]any); !ok {
				return errors.New("surface elements must be an object")
			}
		}
		if b.Flavour == "monolith:columns" {
			number, _ := b.Props["count"].(float64)
			if n, ok := b.Props["count"].(int); ok {
				number = float64(n)
			}
			if (number != 2 && number != 3) || len(b.Children) != int(number) {
				return errors.New("invalid columns")
			}
		}
		if b.Flavour == "monolith:linked-database" {
			if raw, exists := b.Props["height"]; exists {
				height, valid := raw.(float64)
				if value, ok := raw.(int); ok {
					height, valid = float64(value), true
				}
				if !valid || height < 0 || height > 1200 {
					return errors.New("invalid database height")
				}
			}
			ref := Reference{stringProp(b, "workspaceId"), stringProp(b, "baseId"), stringProp(b, "viewId")}
			if ref.WorkspaceID == "" || ref.BaseID == "" {
				return errors.New("invalid database reference")
			}
			references = append(references, ref)
		}
		if b.Flavour == "monolith:module" {
			if config, ok := b.Props["config"].(map[string]any); ok {
				if width, exists := config["width"]; exists && width != "" && width != "full" && width != "half" && width != "third" {
					return errors.New("invalid widget width")
				}
				if raw, exists := config["height"]; exists {
					height, valid := raw.(float64)
					if number, ok := raw.(int); ok {
						height, valid = float64(number), true
					}
					if !valid || height < 0 || height > 1000 {
						return errors.New("invalid widget height")
					}
				}
			}
		}
		if err := validateValues(b.Props, 0); err != nil {
			return err
		}
		for _, child := range b.Children {
			if err := visit(child, b.Flavour, depth+1); err != nil {
				return err
			}
		}
		return nil
	}
	if err := visit(snapshot.Blocks, "", 0); err != nil {
		return nil, err
	}
	if len(snapshot.Blocks.Children) != 2 || snapshot.Blocks.Children[0].Flavour != "affine:surface" || snapshot.Blocks.Children[1].Flavour != "affine:note" {
		return nil, errors.New("document must have one surface and one note")
	}
	return references, nil
}
func stringProp(b Block, key string) string { value, _ := b.Props[key].(string); return value }
func validateValues(value any, depth int) error {
	if depth > 50 {
		return errors.New("excessive property nesting")
	}
	switch v := value.(type) {
	case map[string]any:
		if text, ok := v[TextTag]; ok {
			if text != true {
				return errors.New("invalid rich text")
			}
			deltas, ok := v["delta"].([]any)
			if !ok {
				return errors.New("invalid text delta")
			}
			for _, delta := range deltas {
				op, ok := delta.(map[string]any)
				if !ok {
					return errors.New("invalid text operation")
				}
				if _, ok := op["insert"].(string); !ok {
					return errors.New("non-text insert is not supported")
				}
				if op["retain"] != nil || op["delete"] != nil {
					return errors.New("snapshot must contain insert deltas")
				}
			}
		}
		for key, child := range v {
			if key == "__proto__" || key == "constructor" || key == "prototype" {
				return errors.New("invalid property")
			}
			if key == "link" || key == "href" || key == "url" {
				if s, ok := child.(string); ok && s != "" && !SafeLink(s) {
					return errors.New("unsafe link")
				}
			}
			if err := validateValues(child, depth+1); err != nil {
				return err
			}
		}
	case []any:
		for _, child := range v {
			if err := validateValues(child, depth+1); err != nil {
				return err
			}
		}
	}
	return nil
}
func SafeLink(value string) bool {
	if strings.HasPrefix(value, "/") && !strings.HasPrefix(value, "//") && !strings.ContainsAny(value, "\\\r\n") {
		return true
	}
	parsed, err := url.Parse(value)
	return err == nil && parsed.User == nil && (parsed.Scheme == "https" || parsed.Scheme == "http" || parsed.Scheme == "mailto")
}
func Text(value string) map[string]any    { return RichText([]any{map[string]any{"insert": value}}) }
func RichText(delta []any) map[string]any { return map[string]any{TextTag: true, "delta": delta} }
func PlainText(snapshot Snapshot) string {
	var chunks []string
	var visit func(Block)
	visit = func(b Block) {
		if b.Flavour != "affine:page" {
			if text, ok := b.Props["text"].(map[string]any); ok {
				var out strings.Builder
				if delta, ok := text["delta"].([]any); ok {
					for _, item := range delta {
						if op, ok := item.(map[string]any); ok {
							out.WriteString(fmt.Sprint(op["insert"]))
						}
					}
				}
				chunks = append(chunks, out.String())
			}
		}
		for _, child := range b.Children {
			visit(child)
		}
	}
	visit(snapshot.Blocks)
	return strings.Join(chunks, "\n")
}
