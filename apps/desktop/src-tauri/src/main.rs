#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod secure;
mod widgets;
mod updates;
use base64::{Engine, engine::general_purpose::STANDARD};
use serde::{Deserialize,Serialize};
use serde_json::{Value,json};
use sha2::{Digest,Sha256};
use std::{collections::BTreeMap,fs,path::PathBuf,sync::Mutex,time::Duration};
use tauri::{Manager,State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use url::Url;

type Result<T> = std::result::Result<T,Failure>;
#[derive(Debug,Serialize)] struct Failure { status:u16,code:String,message:String }
impl Failure {
 fn new(status:u16,code:&str,message:&str)->Self{Self{status,code:code.into(),message:message.into()}}
 fn storage()->Self{Self::new(0,"storage","Secure local storage is unavailable")}
 fn invalid()->Self{Self::new(400,"invalid_request","The native request is invalid")}
 fn expired()->Self{Self::new(401,"expired","Sign in to this server again")}
}
#[derive(Clone,Deserialize,Serialize)] #[serde(rename_all="camelCase")]
struct Profile { origin:String,server_id:String,account_id:String,session_id:String }
#[derive(Clone,Default)] struct Connection { selected:Option<(String,Value)>,profile:Option<Profile>,access:String,epoch:u64 }
struct Host { client:reqwest::Client, directory:PathBuf, connection:Mutex<Connection>,auth:tokio::sync::Mutex<()>,drafts:Mutex<()>,updates:tokio::sync::Mutex<()> }
fn digest(value:&str)->String{format!("{:x}",Sha256::digest(value.as_bytes()))}
fn credential_key(profile:&Profile)->String{format!("Monolith:{}:{}",profile.server_id,profile.account_id)}
fn origin(input:&str)->Result<Url>{
 let value=if input.contains("://"){input.trim().to_string()}else{format!("https://{}",input.trim())};
 let url=Url::parse(&value).map_err(|_|Failure::new(0,"invalid_url","Enter an HTTPS server address"))?;
 let loopback=cfg!(debug_assertions)&&url.scheme()=="http"&&matches!(url.host_str(),Some("localhost"|"127.0.0.1"));
 if (url.scheme()!="https"&&!loopback)||url.host_str().is_none()||!url.username().is_empty()||url.password().is_some()||url.query().is_some()||url.fragment().is_some()||url.path()!="/"{return Err(Failure::new(0,"invalid_url","Enter an HTTPS address without credentials or a path"))}Ok(url)
}
fn request_url(base:&str,path:&str)->Result<Url>{
 if !path.starts_with('/')||path.starts_with("//")||path.contains('\\'){return Err(Failure::invalid())}
 let root=origin(base)?;let url=root.join(path).map_err(|_|Failure::invalid())?;
 if url.origin()!=root.origin(){return Err(Failure::invalid())}Ok(url)
}
fn network(error:reqwest::Error)->Failure{
 use std::error::Error;
 let mut detail=error.to_string().to_lowercase();let mut cause=error.source();while let Some(next)=cause{detail.push_str(&next.to_string().to_lowercase());cause=next.source()}
 let(code,message)=if error.is_timeout(){("timeout","The server did not respond in time")}else if ["certificate","cert_","ssl","tls","trust"].iter().any(|v|detail.contains(v)){("certificate","The server certificate could not be verified")}else if ["dns","resolve","no such host","11001"].iter().any(|v|detail.contains(v)){("dns","The server name could not be resolved")}else{("offline","The server could not be reached")};Failure::new(0,code,message)
}
impl Host {
 fn connection(&self)->Connection{self.connection.lock().expect("connection mutex").clone()}
 fn profile(&self)->Result<Profile>{self.connection().profile.ok_or_else(Failure::expired)}
 async fn json(&self,method:reqwest::Method,url:Url,body:Option<Value>,access:Option<&str>)->Result<(u16,Value)>{
  let mut request=self.client.request(method,url);if let Some(body)=body{request=request.json(&body)}if let Some(access)=access{request=request.bearer_auth(access)}
  let response=request.send().await.map_err(network)?;let status=response.status().as_u16();
  if response.status().is_redirection(){return Err(Failure::new(0,"redirect","Server redirects are not permitted"))}
  let bytes=response.bytes().await.map_err(network)?;if bytes.len()>6_000_000{return Err(Failure::invalid())}
  let data=if bytes.is_empty(){Value::Null}else{serde_json::from_slice(&bytes).map_err(|_|Failure::new(status,"incompatible","The server returned an invalid response"))?};
  if status>=400{return Err(Failure::new(status,data["code"].as_str().unwrap_or("request_failed"),data["message"].as_str().unwrap_or("The request failed")))}Ok((status,data))
 }
 fn commit_tokens(&self,origin:String,discovery:Value,tokens:Value)->Result<Value>{
  let field=|name:&str| tokens[name].as_str().filter(|v|!v.is_empty()).map(str::to_owned).ok_or_else(Failure::invalid);
  let profile=Profile{origin,server_id:discovery["serverId"].as_str().ok_or_else(Failure::invalid)?.into(),account_id:field("accountId")?,session_id:field("sessionId")?};
  if [&profile.server_id,&profile.account_id,&profile.session_id].iter().any(|id|uuid::Uuid::parse_str(id).is_err()){return Err(Failure::invalid())}
  let _draft_guard=self.drafts.lock().unwrap();
  if let Some(previous)=self.connection().profile{if previous.server_id!=profile.server_id||previous.account_id!=profile.account_id{self.assert_clean(&previous)?;secure::set_credential(&credential_key(&previous),None)?;}}
  let refresh=field("refreshToken")?;let access=field("accessToken")?;
  secure::set_credential(&credential_key(&profile),Some(&refresh))?;
  secure::atomic_write(&self.directory.join("profile.json"),&serde_json::to_vec(&profile).map_err(|_|Failure::storage())?)?;
  let mut state=self.connection.lock().unwrap();
  if !state.profile.as_ref().is_some_and(|old|old.server_id==profile.server_id&&old.account_id==profile.account_id&&old.session_id==profile.session_id){state.epoch+=1;}
  state.profile=Some(profile.clone());state.selected=Some((profile.origin.clone(),discovery));state.access=access.clone();
  Ok(json!({"accessToken":access,"profile":profile}))
 }
 fn draft_folder(&self,profile:&Profile)->PathBuf{self.directory.join("drafts").join(digest(&format!("{}:{}",profile.server_id,profile.account_id)))}
 fn draft_path(&self,profile:&Profile,key:&str)->Result<PathBuf>{
  let parts:Vec<String>=serde_json::from_str(key).map_err(|_|Failure::invalid())?;
  if parts.len()!=5||parts[0]!=profile.server_id||parts[1]!=profile.account_id||!matches!(parts[3].as_str(),"page"|"record"|"note")||[0,1,2,4].iter().any(|&i|uuid::Uuid::parse_str(&parts[i]).is_err()){return Err(Failure::invalid())}
  Ok(self.draft_folder(profile).join(format!("{}.draft",digest(key))))
 }
 fn read_draft(&self,path:&PathBuf)->Result<Option<String>>{
  match fs::read(path){Ok(bytes)=>String::from_utf8(secure::protect(&bytes,true)?).map(Some).map_err(|_|Failure::storage()),Err(e) if e.kind()==std::io::ErrorKind::NotFound=>Ok(None),Err(_)=>Err(Failure::storage())}
 }
 fn list_drafts(&self,profile:&Profile)->Result<Vec<String>>{
  let folder=self.draft_folder(profile);if !folder.exists(){return Ok(vec![])}
  let mut result=vec![];for entry in fs::read_dir(folder).map_err(|_|Failure::storage())?{let path=entry.map_err(|_|Failure::storage())?.path();if path.extension().is_some_and(|v|v=="draft"){if let Some(value)=self.read_draft(&path)?{result.push(value)}}}Ok(result)
 }
 fn assert_clean(&self,profile:&Profile)->Result<()>{
  for raw in self.list_drafts(profile)?{let draft:Value=serde_json::from_str(&raw).map_err(|_|Failure::storage())?;if draft["dirty"]==true{return Err(Failure::new(409,"unsaved_drafts","Resolve unsaved document drafts before changing accounts"))}}Ok(())
 }
 async fn refresh(&self)->Result<Value>{
  let current=self.connection();let profile=current.profile.ok_or_else(Failure::expired)?;
  let (base,discovery)=current.selected.ok_or_else(Failure::expired)?;
  let token=secure::credential(&credential_key(&profile))?.ok_or_else(Failure::expired)?;
  let(_,tokens)=self.json(reqwest::Method::POST,request_url(&base,"/api/v1/device-sessions/refresh")?,Some(json!({"refreshToken":token})),None).await?;
  self.commit_tokens(base,discovery,tokens)
 }
 async fn media(&self,request:tauri::http::Request<Vec<u8>>)->Result<tauri::http::Response<Vec<u8>>>{
  let current=self.connection();let profile=current.profile.ok_or_else(Failure::expired)?;
  let prefix=format!("/{}/{}/",profile.server_id,profile.account_id);
  if request.method()!=tauri::http::Method::GET||request.uri().path()!=format!("{prefix}files/get"){return Err(Failure::invalid())}
  let url=request_url(&profile.origin,&format!("/api/files/get?{}",request.uri().query().unwrap_or("")))?;
  let send=|access:String|{let mut pending=self.client.get(url.clone()).bearer_auth(access);if let Some(range)=request.headers().get("range"){pending=pending.header("range",range)}pending.send()};
  let mut response=send(current.access).await.map_err(network)?;
  if response.status()==reqwest::StatusCode::UNAUTHORIZED{
   let _auth=self.auth.lock().await;
   if self.connection().epoch!=current.epoch{return Err(Failure::expired())}
   self.refresh().await?;response=send(self.connection().access).await.map_err(network)?;
  }
  if response.status().is_redirection(){return Err(Failure::new(0,"redirect","Server redirects are not permitted"))}
  let mut builder=tauri::http::Response::builder().status(response.status().as_u16()).header("cache-control","no-store").header("access-control-allow-origin","http://tauri.localhost");
  for(name,value)in response.headers(){if matches!(name.as_str(),"content-type"|"content-range"|"accept-ranges"){builder=builder.header(name,value)}}
  let mut bytes=vec![];while let Some(chunk)=response.chunk().await.map_err(network)?{if bytes.len()+chunk.len()>24_000_000{return Err(Failure::new(413,"response_too_large","Media exceeds the transfer limit"))}bytes.extend_from_slice(&chunk)}
  if self.connection().epoch!=current.epoch{return Err(Failure::expired())}
  builder.body(bytes).map_err(|_|Failure::invalid())
 }
}
fn arg<'a>(args:&'a Value,name:&str)->Result<&'a str>{args[name].as_str().ok_or_else(Failure::invalid)}

#[tauri::command]
async fn native_host(app:tauri::AppHandle,window:tauri::WebviewWindow,state:State<'_,Host>,operation:String,args:Value)->Result<Value>{
 let local=window.url().map_err(|_|Failure::invalid())?;
 if window.label()!="main"||!(local.host_str()==Some("tauri.localhost")||local.scheme()=="tauri"||(cfg!(debug_assertions)&&local.host_str()==Some("localhost")&&local.port()==Some(5186))){return Err(Failure::invalid())}
 match operation.as_str(){
  "updates"=>updates::execute(&app,&state,&args).await,
  "windowControl"=>{
   match arg(&args,"action")? {
    "state"=>{},
    "minimize"=>window.minimize().map_err(|_|Failure::invalid())?,
    "maximize"=>{if window.is_maximized().map_err(|_|Failure::invalid())?{window.unmaximize().map_err(|_|Failure::invalid())?}else{window.maximize().map_err(|_|Failure::invalid())?}},
    "close"=>window.close().map_err(|_|Failure::invalid())?,
    "drag"=>window.start_dragging().map_err(|_|Failure::invalid())?,
    _=>return Err(Failure::invalid())
   }
   Ok(json!({"maximized":window.is_maximized().unwrap_or(false)}))
  },
  "profile"=>Ok(serde_json::to_value(state.connection().profile).map_err(|_|Failure::storage())?),
  "connect"=>{
   let _guard=state.auth.lock().await;let url=origin(arg(&args,"url")?)?;let base=url.origin().ascii_serialization();
   let(_,discovery)=state.json(reqwest::Method::GET,url.join("/.well-known/monolith").unwrap(),None,None).await?;
   if discovery["apiVersion"]!=1||discovery["editorVersion"]!=2||!discovery["capabilities"].as_array().is_some_and(|v|v.contains(&json!("device-sessions")))||discovery["serverId"].as_str().is_none(){return Err(Failure::new(0,"incompatible","This server is not compatible with this Monolith version"))}
   let previous=state.connection();
   if let Some(profile)=previous.profile {
    if profile.origin==base && discovery["serverId"]!=profile.server_id{return Err(Failure::new(0,"incompatible","The server identity changed. Check the server address before signing in"))}
    if profile.origin!=base{let _draft_guard=state.drafts.lock().unwrap();state.assert_clean(&profile)?;secure::set_credential(&credential_key(&profile),None)?;let _=fs::remove_file(state.directory.join("profile.json"));let mut current=state.connection.lock().unwrap();current.profile=None;current.access.clear();current.epoch+=1;}
   }
   state.connection.lock().unwrap().selected=Some((base,discovery.clone()));Ok(discovery)
  },
  "login"|"totp"|"refresh"=>{
   let _guard=state.auth.lock().await;let current=state.connection();
   if operation=="refresh"{return state.refresh().await}
   let(base,discovery)=current.selected.clone().ok_or_else(||Failure::new(0,"incompatible","Verify the server address first"))?;
   let(path,body)=match operation.as_str(){
    "login"=>("/api/v1/device-sessions",args["credentials"].clone()),
    "totp"=>("/api/v1/device-sessions/totp",json!({"challenge":arg(&args,"challenge")?,"code":arg(&args,"code")?})),
    _=>{let profile=current.profile.ok_or_else(Failure::expired)?;let token=secure::credential(&credential_key(&profile))?.ok_or_else(Failure::expired)?;("/api/v1/device-sessions/refresh",json!({"refreshToken":token}))}
   };
   let(_,tokens)=state.json(reqwest::Method::POST,request_url(&base,path)?,Some(body),None).await?;
   if tokens["state"]=="totp_required"{return Ok(tokens)}
   state.commit_tokens(base,discovery,tokens)
  },
  "request"=>{
   let current=state.connection();let profile=current.profile.ok_or_else(Failure::expired)?;let request=&args["request"];
   let url=request_url(&profile.origin,arg(request,"path")?)?;
   let method=reqwest::Method::from_bytes(request["method"].as_str().unwrap_or("GET").as_bytes()).map_err(|_|Failure::invalid())?;
   if !url.path().starts_with("/api/")||(url.path().contains("/device-sessions")&&!matches!(method.as_str(),"GET"|"DELETE"))||url.path()=="/api/v1/bootstrap"{return Err(Failure::invalid())}
   if !matches!(method.as_str(),"GET"|"POST"|"PUT"|"PATCH"|"DELETE"|"HEAD"){return Err(Failure::invalid())}
   let mut pending=state.client.request(method,url).bearer_auth(&current.access);
   if let Some(headers)=request["headers"].as_object(){for(name,value)in headers{if matches!(name.to_lowercase().as_str(),"content-type"|"accept"|"if-match"|"range"|"x-monolith-key"|"x-monolith-package-names"){pending=pending.header(name,value.as_str().ok_or_else(Failure::invalid)?);}}}
   if let Some(body)=request["body"].as_str(){if body.len()>32_000_000{return Err(Failure::invalid())}pending=if request["bodyEncoding"]=="base64"{pending.body(STANDARD.decode(body).map_err(|_|Failure::invalid())?)}else{pending.body(body.to_owned())};}
   let mut response=pending.send().await.map_err(network)?;let status=response.status().as_u16();
   if response.status().is_redirection(){return Err(Failure::new(0,"redirect","Server redirects are not permitted"))}
   let headers:BTreeMap<String,String>=response.headers().iter().filter(|(key,_)|matches!(key.as_str(),"content-type"|"etag"|"content-disposition"|"content-range"|"x-monolith-downloadable")).filter_map(|(k,v)|v.to_str().ok().map(|v|(k.to_string(),v.to_string()))).collect();
   let mut bytes=vec![];while let Some(chunk)=response.chunk().await.map_err(network)?{if bytes.len()+chunk.len()>24_000_000{return Err(Failure::new(413,"response_too_large","Use the browser to download files larger than 24 MB"))}bytes.extend_from_slice(&chunk);}
   if state.connection().epoch!=current.epoch{return Err(Failure::expired())}
   match String::from_utf8(bytes.clone()){Ok(body)=>Ok(json!({"status":status,"headers":headers,"body":body})),Err(_)=>Ok(json!({"status":status,"headers":headers,"body":STANDARD.encode(bytes),"encoding":"base64"}))}
  },
  "readDraft"|"writeDraft"|"removeDraft"|"listDrafts"=>{
   let _guard=state.drafts.lock().unwrap();let profile=state.profile()?;
   if operation=="listDrafts"{return Ok(json!(state.list_drafts(&profile)?))}
   let key=arg(&args,"key")?;let path=state.draft_path(&profile,key)?;let old=state.read_draft(&path)?;
   if operation=="readDraft"{return Ok(json!(old))}
   let previous=old.as_deref().map(serde_json::from_str::<Value>).transpose().map_err(|_|Failure::storage())?;
   let version=previous.as_ref().and_then(|v|v["version"].as_u64());
   if version!=args["expectedVersion"].as_u64(){return Err(Failure::new(409,"draft_conflict","This draft changed in another window"))}
   if operation=="removeDraft"{if old.is_some(){fs::remove_file(path).map_err(|_|Failure::storage())?}return Ok(Value::Null)}
   let value=arg(&args,"value")?;if value.len()>6_000_000{return Err(Failure::invalid())}
   let draft:Value=serde_json::from_str(value).map_err(|_|Failure::invalid())?;
   if !widgets::valid_layout(&draft["snapshot"]){return Err(Failure::invalid())}
   let parts:Vec<String>=serde_json::from_str(key).map_err(|_|Failure::invalid())?;
   if draft["formatVersion"]!=1||draft["serverId"]!=parts[0]||draft["accountId"]!=parts[1]||draft["workspaceId"]!=parts[2]||draft["source"]["kind"]!=parts[3]||draft["source"]["id"]!=parts[4]||draft["snapshot"]["meta"]["id"]!=parts[4]||draft["version"].as_u64().unwrap_or(0)<=version.unwrap_or(0)||draft["dirty"].as_bool().is_none(){return Err(Failure::invalid())}
   secure::atomic_write(&path,&secure::protect(value.as_bytes(),false)?)?;Ok(Value::Null)
  },
  "signOut"=>{
   let _guard=state.auth.lock().await;let profile=state.profile()?;
   {let _draft_guard=state.drafts.lock().unwrap();state.assert_clean(&profile)?;}
   let revoke_url=request_url(&profile.origin,&format!("/api/v1/device-sessions/{}",profile.session_id))?;
   let revoked=state.json(reqwest::Method::DELETE,revoke_url.clone(),None,Some(&state.connection().access)).await;
   if let Err(error)=revoked{if error.status!=401{return Err(error)}match state.refresh().await{Ok(_)=>{state.json(reqwest::Method::DELETE,revoke_url,None,Some(&state.connection().access)).await?;},Err(error) if error.status==401=>{},Err(error)=>return Err(error)}}
   let _draft_guard=state.drafts.lock().unwrap();state.assert_clean(&profile)?;
   secure::set_credential(&credential_key(&profile),None)?;let _=fs::remove_file(state.directory.join("profile.json"));
   let mut current=state.connection.lock().unwrap();current.profile=None;current.access.clear();current.epoch+=1;Ok(Value::Null)
  },
  "openExternal"=>{let url=Url::parse(arg(&args,"url")?).map_err(|_|Failure::invalid())?;if !matches!(url.scheme(),"https"|"http"|"mailto")||!url.username().is_empty()||url.password().is_some(){return Err(Failure::invalid())}app.opener().open_url(url.as_str(),None::<&str>).map_err(|_|Failure::invalid())?;Ok(Value::Null)},
  "saveFile"=>{
   let name=arg(&args,"name")?.to_owned();let content=arg(&args,"content")?.to_owned();if content.len()>24_000_000||name.contains(['/', '\\',':']){return Err(Failure::invalid())}
   let app=app.clone();tauri::async_runtime::spawn_blocking(move||->Result<()>{if let Some(path)=app.dialog().file().set_file_name(&name).blocking_save_file(){let path=path.into_path().map_err(|_|Failure::invalid())?;secure::atomic_write(&path,content.as_bytes())?}Ok(())}).await.map_err(|_|Failure::storage())??;Ok(Value::Null)
  },
  _=>Err(Failure::invalid())
 }
}
fn main(){
 tauri::Builder::default().plugin(tauri_plugin_single_instance::init(|app,_,_|{if let Some(window)=app.get_webview_window("main"){let _=window.show();let _=window.set_focus();}})).plugin(tauri_plugin_dialog::init()).plugin(tauri_plugin_opener::init())
 .register_asynchronous_uri_scheme_protocol("monolith-media",|context,request,responder|{
  let app=context.app_handle().clone();
  tauri::async_runtime::spawn(async move{let state=app.state::<Host>();let response=state.media(request).await.unwrap_or_else(|error|tauri::http::Response::builder().status(if error.status>=400{error.status}else{502}).header("cache-control","no-store").body(error.message.into_bytes()).unwrap());responder.respond(response);});
 })
 .setup(|app|{
  let directory=app.path().app_local_data_dir()?;fs::create_dir_all(&directory)?;
  let profile=fs::read(directory.join("profile.json")).ok().and_then(|bytes|serde_json::from_slice::<Profile>(&bytes).ok()).filter(|profile|origin(&profile.origin).is_ok());
  let client=reqwest::Client::builder().redirect(reqwest::redirect::Policy::none()).connect_timeout(Duration::from_secs(10)).timeout(Duration::from_secs(25)).user_agent("Monolith/0.1.0 Windows").build()?;
  app.manage(Host{client,directory,connection:Mutex::new(Connection{profile,..Default::default()}),auth:tokio::sync::Mutex::new(()),drafts:Mutex::new(()),updates:tokio::sync::Mutex::new(())});Ok(())
 }).invoke_handler(tauri::generate_handler![native_host]).run(tauri::generate_context!()).expect("Monolith could not start");
}

#[cfg(test)] mod tests {
 use super::*;
 #[test]fn https_origins_and_request_paths(){assert!(origin("monolith.example.ts.net").is_ok());for value in ["http://example.com","https://name:secret@example.com","https://example.com/a","https://example.com?x=1"]{assert!(origin(value).is_err())}for path in ["//evil.test/api","/\\evil.test/api","https://evil.test/api"]{assert!(request_url("https://example.com",path).is_err())}}
 #[test]fn protected_atomic_drafts(){let folder=std::env::temp_dir().join(format!("monolith-test-{}",uuid::Uuid::new_v4()));let path=folder.join("draft");let protected=secure::protect(b"private draft",false).unwrap();assert_ne!(protected,b"private draft");secure::atomic_write(&path,&protected).unwrap();assert_eq!(secure::protect(&fs::read(&path).unwrap(),true).unwrap(),b"private draft");secure::atomic_write(&path,&secure::protect(b"second",false).unwrap()).unwrap();assert_eq!(secure::protect(&fs::read(&path).unwrap(),true).unwrap(),b"second");fs::remove_file(path).unwrap();fs::remove_dir(folder).unwrap();}
}

