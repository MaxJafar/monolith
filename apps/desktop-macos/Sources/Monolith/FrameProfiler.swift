import AppKit
import WebKit

/// Local diagnostics only. No page content, credentials, or arbitrary script execution.
final class FrameProfiler: NSObject, WKScriptMessageHandler {
    private let file: FileHandle
    private let writer = DispatchQueue(label: "app.monolith.frame-profile", qos: .utility)
    private let clock: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    init?(path: String) {
        guard path.hasPrefix("/"), FileManager.default.createFile(atPath: path, contents: nil),
              let handle = FileHandle(forWritingAtPath: path) else { return nil }
        file = handle
        super.init()
        write(["type": "display", "maximumFramesPerSecond": NSScreen.main?.maximumFramesPerSecond ?? 0,
               "capturedAt": clock.string(from: Date())])
    }
    deinit { writer.sync { try? file.close() } }
    func recordRefreshPolicy(_ policy: String) {
        write(["type": "refreshPolicy", "policy": policy, "capturedAt": clock.string(from: Date())])
    }
    private func write(_ value: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: value) else { return }
        let handle = file
        writer.async { try? handle.write(contentsOf: data + Data([10])) }
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.scheme == "monolith",
              message.frameInfo.request.url?.host == "app", let body = message.body as? [String: Any],
              let intervals = body["intervals"] as? [Double], intervals.count <= 1000,
              let events = body["events"] as? [String: Int], events.count <= 8 else { return }
        write(["type": "frames", "capturedAt": clock.string(from: Date()),
               "intervals": intervals, "events": events, "visible": body["visible"] as? Bool ?? false])
    }
    static let script = """
    (() => {
      let last = 0, intervals = [], events = {}, running = true;
      const tick = now => {
        if (!running) return;
        if (last) intervals.push(now - last);
        last = now;
        requestAnimationFrame(tick);
      };
      const record = event => { events[event.type] = (events[event.type] || 0) + 1; };
      const types = ['pointerdown','pointerup','pointermove','wheel','scroll','dragover'];
      for (const type of types) document.addEventListener(type, record, {capture: true, passive: true});
      requestAnimationFrame(tick);
      const timer = setInterval(() => {
        window.webkit.messageHandlers.motionFrames.postMessage({intervals, events, visible: document.visibilityState === 'visible'});
        intervals = []; events = {};
      }, 1000);
      setTimeout(() => {
        running = false; clearInterval(timer);
        for (const type of types) document.removeEventListener(type, record, true);
      }, 300000);
    })();
    """
}
