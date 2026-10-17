package editor

import "testing"

func TestWidgetDimensionsSurviveConversion(t *testing.T) {
	snapshot, err := Convert(Source{"page", "widgets"}, "Dashboard", 1, []byte(`{"version":1,"blocks":[{"id":"agenda","type":"widget","widget":"actionAgenda","title":"Actions","width":"half","height":420}]}`), true)
	if err != nil {
		t.Fatal(err)
	}
	widget := snapshot.Blocks.Children[1].Children[0].Children[0].Children[0]
	config := widget.Props["config"].(map[string]any)
	if config["width"] != "half" || config["height"] != float64(420) {
		t.Fatal("widget dimensions were lost")
	}
	if _, err := Validate(snapshot); err != nil {
		t.Fatal(err)
	}
	for _, invalid := range []any{-1, 1001, "large"} {
		config["height"] = invalid
		if _, err := Validate(snapshot); err == nil {
			t.Fatalf("accepted invalid height %v", invalid)
		}
	}
	config["height"] = 0
	config["width"] = "screen"
	if _, err := Validate(snapshot); err == nil {
		t.Fatal("accepted invalid width")
	}
}
