import AppKit
import WebKit
import UniformTypeIdentifiers
import MonolithHost

final class BundleScheme:NSObject,WKURLSchemeHandler {
 let root:URL
 init(root:URL){self.root=root}
 func webView(_ webView:WKWebView,start task:WKURLSchemeTask){
  guard let url=task.request.url else{task.didFailWithError(HostFailure("invalid_url","Invalid app asset"));return}
  do{let file=try BundleAssets.file(for:url,root:root);let data=try Data(contentsOf:file);let type=UTType(filenameExtension:file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
   let response=HTTPURLResponse(url:url,statusCode:200,httpVersion:"HTTP/1.1",headerFields:["Content-Type":type,"Content-Security-Policy":"default-src 'self'; script-src 'self' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https: monolith-media:; media-src 'self' blob: https: monolith-media:; font-src 'self' data:; connect-src 'self' https: wss: monolith-media:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-src 'none'"])!
   task.didReceive(response);task.didReceive(data);task.didFinish()
  }catch{task.didFailWithError(error)}
 }
 func webView(_ webView:WKWebView,stop task:WKURLSchemeTask){}
}
@MainActor final class MediaScheme:NSObject,WKURLSchemeHandler {
 let host:NativeHost
 var tasks:[ObjectIdentifier:Task<Void,Never>]=[:]
 init(host:NativeHost){self.host=host}
 func webView(_ webView:WKWebView,start task:WKURLSchemeTask){
  let id=ObjectIdentifier(task)
  tasks[id]=Task{
   defer{tasks.removeValue(forKey:id)}
   do{let(response,data)=try await host.media(task.request);guard !Task.isCancelled else{return};task.didReceive(response);task.didReceive(data);task.didFinish()}
   catch{if !Task.isCancelled{task.didFailWithError(error)}}
  }
 }
 func webView(_ webView:WKWebView,stop task:WKURLSchemeTask){tasks.removeValue(forKey:ObjectIdentifier(task))?.cancel()}
}
final class Bridge:NSObject,WKScriptMessageHandlerWithReply,WKNavigationDelegate,WKUIDelegate {
 let host:NativeHost
 init(host:NativeHost){self.host=host}
 func webView(_ webView:WKWebView,runJavaScriptConfirmPanelWithMessage message:String,initiatedByFrame frame:WKFrameInfo,completionHandler:@escaping(Bool)->Void){
  guard frame.isMainFrame,frame.request.url?.scheme=="monolith",frame.request.url?.host=="app",let window=webView.window else{completionHandler(false);return}
  let alert=NSAlert();alert.alertStyle = .warning;alert.messageText="Monolith";alert.informativeText=message
  alert.addButton(withTitle:"Continue");alert.addButton(withTitle:"Cancel")
  alert.beginSheetModal(for:window){response in completionHandler(response == .alertFirstButtonReturn)}
 }
 func userContentController(_ userContentController:WKUserContentController,didReceive message:WKScriptMessage,replyHandler:@escaping(Any?,String?)->Void){
  guard message.frameInfo.isMainFrame,message.frameInfo.request.url?.scheme=="monolith",message.frameInfo.request.url?.host=="app",let payload=message.body as? [String:Any],let operation=payload["operation"] as? String,let args=payload["args"] as? [String:Any] else{replyHandler(["error":HostFailure(403,"bridge_scope","Untrusted native call").json],nil);return}
  if operation == "windowControl" {
   guard let window=message.webView?.window,let action=args["action"] as? String else{replyHandler(["error":HostFailure("invalid_action","Window unavailable").json],nil);return}
   switch action {
   case "state": break
   case "minimize": window.miniaturize(nil)
   case "maximize": window.zoom(nil)
   case "close": window.performClose(nil)
   case "drag": if let event=NSApp.currentEvent,event.type == .leftMouseDown {window.performDrag(with:event)}
   default: replyHandler(["error":HostFailure("invalid_action","Unknown window action").json],nil);return
   }
   let background=window.isMiniaturized || !window.isVisible || (!NSApp.isActive && window.attachedSheet == nil)
   replyHandler(["value":["maximized":window.isZoomed,"background":background]],nil);return
  }
  Task{do{let value=try await host.execute(operation,args:args);replyHandler(["value":value],nil)}catch let e as HostFailure{replyHandler(["error":e.json],nil)}catch{replyHandler(["error":HostFailure("native_error",error.localizedDescription).json],nil)}}
 }
 func webView(_ webView:WKWebView,decidePolicyFor action:WKNavigationAction,decisionHandler:@escaping(WKNavigationActionPolicy)->Void){
  guard let url=action.request.url else{decisionHandler(.cancel);return}
  if url.scheme=="monolith" && url.host=="app"{decisionHandler(.allow);return}
  decisionHandler(.cancel)
  if ["https","http","mailto"].contains(url.scheme ?? ""){Task{_ = try? await host.execute("openExternal",args:["url":url.absoluteString])}}
 }
}
final class Application:NSObject,NSApplicationDelegate {
 var window:NSWindow!;var webView:WKWebView!;var bridge:Bridge!;var frameProfiler:FrameProfiler?
 func applicationDidFinishLaunching(_ notification:Notification){
  do{
   let host=try NativeHost();bridge=Bridge(host:host)
   let configuration=WKWebViewConfiguration();configuration.websiteDataStore = .nonPersistent()
   let refreshPolicy=DisplayRefreshPolicy.configure(configuration.preferences)
   if let path=ProcessInfo.processInfo.environment["MONOLITH_PROFILE_FRAMES"],let profiler=FrameProfiler(path:path){
    frameProfiler=profiler
    profiler.recordRefreshPolicy(refreshPolicy)
    configuration.userContentController.add(profiler,name:"motionFrames")
    configuration.userContentController.addUserScript(WKUserScript(source:FrameProfiler.script,injectionTime:.atDocumentEnd,forMainFrameOnly:true))
   }
   configuration.userContentController.addScriptMessageHandler(bridge,contentWorld:.page,name:"monolith")
   // WKWebView custom origins expose getRandomValues but may omit randomUUID.
   configuration.userContentController.addUserScript(WKUserScript(source:"if (!crypto.randomUUID) crypto.randomUUID = () => { const b = crypto.getRandomValues(new Uint8Array(16)); b[6]=(b[6]&15)|64; b[8]=(b[8]&63)|128; const h=Array.from(b,n=>n.toString(16).padStart(2,'0')).join(''); return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20); };",injectionTime:.atDocumentStart,forMainFrameOnly:true))
   let root=Bundle.main.resourceURL!.appendingPathComponent("web",isDirectory:true)
   configuration.setURLSchemeHandler(BundleScheme(root:root),forURLScheme:"monolith")
   configuration.setURLSchemeHandler(MediaScheme(host:host),forURLScheme:"monolith-media")
   webView=WKWebView(frame:.zero,configuration:configuration);webView.navigationDelegate=bridge;webView.uiDelegate=bridge
   window=NSWindow(contentRect:NSRect(x:0,y:0,width:1360,height:900),styleMask:[.titled,.closable,.miniaturizable,.resizable,.fullSizeContentView],backing:.buffered,defer:false)
   window.titleVisibility = .hidden;window.titlebarAppearsTransparent=true;window.isMovableByWindowBackground=false;window.toolbarStyle = .unifiedCompact
   window.title="Monolith";window.minSize=NSSize(width:480,height:560);window.contentView=webView;window.center();window.makeKeyAndOrderFront(nil)
   let menu=NSMenu();let appItem=NSMenuItem();menu.addItem(appItem);let appMenu=NSMenu();appMenu.addItem(withTitle:"Quit Monolith",action:#selector(NSApplication.terminate(_:)),keyEquivalent:"q");appItem.submenu=appMenu
   let editItem=NSMenuItem();menu.addItem(editItem);let editMenu=NSMenu(title:"Edit");for(title,selector,key)in[("Undo","undo:","z"),("Redo","redo:","Z"),("Cut","cut:","x"),("Copy","copy:","c"),("Paste","paste:","v"),("Select All","selectAll:","a")]{editMenu.addItem(withTitle:title,action:Selector(selector),keyEquivalent:key)};editItem.submenu=editMenu;NSApp.mainMenu=menu
   webView.load(URLRequest(url:URL(string:"monolith://app/")!));NSApp.activate(ignoringOtherApps:true)
  }catch{let alert=NSAlert();alert.messageText="Monolith could not open";alert.informativeText=error.localizedDescription;alert.runModal();NSApp.terminate(nil)}
 }
 func applicationShouldHandleReopen(_ sender:NSApplication,hasVisibleWindows flag:Bool)->Bool{window.makeKeyAndOrderFront(nil);return true}
 func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication)->Bool{true}
}
let application=NSApplication.shared
application.setActivationPolicy(.regular)
let delegate=Application();application.delegate=delegate;application.run()
