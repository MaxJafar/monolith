package editor

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

type LegacyNode struct {
	Type  string         `json:"type"`
	Attrs map[string]any `json:"attrs"`
	Text  string         `json:"text"`
	Marks []struct {
		Type  string         `json:"type"`
		Attrs map[string]any `json:"attrs"`
	} `json:"marks"`
	Content []LegacyNode `json:"content"`
}
type CanvasBlock struct {
	ID, Type, Width, Title, Content, URL, Widget string
	Height                                       float64 `json:"height"`
	Database                                     *struct {
		WorkspaceID string  `json:"workspaceId"`
		BaseID      string  `json:"baseId"`
		ViewID      string  `json:"viewId"`
		Height      float64 `json:"height"`
	}
}
type Canvas struct {
	Version int           `json:"version"`
	Title   string        `json:"title"`
	Blocks  []CanvasBlock `json:"blocks"`
}

type converter struct {
	source  string
	counter int
}

func (c *converter) id(existing string) string {
	if existing != "" {
		return existing
	}
	c.counter++
	return uuid.NewSHA1(uuid.NameSpaceURL, []byte(fmt.Sprintf("monolith:%s:%d", c.source, c.counter))).String()
}
func (c *converter) block(id, flavour string, props map[string]any, children []Block) Block {
	if children == nil {
		children = []Block{}
	}
	if props == nil {
		props = map[string]any{}
	}
	return Block{"block", c.id(id), flavour, 1, props, children}
}

// Convert has no database side effects. Calling it repeatedly with the same
// identity/content yields the same IDs, making dry runs and retries comparable.
func Convert(source Source, title string, created int64, body []byte, canvas bool) (Snapshot, error) {
	c := converter{source: source.Kind + ":" + source.ID}
	var children []Block
	var err error
	if canvas {
		var page Canvas
		if err = json.Unmarshal(body, &page); err != nil {
			return Snapshot{}, err
		}
		if page.Version != 1 {
			return Snapshot{}, errors.New("unsupported canvas version")
		}
		children, err = c.canvas(page)
	} else {
		children, err = c.content(string(body))
	}
	if err != nil {
		return Snapshot{}, err
	}
	root := c.block("", "affine:page", map[string]any{"title": Text(title)}, []Block{
		c.block("", "affine:surface", map[string]any{"elements": map[string]any{}}, nil), c.block("", "affine:note", nil, children),
	})
	root.Version = 2
	snapshot := Snapshot{"page", Meta{source.ID, title, created, []string{}}, root}
	if _, err = Validate(snapshot); err != nil {
		return Snapshot{}, err
	}
	return snapshot, nil
}
func (c *converter) content(value string) ([]Block, error) {
	if strings.HasPrefix(value, "zillion:blocks:v1\n") {
		var node LegacyNode
		if err := json.Unmarshal([]byte(strings.TrimPrefix(value, "zillion:blocks:v1\n")), &node); err != nil {
			return nil, err
		}
		if node.Type != "doc" {
			return nil, errors.New("invalid legacy document")
		}
		return c.nodes(node.Content)
	}
	if strings.HasPrefix(value, "zillion:blocks:") {
		return nil, errors.New("unsupported legacy format")
	}
	// Do not parse Markdown or normalize whitespace/line endings.
	result := []Block{}
	for _, line := range strings.Split(value, "\n") {
		result = append(result, c.block("", "affine:paragraph", map[string]any{"type": "text", "text": Text(line)}, nil))
	}
	return result, nil
}
func (c *converter) nodes(nodes []LegacyNode) ([]Block, error) {
	result := []Block{}
	for _, node := range nodes {
		id, _ := node.Attrs["id"].(string)
		switch node.Type {
		case "paragraph", "heading", "codeBlock":
			delta, err := inline(node.Content)
			if err != nil {
				return nil, err
			}
			kind := "text"
			flavour := "affine:paragraph"
			if node.Type == "heading" {
				kind = fmt.Sprintf("h%v", node.Attrs["level"])
			}
			props := map[string]any{"text": RichText(delta), "type": kind}
			if node.Type == "codeBlock" {
				flavour = "affine:code"
				delete(props, "type")
				props["language"] = node.Attrs["language"]
			}
			result = append(result, c.block(id, flavour, props, nil))
		case "horizontalRule":
			result = append(result, c.block(id, "affine:divider", nil, nil))
		case "linkedDatabase":
			result = append(result, c.block(id, "monolith:linked-database", map[string]any{"workspaceId": node.Attrs["workspaceId"], "baseId": node.Attrs["baseId"], "viewId": node.Attrs["viewId"], "height": node.Attrs["height"]}, nil))
		case "pageEmbed":
			link := node
			link.Type = "pageLink"
			delta, err := inline([]LegacyNode{link})
			if err != nil {
				return nil, err
			}
			result = append(result, c.block(id, "affine:paragraph", map[string]any{"text": RichText(delta), "type": "text"}, nil))
		case "callout":
			children, err := c.nodes(node.Content)
			if err != nil {
				return nil, err
			}
			result = append(result, c.block(id, "affine:callout", map[string]any{"emoji": "", "text": Text("")}, children))
		case "blockquote":
			children, err := c.nodes(node.Content)
			if err != nil {
				return nil, err
			}
			result = append(result, c.block(id, "monolith:group", map[string]any{"kind": "quote"}, children))
		case "bulletList", "orderedList", "taskList":
			list := []Block{}
			for i, item := range node.Content {
				if item.Type != "listItem" && item.Type != "taskItem" {
					return nil, errors.New("invalid legacy list")
				}
				if len(item.Content) == 0 || item.Content[0].Type != "paragraph" {
					return nil, errors.New("list item has no paragraph")
				}
				delta, err := inline(item.Content[0].Content)
				if err != nil {
					return nil, err
				}
				children, err := c.nodes(item.Content[1:])
				if err != nil {
					return nil, err
				}
				kind := "bulleted"
				if node.Type == "orderedList" {
					kind = "numbered"
				}
				if node.Type == "taskList" {
					kind = "todo"
				}
				props := map[string]any{"text": RichText(delta), "type": kind, "checked": item.Attrs["checked"] == true}
				if kind == "numbered" {
					start, ok := node.Attrs["start"].(float64)
					if !ok {
						start = 1
					}
					props["order"] = int(start) + i
					props["monolith:numbering"] = node.Attrs["type"]
				}
				itemID, _ := item.Attrs["id"].(string)
				paragraphID, _ := item.Content[0].Attrs["id"].(string)
				if itemID == "" {
					itemID = paragraphID
				} else if paragraphID != "" && paragraphID != itemID {
					props["monolith:anchors"] = []any{paragraphID}
				}
				list = append(list, c.block(itemID, "affine:list", props, children))
			}
			result = append(result, c.block(id, "monolith:group", map[string]any{"kind": "list"}, list))
		default:
			return nil, fmt.Errorf("unsupported legacy block %q", node.Type)
		}
	}
	return result, nil
}
func inline(nodes []LegacyNode) ([]any, error) {
	result := []any{}
	for _, node := range nodes {
		text := node.Text
		attrs := map[string]any{}
		switch node.Type {
		case "text":
		case "hardBreak":
			text = "\n"
		case "pageLink":
			kind, _ := node.Attrs["kind"].(string)
			id, _ := node.Attrs["targetId"].(string)
			label, _ := node.Attrs["label"].(string)
			canonical, err := NormalizeKind(kind)
			if kind == "redraw" {
				canonical, err = "redraw", nil
			}
			if err != nil || id == "" {
				return nil, errors.New("invalid page reference")
			}
			// Ordinary inline links preserve visible text, source identity and anchors.
			text = label
			attrs["link"] = "/" + canonical + "/" + id
		default:
			return nil, fmt.Errorf("unsupported inline %q", node.Type)
		}
		for _, mark := range node.Marks {
			switch mark.Type {
			case "bold", "italic", "strike", "underline", "code":
				attrs[mark.Type] = true
			case "link":
				href, _ := mark.Attrs["href"].(string)
				if !SafeLink(href) {
					return nil, errors.New("unsafe legacy link")
				}
				attrs["link"] = href
			default:
				return nil, fmt.Errorf("unsupported mark %q", mark.Type)
			}
		}
		op := map[string]any{"insert": text}
		if len(attrs) > 0 {
			op["attributes"] = attrs
		}
		result = append(result, op)
	}
	return result, nil
}
func (c *converter) canvas(page Canvas) ([]Block, error) {
	result := []Block{}
	for index := 0; index < len(page.Blocks); {
		item := page.Blocks[index]
		width := 1
		if item.Width == "half" {
			width = 2
		}
		if item.Width == "third" {
			width = 3
		}
		if width == 1 {
			block, err := c.canvasBlock(item)
			if err != nil {
				return nil, err
			}
			result = append(result, block)
			index++
			continue
		}
		columns := []Block{}
		for column := 0; column < width; column++ {
			children := []Block{}
			if index < len(page.Blocks) && page.Blocks[index].Width == item.Width {
				block, err := c.canvasBlock(page.Blocks[index])
				if err != nil {
					return nil, err
				}
				children = append(children, block)
				index++
			}
			if len(children) == 0 {
				children = append(children, c.block("", "affine:paragraph", map[string]any{"type": "text", "text": Text("")}, nil))
			}
			columns = append(columns, c.block("", "monolith:column", nil, children))
		}
		result = append(result, c.block("", "monolith:columns", map[string]any{"count": width}, columns))
	}
	return result, nil
}
func (c *converter) canvasBlock(b CanvasBlock) (Block, error) {
	switch b.Type {
	case "document":
		children, err := c.content(b.Content)
		if err != nil {
			return Block{}, err
		}
		return c.block(b.ID, "monolith:group", map[string]any{"kind": "document", "title": b.Title}, children), nil
	case "heading":
		return c.block(b.ID, "affine:paragraph", map[string]any{"type": "h2", "text": Text(b.Title)}, nil), nil
	case "callout":
		return c.block(b.ID, "affine:callout", map[string]any{"emoji": "", "text": Text(b.Content)}, nil), nil
	case "divider":
		return c.block(b.ID, "affine:divider", nil, nil), nil
	case "database":
		if b.Database == nil {
			return Block{}, errors.New("database reference missing")
		}
		return c.block(b.ID, "monolith:linked-database", map[string]any{"workspaceId": b.Database.WorkspaceID, "baseId": b.Database.BaseID, "viewId": b.Database.ViewID, "height": b.Database.Height}, nil), nil
	case "native", "widget", "button":
		return c.block(b.ID, "monolith:module", map[string]any{"moduleId": b.Type, "widgetId": b.Widget, "config": map[string]any{"title": b.Title, "content": b.Content, "url": b.URL, "width": b.Width, "height": b.Height}}, nil), nil
	default:
		return Block{}, fmt.Errorf("unsupported canvas block %q", b.Type)
	}
}
