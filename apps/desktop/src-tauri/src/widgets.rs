use serde_json::Value;

// Match the Go document contract before committing an encrypted offline draft.
// Missing dimensions are valid for documents created before widget layouts.
pub fn valid_layout(snapshot: &Value) -> bool {
    fn visit(block: &Value, depth: usize, count: &mut usize) -> bool {
        *count += 1;
        if depth > 40 || *count > 10_000 {
            return false;
        }
        if block["flavour"] == "monolith:module" {
            let config = &block["props"]["config"];
            if let Some(width) = config.get("width") {
                if !matches!(width.as_str(), Some("" | "full" | "half" | "third")) {
                    return false;
                }
            }
            if let Some(height) = config.get("height") {
                if !height
                    .as_f64()
                    .is_some_and(|value| value.is_finite() && (0.0..=1000.0).contains(&value))
                {
                    return false;
                }
            }
        }
        block["children"]
            .as_array()
            .is_some_and(|children| children.iter().all(|child| visit(child, depth + 1, count)))
    }
    visit(&snapshot["blocks"], 0, &mut 0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn preserves_legacy_layouts_and_rejects_invalid_widget_dimensions() {
        for config in [
            json!({}),
            json!({"width":"half","height":420}),
            json!({"width":"full","height":0}),
        ] {
            assert!(valid_layout(
                &json!({"blocks":{"flavour":"monolith:module","props":{"config":config},"children":[]}})
            ));
        }
        for config in [
            json!({"height":1001}),
            json!({"height":-1}),
            json!({"height":true}),
            json!({"height":"420"}),
            json!({"width":"screen"}),
        ] {
            assert!(!valid_layout(
                &json!({"blocks":{"flavour":"monolith:module","props":{"config":config},"children":[]}})
            ));
        }
    }
}
