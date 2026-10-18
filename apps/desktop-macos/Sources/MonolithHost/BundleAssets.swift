import Foundation

public enum BundleAssets {
 public static func file(for url:URL,root:URL)throws->URL {
  guard url.scheme=="monolith",url.host=="app" else{throw HostFailure("invalid_url","Invalid app asset")}
  // Bundle resource URLs can retain a base URL. URL equality then differs even
  // when absoluteString is identical; compare normalized file paths instead.
  let base=root.standardizedFileURL
  let path=base.appendingPathComponent(url.path).standardizedFileURL
  guard path.path==base.path || path.path.hasPrefix(base.path+"/") else{throw HostFailure("invalid_url","Invalid asset path")}
  var directory:ObjCBool=false
  if FileManager.default.fileExists(atPath:path.path,isDirectory:&directory),!directory.boolValue{return path}
  return base.appendingPathComponent("index.html")
 }
}
