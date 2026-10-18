package editor

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"
)

func TestPlainTextIsLiteralAndDeterministic(t *testing.T) {
	source := Source{"note", "11111111-1111-4111-8111-111111111111"}
	value := "# not a heading\r\n\n**not bold**\n[[literal link]]\n  indented  \n"
	a, err := Convert(source, "Title", 100, []byte(value), false)
	if err != nil {
		t.Fatal(err)
	}
	b, err := Convert(source, "Title", 100, []byte(value), false)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(a, b) {
		t.Fatal("conversion must be idempotent")
	}
	if PlainText(a) != value {
		t.Fatalf("plain text changed: %q", PlainText(a))
	}
	for _, block := range a.Blocks.Children[1].Children {
		if block.Flavour != "affine:paragraph" || block.Props["type"] != "text" {
			t.Fatal("plain text was interpreted as Markdown")
		}
	}
}

func TestRedrawMentionSurvivesLegacyConversion(t *testing.T) {
	value := `zillion:blocks:v1
{"type":"doc","content":[{"type":"paragraph","content":[{"type":"pageLink","attrs":{"kind":"redraw","targetId":"22222222-2222-4222-8222-222222222222","label":"Product design"}}]}]}`
	snapshot, err := Convert(Source{"page", "11111111-1111-4111-8111-111111111111"}, "Review", 100, []byte(value), false)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(snapshot)
	if !strings.Contains(string(raw), "/redraw/22222222-2222-4222-8222-222222222222") || PlainText(snapshot) != "Product design" {
		t.Fatal("Redraw mention lost its identity or visible title")
	}
	if _, err := Validate(snapshot); err != nil {
		t.Fatal(err)
	}
}
func TestRecordPageEmbedsSurviveMigration(t *testing.T) {
	value := `zillion:blocks:v1
{"type":"doc","content":[{"type":"callout","attrs":{"id":"callout"},"content":[{"type":"paragraph","content":[{"type":"text","text":"Plan"}]},{"type":"linkedDatabase","attrs":{"id":"database","workspaceId":"11111111-1111-4111-8111-111111111111","baseId":"22222222-2222-4222-8222-222222222222","viewId":"33333333-3333-4333-8333-333333333333","height":460,"title":"Tasks"}}]},{"type":"pageEmbed","attrs":{"id":"child-page","kind":"record","targetId":"44444444-4444-4444-8444-444444444444","label":"Brief"}}]}`
	snapshot, err := Convert(Source{"record", "55555555-5555-4555-8555-555555555555"}, "Title", 100, []byte(value), false)
	if err != nil {
		t.Fatal(err)
	}
	blocks := snapshot.Blocks.Children[1].Children
	if blocks[0].Flavour != "affine:callout" || blocks[0].Children[1].Flavour != "monolith:linked-database" || blocks[0].Children[1].Props["height"] != float64(460) {
		t.Fatal("callout or database geometry was lost")
	}
	raw, _ := json.Marshal(snapshot)
	if !strings.Contains(string(raw), "44444444-4444-4444-8444-444444444444") || !strings.Contains(string(raw), "Brief") {
		t.Fatal("inline page reference was lost")
	}
}
func TestStructuredContentPreservesIDsNestingMarksAndLinks(t *testing.T) {
	value := `zillion:blocks:v1
{"type":"doc","content":[{"type":"heading","attrs":{"id":"heading-id","level":2},"content":[{"type":"text","text":"Heading","marks":[{"type":"bold"}]}]},{"type":"bulletList","attrs":{"id":"list-id"},"content":[{"type":"listItem","attrs":{"id":"item-id"},"content":[{"type":"paragraph","attrs":{"id":"paragraph-anchor"},"content":[{"type":"pageLink","attrs":{"kind":"document","targetId":"22222222-2222-4222-8222-222222222222","label":"Linked page"}}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Nested"}]}]}]}]}]}]}`
	snapshot, err := Convert(Source{"page", "11111111-1111-4111-8111-111111111111"}, "Title", 100, []byte(value), false)
	if err != nil {
		t.Fatal(err)
	}
	blocks := snapshot.Blocks.Children[1].Children
	if blocks[0].ID != "heading-id" || blocks[0].Props["type"] != "h2" || blocks[1].ID != "list-id" {
		t.Fatal("stable IDs or heading lost")
	}
	item := blocks[1].Children[0]
	if item.ID != "item-id" || !reflect.DeepEqual(item.Props["monolith:anchors"], []any{"paragraph-anchor"}) || item.Children[0].Children[0].Flavour != "affine:list" {
		t.Fatal("list hierarchy or anchor lost")
	}
	raw, _ := json.Marshal(snapshot)
	if !strings.Contains(string(raw), `"bold":true`) || !strings.Contains(string(raw), `/page/22222222-2222-4222-8222-222222222222`) {
		t.Fatal("marks or references lost")
	}
}
func TestCanvasPreservesReferencesAndMapsColumns(t *testing.T) {
	value := `{"version":1,"title":"Board","blocks":[{"id":"a","type":"heading","width":"half","title":"First"},{"id":"b","type":"database","width":"half","database":{"workspaceId":"workspace","baseId":"base","viewId":"view"}},{"id":"c","type":"native","width":"third","widget":"projects"}]}`
	snapshot, err := Convert(Source{"page", "page"}, "Board", 1, []byte(value), true)
	if err != nil {
		t.Fatal(err)
	}
	blocks := snapshot.Blocks.Children[1].Children
	if len(blocks) != 2 || len(blocks[0].Children) != 2 || len(blocks[1].Children) != 3 {
		t.Fatal("column layout changed")
	}
	embed := blocks[0].Children[1].Children[0]
	if embed.ID != "b" || embed.Props["baseId"] != "base" {
		t.Fatal("database reference lost")
	}
	module := blocks[1].Children[0].Children[0]
	if module.ID != "c" || module.Flavour != "monolith:module" || module.Props["widgetId"] != "projects" {
		t.Fatal("dashboard lost")
	}
}
func TestUnsupportedContentNeverSilentlyDrops(t *testing.T) {
	for _, value := range []string{"zillion:blocks:v3\n{}", `zillion:blocks:v1
{"type":"doc","content":[{"type":"unknown"}]}`, `zillion:blocks:v1
{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"bad","marks":[{"type":"link","attrs":{"href":"javascript:alert(1)"}}]}]}]}`} {
		if _, err := Convert(Source{"page", "page"}, "Title", 1, []byte(value), false); err == nil {
			t.Fatal("unsafe or unsupported source was accepted")
		}
	}
}
func TestNestedColumnsAndDuplicateIDsAreRejected(t *testing.T) {
	snapshot, err := Convert(Source{"page", "page"}, "Title", 1, []byte("one\ntwo"), false)
	if err != nil {
		t.Fatal(err)
	}
	snapshot.Blocks.Children[1].Children[1].ID = snapshot.Blocks.Children[1].Children[0].ID
	if _, err = Validate(snapshot); err == nil {
		t.Fatal("duplicate ID accepted")
	}
}

func TestInlineDatabaseHeightSurvivesConversionAndIsBounded(t *testing.T) {
	value := `{"version":1,"title":"Inline","blocks":[{"id":"database","type":"database","width":"full","database":{"workspaceId":"workspace","baseId":"base","viewId":"gallery","height":420}}]}`
	snapshot, err := Convert(Source{"page", "page"}, "Inline", 1, []byte(value), true)
	if err != nil {
		t.Fatal(err)
	}
	embed := &snapshot.Blocks.Children[1].Children[0]
	if embed.Props["height"] != float64(420) || embed.Props["viewId"] != "gallery" {
		t.Fatal("inline layout lost")
	}
	for _, height := range []any{-1, 1201, "420"} {
		embed.Props["height"] = height
		if _, err := Validate(snapshot); err == nil {
			t.Fatal("invalid height accepted")
		}
	}
	delete(embed.Props, "height")
	if _, err := Validate(snapshot); err != nil {
		t.Fatal("legacy reference must remain compatible", err)
	}
}
