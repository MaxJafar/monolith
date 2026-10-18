import XCTest

final class NativeUITests: XCTestCase {
    private var output: URL {
        URL(fileURLWithPath: ProcessInfo.processInfo.environment["MONOLITH_UI_ROOT"]!)
    }

    func capture(_ name: String, app: XCUIApplication) throws {
        let shot = app.windows.firstMatch.screenshot()
        try shot.pngRepresentation.write(to: output.appendingPathComponent(name + ".png"))
        try app.windows.firstMatch.debugDescription.write(to: output.appendingPathComponent(name + ".txt"), atomically: true, encoding: .utf8)
        let attachment = XCTAttachment(screenshot: shot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testCurrentScreen() throws {
        // Observe an already-running development build without restarting it or
        // interacting with an operating-system credential prompt.
        try XCUIScreen.main.screenshot().pngRepresentation.write(
            to: output.appendingPathComponent("native-current-screen.png")
        )
    }

    func testIntegratedAtlas() throws {
        continueAfterFailure = false
        let app = XCUIApplication(url: URL(fileURLWithPath: ProcessInfo.processInfo.environment["MONOLITH_UI_APP"]!))
        addTeardownBlock { try? self.capture("native-atlas-latest", app: app) }
        if app.state == .notRunning { app.launch() } else { app.activate() }
        app.typeKey(.escape, modifierFlags: [])
        XCTAssertTrue(app.popUpButtons["Workspace"].waitForExistence(timeout: 30))
        app.popUpButtons["Workspace"].click()
        let workspaceMenu = app.otherElements["Workspace"]
        let candidates = workspaceMenu.staticTexts.matching(identifier: "Widget studio · webkit-canonical")
        XCTAssertTrue(candidates.firstMatch.waitForExistence(timeout: 10))
        // The fixture file is replaced by each setup run; its workspace is the
        // latest matching item in the server's creation-ordered list.
        let workspace = candidates.element(boundBy: candidates.count - 1)
        for _ in 0..<20 {
            if workspace.isHittable { break }
            workspaceMenu.scroll(byDeltaX: 0, deltaY: workspace.frame.midY < workspaceMenu.frame.minY ? 250 : -250)
        }
        workspace.click()
        let atlas = app.links["Atlas"]
        XCTAssertTrue(atlas.waitForExistence(timeout: 20))
        XCTAssertEqual(app.links.matching(identifier: "Atlas").count, 1)
        XCTAssertGreaterThan(atlas.frame.minY, app.links["Dashboard"].frame.minY)
        atlas.click()
        waitUntil("Atlas is the native window's current page") { app.tabs["Atlas"].isSelected }
        XCTAssertTrue(app.staticTexts["Explore your workspace"].waitForExistence(timeout: 30))
        let node = app.groups["Explorer"].checkBoxes.matching(NSPredicate(format: "title BEGINSWITH %@ OR label BEGINSWITH %@", "Atlas coherence", "Atlas coherence")).firstMatch
        XCTAssertTrue(node.waitForExistence(timeout: 15))
        app.staticTexts["Your pages, databases and ideas, connected."].scroll(byDeltaX: 0, deltaY: -650)
        node.click()
        XCTAssertTrue(app.buttons["Open page"].waitForExistence(timeout: 15))
        waitUntil("Preview contains the canonical edit saved on Windows") {
            app.groups["Page details"].staticTexts.allElementsBoundByIndex.contains {
                ($0.value as? String)?.contains("synced across views") == true
            }
        }
        try capture("native-atlas", app: app)
        app.buttons["Open page"].click()
        waitUntil("The original page editor opened") { app.tabs.matching(NSPredicate(format: "title BEGINSWITH %@", "Atlas coherence ")).firstMatch.isSelected }
        XCTAssertTrue(control(app, "Page settings and actions").waitForExistence(timeout: 20))
        pageMenu(app)
        let viewInAtlas = control(app, "View in Atlas")
        XCTAssertTrue(viewInAtlas.waitForExistence(timeout: 10))
        // Exercise Radix's menu typeahead; WebKit exposes transformed menu
        // bounds that XCTest's AppKit menu-hover heuristic cannot hit reliably.
        app.typeKey("v", modifierFlags: [])
        app.typeKey(.return, modifierFlags: [])
        waitUntil("View in Atlas returned to the dashboard") { app.tabs["Atlas"].isSelected }
        XCTAssertTrue(app.buttons["Open page"].waitForExistence(timeout: 20))
        let details = app.groups["Page details"]
        let collection = details.buttons.matching(NSPredicate(format: "title BEGINSWITH %@ OR label BEGINSWITH %@", "Connected collection", "Connected collection")).firstMatch
        XCTAssertTrue(collection.waitForExistence(timeout: 15))
        // WebKit can report clipped descendants as hittable. Scroll within the
        // inspector before activating the connection below its preview.
        details.scroll(byDeltaX: 0, deltaY: -240)
        collection.click()
        XCTAssertTrue(details.staticTexts.matching(NSPredicate(format: "title BEGINSWITH %@", "Connected collection")).firstMatch.waitForExistence(timeout: 15))
        details.scroll(byDeltaX: 0, deltaY: 700)
        XCTAssertTrue(app.buttons["Open page"].waitForExistence(timeout: 15))
        app.buttons["Open page"].click()
        waitUntil("The canonical Databases area opened") { app.tabs["Databases"].isSelected }
        XCTAssertTrue(app.buttons["New record"].waitForExistence(timeout: 20))
        let record = app.links.matching(NSPredicate(format: "title BEGINSWITH %@ OR label BEGINSWITH %@", "Shared record", "Shared record")).firstMatch
        XCTAssertTrue(record.waitForExistence(timeout: 15))
        record.click()
        XCTAssertTrue(control(app, "Page preview").waitForExistence(timeout: 20))
        try capture("native-atlas-record", app: app)
    }

    func waitUntil(_ description: String, _ condition: @escaping () -> Bool) {
        let expectation = XCTNSPredicateExpectation(predicate: NSPredicate { _,_ in condition() }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: 20), .completed, description)
    }

    func control(_ app: XCUIApplication, _ label: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label == %@ OR title == %@", label, label)).firstMatch
    }

    func pageMenu(_ app: XCUIApplication) {
        let button = control(app, "Page settings and actions")
        XCTAssertTrue(button.waitForExistence(timeout: 20))
        button.click()
    }

    func selectWorkspace(_ app: XCUIApplication) {
        XCTAssertTrue(app.popUpButtons["Workspace"].waitForExistence(timeout: 45))
        app.popUpButtons["Workspace"].click()
        let workspace = app.staticTexts["Mac native acceptance"]
        XCTAssertTrue(workspace.waitForExistence(timeout: 10))
        app.otherElements["Workspace"].scroll(byDeltaX: 0, deltaY: -620)
        workspace.click()
        XCTAssertTrue(app.checkBoxes["Edit layout"].waitForExistence(timeout: 30))
        waitUntil("Workspace document restored") { app.staticTexts["Saved to server"].exists || app.buttons["Use server version"].exists }
        // Only this synthetic fixture is shared with the Windows acceptance run.
        if app.buttons["Use server version"].exists {
            app.buttons["Use server version"].click()
            XCTAssertTrue(app.sheets.firstMatch.waitForExistence(timeout: 10))
            // Querying descendants of the synchronous WebKit confirm sheet can
            // stall the accessibility snapshot. Exercise its native keyboard actions.
            app.sheets.firstMatch.typeKey(.escape, modifierFlags: [])
            XCTAssertTrue(app.buttons["Use server version"].exists)
            app.buttons["Use server version"].click()
            XCTAssertTrue(app.sheets.firstMatch.waitForExistence(timeout: 10))
            app.sheets.firstMatch.typeKey(.return, modifierFlags: [])
        }
        XCTAssertTrue(app.staticTexts["Saved to server"].waitForExistence(timeout: 20))
    }

    func testFrameProfile() throws {
        continueAfterFailure = false
        let app = XCUIApplication(url: URL(fileURLWithPath: ProcessInfo.processInfo.environment["MONOLITH_UI_APP"]!))
        addTeardownBlock { try? self.capture("native-motion-latest", app: app); try? XCUIScreen.main.screenshot().pngRepresentation.write(to: self.output.appendingPathComponent("native-motion-screen.png")) }
        app.terminate()
        app.launchEnvironment["MONOLITH_PROFILE_FRAMES"] = "/Users/maxjafarov/Developer/monolith-native/.temp/motion-macos.ndjson"
        app.launch()
        let fixture = try JSONSerialization.jsonObject(with: Data(contentsOf: output.appendingPathComponent("fixture.json"))) as! [String:Any]
        if app.secureTextFields.firstMatch.waitForExistence(timeout: 8) {
            app.textFields.firstMatch.click()
            app.textFields.firstMatch.typeKey("a", modifierFlags: .command)
            app.textFields.firstMatch.typeText(fixture["email"] as! String)
            app.secureTextFields.firstMatch.click()
            app.secureTextFields.firstMatch.typeText(fixture["password"] as! String)
            app.buttons["Sign in"].click()
        }
        selectWorkspace(app)
        print("MOTION idle \(Date().timeIntervalSince1970)")
          Thread.sleep(forTimeInterval: 5)
          print("MOTION idle_end \(Date().timeIntervalSince1970)")
        app.checkBoxes["Edit layout"].click()
        let resize = app.buttons["Resize Workspace pulse"]
        let move = app.buttons["Move Workspace pulse"]
        XCTAssertTrue(resize.waitForExistence(timeout: 15))
        resize.doubleClick()
        let before = resize.frame.maxY - move.frame.minY
        print("MOTION resize \(Date().timeIntervalSince1970)")
        let start = resize.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        start.press(forDuration: 0.15, thenDragTo: start.withOffset(CGVector(dx: 0, dy: 100)), withVelocity: 50, thenHoldForDuration: 0.5)
          print("MOTION resize_end \(Date().timeIntervalSince1970)")
        waitUntil("Resize changes rendered height") { resize.frame.maxY - move.frame.minY > before + 70 }
        resize.doubleClick()
        let agenda = app.buttons["Move Action agenda"]
        print("MOTION drag \(Date().timeIntervalSince1970)")
        agenda.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).press(forDuration: 0.15, thenDragTo: move.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)), withVelocity: 100, thenHoldForDuration: 0.5)
          print("MOTION drag_end \(Date().timeIntervalSince1970)")
        waitUntil("Drag reorders widgets") { agenda.frame.minX < move.frame.minX }
        app.buttons["Undo layout change"].click()
        app.checkBoxes["Done"].click()
        print("MOTION scroll \(Date().timeIntervalSince1970)")
        for _ in 0..<4 { app.webViews.firstMatch.scroll(byDeltaX: 0, deltaY: -350); Thread.sleep(forTimeInterval: 0.3) }
        for _ in 0..<4 { app.webViews.firstMatch.scroll(byDeltaX: 0, deltaY: 350); Thread.sleep(forTimeInterval: 0.3) }
        Thread.sleep(forTimeInterval: 2)
        print("MOTION end \(Date().timeIntervalSince1970)")
        try capture("native-motion", app: app)
    }

    func testInstalledWindow() throws {
        continueAfterFailure = false
        let app = XCUIApplication(url: URL(fileURLWithPath: ProcessInfo.processInfo.environment["MONOLITH_UI_APP"]!))
        addTeardownBlock {
            try? self.capture("native-latest", app: app)
            if !self.control(app, "Page settings and actions").exists {
                try? XCUIScreen.main.screenshot().pngRepresentation.write(to: self.output.appendingPathComponent("native-startup-screen.png"))
            }
        }
        // Preserve local Keychain approvals when attaching to the installed app.
        // A cold restart is exercised explicitly after saving the widget layout.
        if app.state == .notRunning { app.launch() } else { app.activate() }
        XCTAssertTrue(app.windows.firstMatch.waitForExistence(timeout: 30))
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))
        if control(app, "Search settings").exists { app.typeKey(.escape, modifierFlags: []) }
        let fixture = try JSONSerialization.jsonObject(with: Data(contentsOf: output.appendingPathComponent("fixture.json"))) as! [String:Any]
        if !control(app, "Page settings and actions").exists {
            if app.buttons["Continue"].waitForExistence(timeout: 10) {
                let server = app.textFields.firstMatch
                server.click()
                server.typeKey("a", modifierFlags: .command)
                server.typeText(fixture["origin"] as! String)
                app.buttons["Continue"].click()
            }
            // A saved server can outlive its session after a development rebuild.
            if app.secureTextFields.firstMatch.waitForExistence(timeout: 15) {
                app.textFields.firstMatch.click()
                app.textFields.firstMatch.typeKey("a", modifierFlags: .command)
                app.textFields.firstMatch.typeText(fixture["email"] as! String)
                app.secureTextFields.firstMatch.click()
                app.secureTextFields.firstMatch.typeText(fixture["password"] as! String)
                app.buttons["Sign in"].click()
            }
        }
        XCTAssertTrue(control(app, "Page settings and actions").waitForExistence(timeout: 45))
        selectWorkspace(app)
        let edit = app.checkBoxes["Edit layout"]
        XCTAssertTrue(edit.waitForExistence(timeout: 30))
        XCTAssertLessThanOrEqual(app.popUpButtons["Desktop acceptance"].frame.maxY, app.windows.firstMatch.frame.maxY)
        XCTAssertTrue(control(app, "Search anything ⌘ K").exists)
        pageMenu(app)
        try capture("native-page-menu", app: app)
        if control(app, "Switch to light theme").exists { control(app, "Switch to light theme").click() } else { app.typeKey(.escape, modifierFlags: []) }
        app.buttons["New tab"].click()
        XCTAssertTrue(control(app, "Open").waitForExistence(timeout: 15))
        try capture("native-new-tab-search", app: app)
        control(app, "Open").click()
        let tabClose = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@ AND label ENDSWITH %@", "Close ", " tab")).element(boundBy: 1)
        XCTAssertTrue(tabClose.waitForExistence(timeout: 20))
        tabClose.click()
        XCTAssertTrue(edit.waitForExistence(timeout: 20))
        try capture("native-start", app: app)
        edit.click()
        try capture("native-edit", app: app)
        let resize = app.buttons["Resize Workspace pulse"]
        let move = app.buttons["Move Workspace pulse"]
        XCTAssertTrue(resize.waitForExistence(timeout: 15))
        resize.click()
        app.typeKey(.home, modifierFlags: [])
        let originalHeight = resize.frame.maxY - move.frame.minY
        resize.click()
        app.typeKey(.downArrow, modifierFlags: [])
        waitUntil("Keyboard resize adds 40 points") { abs(resize.frame.maxY - move.frame.minY - originalHeight - 40) < 2 }
        let start = resize.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        start.press(forDuration: 0.2, thenDragTo: start.withOffset(CGVector(dx: 0, dy: 60)))
        waitUntil("Pointer resize adds 60 points") { abs(resize.frame.maxY - move.frame.minY - originalHeight - 100) < 2 }
        let savedHeight = resize.frame.maxY - move.frame.minY
        try capture("native-resized", app: app)
        let agenda = app.buttons["Move Action agenda"]
        agenda.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).press(forDuration: 0.2, thenDragTo: move.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)))
        waitUntil("Pointer drag reorders widgets") { agenda.frame.minX < move.frame.minX }
        try capture("native-reordered", app: app)
        app.buttons["Undo layout change"].click()
        waitUntil("Undo restores order") { move.frame.minX < agenda.frame.minX }
        app.disclosureTriangles["Options for Workspace pulse"].click()
        try capture("native-options", app: app)
        app.typeKey(.escape, modifierFlags: [])
        app.checkBoxes["Done"].click()
        XCTAssertTrue(app.staticTexts["Saved to server"].waitForExistence(timeout: 20))
        app.terminate()
        app.launch()
        selectWorkspace(app)
        app.checkBoxes["Edit layout"].click()
        XCTAssertTrue(resize.waitForExistence(timeout: 15))
        waitUntil("Dimensions persist across native restart") { abs(resize.frame.maxY - move.frame.minY - savedHeight) < 2 }
        resize.doubleClick()
        app.checkBoxes["Done"].click()
        XCTAssertTrue(app.staticTexts["Saved to server"].waitForExistence(timeout: 20))
        pageMenu(app)
        control(app, "Switch to dark theme").click()
        pageMenu(app)
        XCTAssertTrue(control(app, "Switch to light theme").waitForExistence(timeout: 10))
        app.typeKey(.escape, modifierFlags: [])
        try capture("native-dark", app: app)
        pageMenu(app)
        control(app, "Switch to light theme").click()
        app.typeKey("k", modifierFlags: .command)
        XCTAssertTrue(control(app, "Search settings").waitForExistence(timeout: 15))
        waitUntil("Search keeps the selected workspace") {
            app.comboBoxes["Search"].placeholderValue?.contains("Mac native acceptance") == true
        }
        try capture("native-search", app: app)
        app.typeKey(.escape, modifierFlags: [])
        XCTAssertTrue(app.checkBoxes["Edit layout"].waitForExistence(timeout: 15))
        control(app, "Customize sidebar").click()
        XCTAssertTrue(app.staticTexts["Sidebar width"].waitForExistence(timeout: 15))
        XCTAssertTrue(control(app, "Compact navigation").exists)
        let settingsSearch = app.textFields["Search settings"]
        XCTAssertTrue(settingsSearch.exists)
        XCTAssertLessThanOrEqual(settingsSearch.frame.height, 40, "Settings search keeps its compact input height")
        try capture("native-workspace-settings", app: app)
        app.typeKey(.escape, modifierFlags: [])
        let window = app.windows.firstMatch
        let originalFrame = window.frame
        let titlebar = window.coordinate(withNormalizedOffset: CGVector(dx: 0.7, dy: 0)).withOffset(CGVector(dx: 0, dy: 18))
        titlebar.press(forDuration: 0.2, thenDragTo: titlebar.withOffset(CGVector(dx: 24, dy: 12)))
        waitUntil("Shared titlebar drags the native window") { abs(window.frame.minX - originalFrame.minX - 24) < 3 }
        let movedTitlebar = window.coordinate(withNormalizedOffset: CGVector(dx: 0.7, dy: 0)).withOffset(CGVector(dx: 0, dy: 18))
        movedTitlebar.press(forDuration: 0.2, thenDragTo: movedTitlebar.withOffset(CGVector(dx: -24, dy: -12)))
        let corner = window.coordinate(withNormalizedOffset: CGVector(dx: 1, dy: 1)).withOffset(CGVector(dx: -1, dy: -1))
        corner.press(forDuration: 0.2, thenDragTo: corner.withOffset(CGVector(dx: -640, dy: -130)))
        waitUntil("Native window resizes below tablet breakpoint") { window.frame.width < 800 }
        try capture("native-narrow", app: app)
        let smallCorner = window.coordinate(withNormalizedOffset: CGVector(dx: 1, dy: 1)).withOffset(CGVector(dx: -1, dy: -1))
        smallCorner.press(forDuration: 0.2, thenDragTo: smallCorner.withOffset(CGVector(dx: 640, dy: 130)))
        waitUntil("Native window returns to desktop width") { window.frame.width > 1300 }
        app.staticTexts["Workspace pulse"].scroll(byDeltaX: 0, deltaY: -500)
        try capture("native-scroll", app: app)
        app.webViews.firstMatch.scroll(byDeltaX: 0, deltaY: 620)
        try capture("native-final", app: app)
    }
}
