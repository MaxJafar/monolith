import AppKit
import WebKit
import ObjectiveC.runtime

/// The distributed desktop build can use WebKit's native high-refresh scheduler.
/// This is an optional private preference, not a replacement animation clock.
/// App Store builds must omit it until WebKit offers a public equivalent.
enum DisplayRefreshPolicy {
    static func configure(_ preferences: WKPreferences) -> String {
        #if MONOLITH_APP_STORE
        return "system"
        #else
        guard ProcessInfo.processInfo.environment["MONOLITH_SYSTEM_REFRESH_POLICY"] != "1" else { return "system" }
        let listSelector = NSSelectorFromString("_features")
        let setSelector = NSSelectorFromString("_setEnabled:forFeature:")
        let getSelector = NSSelectorFromString("_isEnabledForFeature:")
        guard let listMethod = class_getClassMethod(WKPreferences.self, listSelector),
              let setMethod = class_getInstanceMethod(WKPreferences.self, setSelector),
              let getMethod = class_getInstanceMethod(WKPreferences.self, getSelector),
              method_getNumberOfArguments(listMethod) == 2,
              method_getNumberOfArguments(setMethod) == 4,
              method_getNumberOfArguments(getMethod) == 3 else { return "unavailable" }
        typealias List = @convention(c) (AnyClass, Selector) -> Unmanaged<AnyObject>
        typealias SetFeature = @convention(c) (AnyObject, Selector, ObjCBool, AnyObject) -> Void
        typealias GetFeature = @convention(c) (AnyObject, Selector, AnyObject) -> ObjCBool
        let list = unsafeBitCast(method_getImplementation(listMethod), to: List.self)
        let set = unsafeBitCast(method_getImplementation(setMethod), to: SetFeature.self)
        let get = unsafeBitCast(method_getImplementation(getMethod), to: GetFeature.self)
        guard let features = list(WKPreferences.self, listSelector).takeUnretainedValue() as? [NSObject] else { return "unavailable" }
        let keySelector = NSSelectorFromString("key")
        guard let feature = features.first(where: {
            $0.responds(to: keySelector) && ($0.perform(keySelector)?.takeUnretainedValue() as? String) == "PreferPageRenderingUpdatesNear60FPSEnabled"
        }) else { return "unavailable" }
        set(preferences, setSelector, false, feature)
        return get(preferences, getSelector, feature).boolValue ? "system" : "display"
        #endif
    }
}
