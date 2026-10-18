import XCTest
import CryptoKit
import Security
@testable import MonolithHost
final class HostTests:XCTestCase {
 func testBundledRootWithRelativeBase()throws {
  let base=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString,isDirectory:true)
  let root=URL(string:"Contents/Resources/web/",relativeTo:base)!
  try FileManager.default.createDirectory(at:root,withIntermediateDirectories:true)
  defer{try? FileManager.default.removeItem(at:base)}
  let index=root.appendingPathComponent("index.html"),script=root.appendingPathComponent("main.js")
  try Data("<html></html>".utf8).write(to:index)
  try Data("export {}".utf8).write(to:script)
  for route in ["monolith://app/","monolith://app/dashboard"] {
   XCTAssertEqual(try BundleAssets.file(for:URL(string:route)!,root:root).path,index.path)
  }
  XCTAssertEqual(try BundleAssets.file(for:URL(string:"monolith://app/main.js")!,root:root).path,script.path)
  for route in ["monolith://other/","https://app/","monolith://app/../outside","monolith://app/%2e%2e/outside"] {
   XCTAssertThrowsError(try BundleAssets.file(for:URL(string:route)!,root:root))
  }
 }
 func testWidgetLayoutBounds() {
  func snapshot(_ config:[String:Any])->[String:Any] { ["blocks":["flavour":"monolith:module","props":["config":config],"children":[]]] }
  let valid:[[String:Any]] = [[:],["width":"half","height":420],["width":"full","height":0]]
  let invalid:[[String:Any]] = [["height":1001],["height":-1],["height":true],["height":"420"],["width":"screen"]]
  for config in valid { XCTAssertTrue(WidgetLayout.valid(snapshot(config))) }
  for config in invalid { XCTAssertFalse(WidgetLayout.valid(snapshot(config))) }
 }
 func testOriginPolicy()throws{
  XCTAssertEqual(try OriginPolicy.origin("example.ts.net").absoluteString,"https://example.ts.net")
  for value in ["http://example.com","https://user:password@example.com","https://example.com/path","https://example.com?token=secret"]{XCTAssertThrowsError(try OriginPolicy.origin(value))}
  for value in ["//evil.test/api","/\\evil.test/api","https://evil.test/api"]{XCTAssertThrowsError(try OriginPolicy.request("https://example.com",value))}
 }
 func testEncryptedAtomicDraft()throws{
  let folder=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString),file=folder.appendingPathComponent("draft")
  defer{try? FileManager.default.removeItem(at:folder)}
  let key=SymmetricKey(size:.bits256),data=Data("local recovery".utf8)
  let ciphertext=try SecureStore.seal(data,key:key);XCTAssertNotEqual(ciphertext,data)
  try SecureStore.atomic(ciphertext,to:file);XCTAssertEqual(try SecureStore.open(Data(contentsOf:file),key:key),data)
  XCTAssertThrowsError(try SecureStore.open(ciphertext,key:SymmetricKey(size:.bits256)))
 }
 func testKeychainRoundTrip()throws{
  // Scope the integration test to its own keychain; never unlock or alter the user's login keychain.
  let folder=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
  try FileManager.default.createDirectory(at:folder,withIntermediateDirectories:true)
  defer{try? FileManager.default.removeItem(at:folder)}
  let password=UUID().uuidString
  var keychain:SecKeychain?
  let status=SecKeychainCreate(folder.appendingPathComponent("test.keychain").path,UInt32(password.utf8.count),password,false,nil,&keychain)
  XCTAssertEqual(status,errSecSuccess)
  let store=try XCTUnwrap(keychain)
  defer{SecKeychainDelete(store)}
  let id="test:"+UUID().uuidString
  XCTAssertNil(try SecureStore.read(id,keychain:store))
  try SecureStore.write(id,Data("refresh-only-native".utf8),keychain:store);XCTAssertEqual(try SecureStore.read(id,keychain:store),Data("refresh-only-native".utf8))
  try SecureStore.write(id,Data("rotated".utf8),keychain:store);XCTAssertEqual(try SecureStore.read(id,keychain:store),Data("rotated".utf8))
  try SecureStore.write(id,nil,keychain:store);XCTAssertNil(try SecureStore.read(id,keychain:store))
 }
}
