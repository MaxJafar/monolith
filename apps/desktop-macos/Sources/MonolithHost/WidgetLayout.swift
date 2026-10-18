import Foundation
import CoreFoundation

enum WidgetLayout {
    // Keep encrypted local drafts within the same bounds as the Go gateway.
    static func valid(_ snapshot: [String: Any]) -> Bool {
        var count = 0
        func visit(_ block: [String: Any], depth: Int) -> Bool {
            count += 1
            guard depth <= 40, count <= 10_000,
                  let children = block["children"] as? [[String: Any]] else { return false }
            if block["flavour"] as? String == "monolith:module",
               let props = block["props"] as? [String: Any],
               let config = props["config"] as? [String: Any] {
                if let width = config["width"] {
                    guard let width = width as? String, ["", "full", "half", "third"].contains(width) else { return false }
                }
                if let raw = config["height"] {
                    guard let number = raw as? NSNumber,
                          CFGetTypeID(number) != CFBooleanGetTypeID(),
                          number.doubleValue.isFinite,
                          (0...1000).contains(number.doubleValue) else { return false }
                }
            }
            return children.allSatisfy { visit($0, depth: depth + 1) }
        }
        guard let root = snapshot["blocks"] as? [String: Any] else { return false }
        return visit(root, depth: 0)
    }
}
