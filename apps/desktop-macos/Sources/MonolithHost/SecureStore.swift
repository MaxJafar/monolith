import Foundation
import Security
import CryptoKit

public struct HostFailure: Error {
 public let status: Int
 public let code: String
 public let message: String
 public init(_ status: Int = 0, _ code: String, _ message: String) { self.status=status;self.code=code;self.message=message }
 public init(_ code: String, _ message: String) { self.init(0,code,message) }
 public var json: [String:Any] { ["status":status,"code":code,"message":message] }
}
public enum SecureStore {
 static let service = "app.monolith.desktop"
 static func query(_ key:String) -> [String:Any] { [kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:service,kSecAttrAccount as String:key] }
 public static func read(_ key:String, keychain:SecKeychain? = nil) throws -> Data? {
  var q=query(key);q[kSecReturnData as String]=true;q[kSecMatchLimit as String]=kSecMatchLimitOne
  if let keychain { q[kSecMatchSearchList as String]=[keychain] }
  var result:CFTypeRef?;let status=SecItemCopyMatching(q as CFDictionary,&result)
  if status==errSecItemNotFound{return nil};guard status==errSecSuccess,let data=result as? Data else{throw HostFailure("storage","Keychain is unavailable")};return data
 }
 public static func write(_ key:String,_ data:Data?, keychain:SecKeychain? = nil) throws {
  var q=query(key)
  if let keychain { q[kSecMatchSearchList as String]=[keychain] }
  guard let data else {let status=SecItemDelete(q as CFDictionary);guard status==errSecSuccess || status==errSecItemNotFound else{throw HostFailure("storage","Keychain removal failed")};return}
  let update=SecItemUpdate(q as CFDictionary,[kSecValueData as String:data] as CFDictionary)
  if update==errSecSuccess{return};guard update==errSecItemNotFound else{throw HostFailure("storage","Keychain update failed")}
  var insertion=query(key);insertion[kSecValueData as String]=data;insertion[kSecAttrAccessible as String]=kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
  if let keychain { insertion[kSecUseKeychain as String]=keychain }
  let status=SecItemAdd(insertion as CFDictionary,nil)
  guard status==errSecSuccess else{throw HostFailure("storage","Keychain write failed (\(status)). Unlock your login keychain and try again.")}
 }
 public static func digest(_ value:String)->String { SHA256.hash(data:Data(value.utf8)).map{String(format:"%02x",$0)}.joined() }
 public static func atomic(_ data:Data,to url:URL) throws {
  try FileManager.default.createDirectory(at:url.deletingLastPathComponent(),withIntermediateDirectories:true,attributes:[.posixPermissions:0o700])
  // Foundation .atomic writes a sibling temporary file and renames it.
  try data.write(to:url,options:[.atomic]);try FileManager.default.setAttributes([.posixPermissions:0o600],ofItemAtPath:url.path)
  let file=try FileHandle(forWritingTo:url);try file.synchronize();try file.close()
 }
 public static func seal(_ data:Data,key:SymmetricKey)throws->Data {guard let sealed=try AES.GCM.seal(data,using:key).combined else{throw HostFailure("storage","Draft encryption failed")};return sealed}
 public static func open(_ data:Data,key:SymmetricKey)throws->Data {try AES.GCM.open(AES.GCM.SealedBox(combined:data),using:key)}
}
