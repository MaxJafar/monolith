// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "Monolith", platforms: [.macOS(.v14)], products: [.executable(name: "Monolith", targets: ["Monolith"])], targets: [.target(name: "MonolithHost"), .executableTarget(name: "Monolith", dependencies: ["MonolithHost"]), .testTarget(name: "MonolithHostTests", dependencies: ["MonolithHost"])], swiftLanguageVersions: [.v5])
