import Foundation
import CryptoKit

actor UpdateSupervisor {
 private let directory:URL
 private let network:URLSession
 private let delegate=NoRedirect()
 init(directory:URL) {
  self.directory=directory.appendingPathComponent("updates",isDirectory:true)
  let config=URLSessionConfiguration.ephemeral;config.timeoutIntervalForRequest=5;config.timeoutIntervalForResource=6
  network=URLSession(configuration:config,delegate:delegate,delegateQueue:nil)
 }
 private func endpoint()throws->(URL,String) {
  let data=try Data(contentsOf:directory.appendingPathComponent("endpoint.json"))
  guard let value=try JSONSerialization.jsonObject(with:data) as? [String:Any],let raw=value["url"] as? String,let url=URL(string:raw),url.scheme=="http",url.host=="127.0.0.1",url.port != nil,url.user==nil,url.password==nil,url.query==nil,url.fragment==nil,["","/"].contains(url.path),let token=value["token"] as? String,token.count==48 else{throw HostFailure("updates","Invalid updater endpoint")}
  return(url,token)
 }
 private func send(_ endpoint:(URL,String),_ action:String,_ body:Any?=nil)async throws->[String:Any] {
  var request=URLRequest(url:endpoint.0.appendingPathComponent(action));request.httpMethod=action=="status" ? "GET":"POST"
  request.setValue("Bearer "+endpoint.1,forHTTPHeaderField:"Authorization")
  if let body{request.httpBody=try JSONSerialization.data(withJSONObject:body);request.setValue("application/json",forHTTPHeaderField:"Content-Type")}
  let(data,response)=try await network.data(for:request)
  guard data.count<1_000_000,let response=response as? HTTPURLResponse,let value=try JSONSerialization.jsonObject(with:data) as? [String:Any] else{throw HostFailure("updates","Invalid updater response")}
  guard (200..<300).contains(response.statusCode) else{throw HostFailure("updates",value["error"] as? String ?? "The update operation failed")};return value
 }
 private func ensure()async throws->(URL,String) {
  if let current=try? endpoint(),(try? await send(current,"status")) != nil{return current}
  guard let resources=Bundle.main.resourceURL else{throw HostFailure("updates","Update resources unavailable")}
  let settings=resources.appendingPathComponent("updater/settings.json")
  guard let data=try? Data(contentsOf:settings),let config=try JSONSerialization.jsonObject(with:data) as? [String:Any],(config["version"] as? String)==(Bundle.main.object(forInfoDictionaryKey:"MonolithReleaseVersion") as? String) else{throw HostFailure("updates","Desktop and updater release versions do not match")}
  let source=resources.appendingPathComponent("updater/monolith-updater")
  let bytes=try Data(contentsOf:source),digest=SHA256.hash(data:bytes).map{String(format:"%02x",$0)}.joined()
  let folder=directory.appendingPathComponent("agents/"+digest,isDirectory:true),helper=folder.appendingPathComponent("monolith-updater")
  try FileManager.default.createDirectory(at:folder,withIntermediateDirectories:true,attributes:[.posixPermissions:0o700])
  if !FileManager.default.fileExists(atPath:helper.path){try bytes.write(to:helper,options:.atomic);try FileManager.default.setAttributes([.posixPermissions:0o700],ofItemAtPath:helper.path)}
  let process=Process();process.executableURL=helper;process.arguments=["--config",settings.path,"--state",directory.path,"--install",Bundle.main.bundleURL.path,"--parent",String(ProcessInfo.processInfo.processIdentifier)]
  process.standardInput=FileHandle.nullDevice;process.standardOutput=FileHandle.nullDevice;process.standardError=FileHandle.nullDevice;try process.run()
  let deadline=Date().addingTimeInterval(20)
  while Date()<deadline { if let current=try? endpoint(),(try? await send(current,"status")) != nil{return current};try await Task.sleep(nanoseconds:200_000_000) }
  throw HostFailure("updates","The update supervisor did not start")
 }
 func execute(action:String,preferences:Any?=nil)async throws->[String:Any] {
  guard ["status","check","download","install","rollback","settings","ready"].contains(action)else{throw HostFailure(400,"invalid_request","Unknown update action")}
  let address=try await ensure()
  let body:Any?=action=="ready" ? ["version":Bundle.main.object(forInfoDictionaryKey:"MonolithReleaseVersion") as? String ?? "","pid":Int(ProcessInfo.processInfo.processIdentifier)] : preferences
  let reply=try await send(address,action,body)
  if action=="install" {
   let deadline=Date().addingTimeInterval(180)
   while Date()<deadline {
    let status=try await send(address,"status"),phase=status["phase"] as? String
    if phase=="installing"{return status}
    if phase=="failed" || phase=="rolledBack"{throw HostFailure("updates",status["error"] as? String ?? "Update preparation failed")}
    try await Task.sleep(nanoseconds:200_000_000)
   }
   throw HostFailure("updates","Update preparation timed out; Monolith remains open")
  }
  return reply
 }
}
