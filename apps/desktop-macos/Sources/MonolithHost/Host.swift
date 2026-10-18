import Foundation
import CryptoKit
import AppKit

public enum OriginPolicy {
 public static func origin(_ input:String)throws->URL {
  let value=input.trimmingCharacters(in:.whitespacesAndNewlines)
  guard let url=URL(string:value.contains("://") ? value : "https://"+value), url.scheme=="https", url.host != nil,url.user==nil,url.password==nil,url.query==nil,url.fragment==nil,["","/"].contains(url.path) else{throw HostFailure("invalid_url","Enter an HTTPS server address without a path")}
  var parts=URLComponents(url:url,resolvingAgainstBaseURL:false)!;parts.path="";return parts.url!
 }
 public static func request(_ origin:String,_ path:String)throws->URL {
  let base=try self.origin(origin)
  guard path.hasPrefix("/"),!path.hasPrefix("//"),!path.contains("\\"),let url=URL(string:path,relativeTo:base)?.absoluteURL,url.scheme==base.scheme,url.host==base.host,url.port==base.port else{throw HostFailure(400,"invalid_request","Request origin is not permitted")};return url
 }
}
final class NoRedirect: NSObject, URLSessionTaskDelegate {
 func urlSession(_ session:URLSession,task:URLSessionTask,willPerformHTTPRedirection response:HTTPURLResponse,newRequest request:URLRequest,completionHandler:@escaping(URLRequest?)->Void){completionHandler(nil)}
}
actor Gate {
 private var locked=false;private var waiting:[CheckedContinuation<Void,Never>]=[]
 func lock()async{if !locked{locked=true;return};await withCheckedContinuation{waiting.append($0)}}
 func unlock(){if waiting.isEmpty{locked=false}else{waiting.removeFirst().resume()}}
}
struct Profile: Codable, Equatable {
 var origin:String;var serverId:String;var accountId:String;var sessionId:String
 var json:[String:Any]{["origin":origin,"serverId":serverId,"accountId":accountId,"sessionId":sessionId]}
 var credential:String{"refresh:\(serverId):\(accountId)"}
}
public actor NativeHost {
 private let directory:URL;private let network:URLSession;private let delegate=NoRedirect();private let auth=Gate();private let updater:UpdateSupervisor
 private var profile:Profile?;private var selected:(String,[String:Any])?;private var access="";private var epoch=0
 public init(directory:URL?=nil)throws {
  self.directory=try directory ?? FileManager.default.url(for:.applicationSupportDirectory,in:.userDomainMask,appropriateFor:nil,create:true).appendingPathComponent("app.monolith.desktop",isDirectory:true)
  self.updater=UpdateSupervisor(directory:self.directory)
  if let data=try? Data(contentsOf:self.directory.appendingPathComponent("profile.json")),let saved=try? JSONDecoder().decode(Profile.self,from:data),(try? OriginPolicy.origin(saved.origin)) != nil{profile=saved}
  let config=URLSessionConfiguration.ephemeral;config.httpShouldSetCookies=false;config.urlCache=nil;config.requestCachePolicy = .reloadIgnoringLocalCacheData;config.timeoutIntervalForRequest=25;config.timeoutIntervalForResource=30
  network=URLSession(configuration:config,delegate:delegate,delegateQueue:nil)
 }
 private func string(_ data:[String:Any],_ key:String)throws->String{guard let value=data[key] as? String else{throw HostFailure(400,"invalid_request","Missing request field")};return value}
 private func active()throws->Profile{guard let profile else{throw HostFailure(401,"expired","Sign in again")};return profile}
 private func send(_ url:URL,method:String="GET",body:Data?=nil,headers:[String:String]=[:],token:String?=nil)async throws->(HTTPURLResponse,Data){
  var request=URLRequest(url:url);request.httpMethod=method;request.httpBody=body;request.allHTTPHeaderFields=headers
  if let token{request.setValue("Bearer "+token,forHTTPHeaderField:"Authorization")}
  do{let(data,response)=try await network.data(for:request);guard let http=response as? HTTPURLResponse else{throw HostFailure("incompatible","Invalid server response")}
   guard !(300..<400).contains(http.statusCode)else{throw HostFailure("redirect","Server redirects are not permitted")}
   guard data.count<=24_000_000 else{throw HostFailure(413,"response_too_large","Response exceeds the desktop transfer limit")};return(http,data)
  }catch let error as URLError{let code:String;switch error.code{case .timedOut:code="timeout";case .cannotFindHost,.dnsLookupFailed:code="dns";case .serverCertificateHasBadDate,.serverCertificateUntrusted,.serverCertificateHasUnknownRoot,.serverCertificateNotYetValid,.secureConnectionFailed:code="certificate";default:code="offline"};throw HostFailure(code,error.localizedDescription)}
 }
 private func json(_ url:URL,method:String="GET",body:Any?=nil,token:String?=nil)async throws->[String:Any]{
  let data=try body.map{try JSONSerialization.data(withJSONObject:$0)}
  let(response,bytes)=try await send(url,method:method,body:data,headers:body==nil ? [:]:["Content-Type":"application/json"],token:token)
  let result=bytes.isEmpty ? [:] : (try JSONSerialization.jsonObject(with:bytes) as? [String:Any] ?? [:])
  if response.statusCode>=400{throw HostFailure(response.statusCode,result["code"] as? String ?? "request_failed",result["message"] as? String ?? "Request failed")};return result
 }
 private func commit(_ tokens:[String:Any],origin:String,discovery:[String:Any])throws->[String:Any]{
  let next=try Profile(origin:origin,serverId:string(discovery,"serverId"),accountId:string(tokens,"accountId"),sessionId:string(tokens,"sessionId"))
  guard [next.serverId,next.accountId,next.sessionId].allSatisfy({UUID(uuidString:$0) != nil})else{throw HostFailure("incompatible","Invalid server identity")}
  if let previous=profile,previous.serverId != next.serverId || previous.accountId != next.accountId{try assertClean(previous);try SecureStore.write(previous.credential,nil)}
  let refresh=try string(tokens,"refreshToken"),token=try string(tokens,"accessToken")
  try SecureStore.write(next.credential,Data(refresh.utf8));try SecureStore.atomic(try JSONEncoder().encode(next),to:directory.appendingPathComponent("profile.json"))
  if profile != next{epoch+=1};profile=next;selected=(origin,discovery);access=token;return["profile":next.json,"accessToken":token]
 }
 private func folder(_ p:Profile)->URL{directory.appendingPathComponent("drafts/"+SecureStore.digest(p.serverId+":"+p.accountId),isDirectory:true)}
 private func path(_ p:Profile,_ key:String)throws->URL{
  guard let data=key.data(using:.utf8),let parts=try JSONSerialization.jsonObject(with:data) as? [String],parts.count==5,parts[0]==p.serverId,parts[1]==p.accountId,UUID(uuidString:parts[2]) != nil,["page","record","note"].contains(parts[3]),UUID(uuidString:parts[4]) != nil else{throw HostFailure(403,"draft_scope","Draft identity does not belong to this account")}
  return folder(p).appendingPathComponent(SecureStore.digest(key)+".draft")
 }
 private func key(_ p:Profile)throws->SymmetricKey{
  let id="draft-key:"+p.serverId+":"+p.accountId
  if let data=try SecureStore.read(id){guard data.count==32 else{throw HostFailure("storage","Invalid draft key")};return SymmetricKey(data:data)}
  let key=SymmetricKey(size:.bits256);try key.withUnsafeBytes{try SecureStore.write(id,Data($0))};return key
 }
 private func read(_ url:URL,_ p:Profile)throws->String?{
  guard FileManager.default.fileExists(atPath:url.path)else{return nil}
  let bytes=try SecureStore.open(Data(contentsOf:url),key:key(p));guard let value=String(data:bytes,encoding:.utf8)else{throw HostFailure("storage","Invalid local draft")};return value
 }
 private func drafts(_ p:Profile)throws->[String]{
  let folder=folder(p);guard FileManager.default.fileExists(atPath:folder.path)else{return []}
  return try FileManager.default.contentsOfDirectory(at:folder,includingPropertiesForKeys:nil).filter{$0.pathExtension=="draft"}.compactMap{try read($0,p)}
 }
 public func execute(_ operation:String,args:[String:Any])async throws->Any{
  let serialized=["connect","login","totp","refresh","signOut"].contains(operation)
  if serialized{await auth.lock()}
  do{let result=try await perform(operation,args:args);if serialized{await auth.unlock()};return result}catch{if serialized{await auth.unlock()};throw error}
 }
 public func media(_ request:URLRequest)async throws->(HTTPURLResponse,Data){
  let p=try active(),version=epoch
  guard let local=request.url,local.host=="app",local.path=="/\(p.serverId)/\(p.accountId)/files/get",request.httpMethod==nil || request.httpMethod=="GET" else{throw HostFailure(403,"request_scope","Media does not belong to this account")}
  let remote=try OriginPolicy.request(p.origin,"/api/files/get?"+(local.query ?? ""))
  let headers=request.value(forHTTPHeaderField:"Range").map{["Range":$0]} ?? [:]
  var result=try await send(remote,headers:headers,token:access)
  if result.0.statusCode==401{
   await auth.lock()
   do{guard epoch==version else{throw HostFailure(401,"expired","Connection changed")};_ = try await perform("refresh",args:[:]);await auth.unlock()}catch{await auth.unlock();throw error}
   result=try await send(remote,headers:headers,token:access)
  }
  guard epoch==version else{throw HostFailure(401,"expired","Connection changed")}
  var responseHeaders=["Cache-Control":"no-store","Access-Control-Allow-Origin":"monolith://app"]
  for(key,value)in result.0.allHeaderFields{let name=String(describing:key);if ["content-type","content-range","accept-ranges"].contains(name.lowercased()){responseHeaders[name]=String(describing:value)}}
  return (HTTPURLResponse(url:local,statusCode:result.0.statusCode,httpVersion:"HTTP/1.1",headerFields:responseHeaders)!,result.1)
 }
 private func perform(_ operation:String,args:[String:Any])async throws->Any{
  switch operation{
  case "updates":
   let action=try string(args,"action")
   if action=="install" || action=="rollback",let p=profile{try assertClean(p)}
   let result=try await updater.execute(action:action,preferences:args["preferences"])
   if action=="install" || action=="rollback" {
    if let p=profile{try assertClean(p)}
    await MainActor.run{NSApplication.shared.terminate(nil)}
   }
   return result
  case "profile":return profile?.json as Any? ?? NSNull()
  case "connect":
   let origin=try OriginPolicy.origin(string(args,"url")).absoluteString
   let discovery=try await json(OriginPolicy.request(origin,"/.well-known/monolith"))
   guard discovery["apiVersion"] as? Int==1,discovery["editorVersion"] as? Int==2,(discovery["capabilities"] as? [String])?.contains("device-sessions")==true,let id=discovery["serverId"] as? String,UUID(uuidString:id) != nil else{throw HostFailure("incompatible","This server is incompatible with Monolith")}
   if let p=profile {
    if p.origin==origin && p.serverId != id{throw HostFailure("incompatible","The server identity changed")}
    if p.origin != origin{try assertClean(p);try SecureStore.write(p.credential,nil);try? FileManager.default.removeItem(at:directory.appendingPathComponent("profile.json"));profile=nil;access="";epoch+=1}
   }
   selected=(origin,discovery);return discovery
  case "login","totp","refresh":
   guard let(origin,discovery)=selected else{throw HostFailure("incompatible","Verify the server first")}
   var path="/api/v1/device-sessions",body:Any=args["credentials"] ?? [:]
   if operation=="totp"{path+="/totp";body=["challenge":try string(args,"challenge"),"code":try string(args,"code")]}
   if operation=="refresh"{let p=try active();guard let data=try SecureStore.read(p.credential),let refresh=String(data:data,encoding:.utf8)else{throw HostFailure(401,"expired","Sign in again")};path+="/refresh";body=["refreshToken":refresh]}
   let tokens=try await json(OriginPolicy.request(origin,path),method:"POST",body:body)
   if tokens["state"] as? String=="totp_required"{return tokens}
   if let p=profile, tokens["accountId"] as? String != p.accountId{try assertClean(p)}
   return try commit(tokens,origin:origin,discovery:discovery)
  case "request":
   guard let request=args["request"] as? [String:Any]else{throw HostFailure(400,"invalid_request","Missing request")}
   let p=try active(),version=epoch,url=try OriginPolicy.request(p.origin,string(request,"path")),method=request["method"] as? String ?? "GET"
   guard url.path.hasPrefix("/api/"),url.path != "/api/v1/bootstrap",["GET","POST","PUT","PATCH","DELETE","HEAD"].contains(method),(!url.path.contains("/device-sessions") || ["GET","DELETE"].contains(method)) else{throw HostFailure(403,"request_scope","Request is not permitted")}
   var headers:[String:String]=[:];for(k,v)in request["headers"] as? [String:String] ?? [:]{if["content-type","accept","if-match","range","x-monolith-key","x-monolith-package-names"].contains(k.lowercased()){headers[k]=v}}
   let raw=request["body"] as? String;let body=request["bodyEncoding"] as? String=="base64" ? raw.flatMap{Data(base64Encoded:$0)} : raw.map{Data($0.utf8)}
   guard (body?.count ?? 0)<=24_000_000 else{throw HostFailure(413,"request_too_large","Request exceeds the desktop transfer limit")}
   let(response,bytes)=try await send(url,method:method,body:body,headers:headers,token:access)
   guard epoch==version else{throw HostFailure(401,"expired","Connection changed")}
   let text=String(data:bytes,encoding:.utf8)
   return["status":response.statusCode,"body":text ?? bytes.base64EncodedString(),"encoding":text==nil ? "base64":"utf8","headers":response.allHeaderFields.reduce(into:[String:String]()){result,item in let k=String(describing:item.key).lowercased();if["content-type","etag","content-disposition","content-range","x-monolith-downloadable"].contains(k){result[k]=String(describing:item.value)}}] as [String:Any]
  case "listDrafts":return try drafts(active())
  case "readDraft","writeDraft","removeDraft":
   let p=try active(),identity=try string(args,"key"),url=try path(p,identity),old=try read(url,p)
   if operation=="readDraft"{return old as Any? ?? NSNull()}
   let previous=try old.map{try JSONSerialization.jsonObject(with:Data($0.utf8)) as? [String:Any]}
   let version=previous??["version"] as? Int,expected=args["expectedVersion"] as? Int
   guard version==expected else{throw HostFailure(409,"draft_conflict","This draft changed in another window")}
   if operation=="removeDraft"{if old != nil{try FileManager.default.removeItem(at:url)};return NSNull()}
   let value=try string(args,"value");guard value.utf8.count<6_000_000,let draft=try JSONSerialization.jsonObject(with:Data(value.utf8)) as? [String:Any],let source=draft["source"] as? [String:Any],let snapshot=draft["snapshot"] as? [String:Any],let meta=snapshot["meta"] as? [String:Any],let parts=try JSONSerialization.jsonObject(with:Data(identity.utf8)) as? [String],draft["formatVersion"] as? Int==1,draft["serverId"] as? String==parts[0],draft["accountId"] as? String==parts[1],draft["workspaceId"] as? String==parts[2],source["kind"] as? String==parts[3],source["id"] as? String==parts[4],meta["id"] as? String==parts[4],(draft["version"] as? Int ?? 0)>(version ?? 0),draft["dirty"] is Bool else{throw HostFailure(400,"invalid_draft","Draft validation failed")}
   guard WidgetLayout.valid(snapshot) else { throw HostFailure(400,"invalid_draft","Widget layout is invalid") }
   try SecureStore.atomic(SecureStore.seal(Data(value.utf8),key:key(p)),to:url);return NSNull()
  case "signOut":
   let p=try active();try assertClean(p)
   let revoke=try OriginPolicy.request(p.origin,"/api/v1/device-sessions/"+p.sessionId)
   do{_ = try await json(revoke,method:"DELETE",token:access)}catch let e as HostFailure{
    if e.status != 401{throw e}
    do{_ = try await perform("refresh",args:[:]);_ = try await json(revoke,method:"DELETE",token:access)}catch let refreshError as HostFailure{if refreshError.status != 401{throw refreshError}}
   }
   try assertClean(p)
   try SecureStore.write(p.credential,nil);try? FileManager.default.removeItem(at:directory.appendingPathComponent("profile.json"));profile=nil;access="";epoch+=1;return NSNull()
  case "openExternal":
   guard let url=URL(string:try string(args,"url")),["https","http","mailto"].contains(url.scheme ?? ""),url.user==nil,url.password==nil else{throw HostFailure(400,"invalid_url","Unsafe external link")}
   await MainActor.run{_ = NSWorkspace.shared.open(url)};return NSNull()
  case "saveFile":
   let name=try string(args,"name"),content=try string(args,"content")
   guard !name.contains("/"),!name.contains("\\"),!name.contains(":"),content.utf8.count<24_000_000 else{throw HostFailure(400,"invalid_request","Invalid export")}
   let target=await MainActor.run{()->URL? in let panel=NSSavePanel();panel.nameFieldStringValue=name;return panel.runModal() == .OK ? panel.url:nil}
   if let target{try SecureStore.atomic(Data(content.utf8),to:target)};return NSNull()
  default:throw HostFailure(400,"invalid_request","Unknown native operation")
  }
 }
 private func assertClean(_ p:Profile)throws {for raw in try drafts(p){if let draft=try JSONSerialization.jsonObject(with:Data(raw.utf8)) as? [String:Any],draft["dirty"] as? Bool==true{throw HostFailure(409,"unsaved_drafts","Resolve unsaved drafts before signing out")}}}
}

