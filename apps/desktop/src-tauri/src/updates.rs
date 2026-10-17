use crate::{Failure, Host, Result};
use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{fs, path::Path, process::{Command, Stdio}, time::{Duration, Instant}};
use tauri::Manager;

#[derive(Deserialize)]
struct Endpoint { url: String, token: String }
fn failure(message: &str) -> Failure { Failure::new(0, "updates", message) }
fn endpoint(directory: &Path) -> Result<Endpoint> {
    let data = fs::read(directory.join("endpoint.json")).map_err(|_| failure("Update supervisor is starting"))?;
    let value: Endpoint = serde_json::from_slice(&data).map_err(|_| failure("Invalid update endpoint"))?;
    let url = url::Url::parse(&value.url).map_err(|_| failure("Invalid update endpoint"))?;
    if url.scheme() != "http" || url.host_str() != Some("127.0.0.1") || url.port().is_none() || url.path() != "/" || url.username() != "" || url.password().is_some() || url.query().is_some() || url.fragment().is_some() || value.token.len() != 48 { return Err(failure("Invalid update endpoint")); }
    Ok(value)
}
async fn request(client: &reqwest::Client, address: &Endpoint, action: &str, body: Option<Value>) -> Result<Value> {
    let mut request = client.request(if action == "status" { reqwest::Method::GET } else { reqwest::Method::POST }, format!("{}/{}", address.url.trim_end_matches('/'), action)).bearer_auth(&address.token);
    if let Some(body) = body { request = request.json(&body); }
    let response = request.send().await.map_err(|_| failure("The update supervisor could not be reached"))?;
    let status = response.status();
    let bytes = response.bytes().await.map_err(|_| failure("Invalid updater response"))?;
    if bytes.len() > 1_000_000 { return Err(failure("Updater response is too large")); }
    let value: Value = serde_json::from_slice(&bytes).map_err(|_| failure("Invalid updater response"))?;
    if !status.is_success() { return Err(failure(value["error"].as_str().unwrap_or("The update operation failed"))); }
    Ok(value)
}
async fn delay() { let _ = tauri::async_runtime::spawn_blocking(|| std::thread::sleep(Duration::from_millis(200))).await; }

pub async fn execute(app: &tauri::AppHandle, host: &Host, args: &Value) -> Result<Value> {
    let action = args["action"].as_str().ok_or_else(Failure::invalid)?;
    if !["status", "check", "download", "install", "rollback", "settings", "ready"].contains(&action) { return Err(Failure::invalid()); }
    let client = reqwest::Client::builder().timeout(Duration::from_secs(5)).redirect(reqwest::redirect::Policy::none()).build().map_err(|_| failure("Update networking unavailable"))?;
    let directory = host.directory.join("updates");
    let address = {
        let _startup = host.updates.lock().await;
        let existing = endpoint(&directory).ok();
        if let Some(address) = existing.filter(|_| directory.exists()) {
            if request(&client, &address, "status", None).await.is_ok() { Some(address) } else { None }
        } else { None }
    };
    let address = if let Some(address) = address { address } else {
        let _startup = host.updates.lock().await;
        let resources = app.path().resource_dir().map_err(|_| failure("Update resources unavailable"))?.join("updater");
        let settings = resources.join("settings.json");
        let config: Value = serde_json::from_slice(&fs::read(&settings).map_err(|_| failure("This development build has no updater. Build the desktop release resources first"))?).map_err(|_| failure("Invalid release configuration"))?;
        if config["version"] != env!("CARGO_PKG_VERSION") && !directory.join("pending.json").exists() { return Err(failure("Desktop and updater release versions do not match")); }
        let bytes = fs::read(resources.join("monolith-updater.exe")).map_err(|_| failure("The bundled update supervisor is missing"))?;
        let helper_directory = directory.join("agents").join(format!("{:x}", Sha256::digest(&bytes)));
        fs::create_dir_all(&helper_directory).map_err(|_| Failure::storage())?;
        let helper = helper_directory.join("monolith-updater.exe");
        if !helper.exists() { crate::secure::atomic_write(&helper, &bytes)?; }
        let install = std::env::current_exe().map_err(|_| failure("Application path unavailable"))?.parent().ok_or_else(Failure::invalid)?.to_path_buf();
        let mut command = Command::new(helper);
        command.args(["--config"]).arg(settings).arg("--state").arg(&directory).arg("--install").arg(install).arg("--parent").arg(std::process::id().to_string()).stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
        #[cfg(windows)] { use std::os::windows::process::CommandExt; command.creation_flags(0x08000000); }
        command.spawn().map_err(|_| failure("Could not start the update supervisor"))?;
        let start = Instant::now();
        loop {
            if let Ok(address) = endpoint(&directory) { if request(&client, &address, "status", None).await.is_ok() { break address; } }
            if start.elapsed() > Duration::from_secs(20) { return Err(failure("The update supervisor did not start")); }
            delay().await;
        }
    };
    if action == "install" || action == "rollback" {
        let _drafts = host.drafts.lock().unwrap();
        if let Some(profile) = host.connection().profile { host.assert_clean(&profile)?; }
    }
    let body = match action {
        "ready" => Some(json!({"version": env!("CARGO_PKG_VERSION"), "pid": std::process::id()})),
        "settings" => Some(args["preferences"].clone()),
        _ => None
    };
    let reply = request(&client, &address, action, body).await?;
    if action == "rollback" { app.exit(0); }
    if action == "install" {
        let start = Instant::now();
        loop {
            let status = request(&client, &address, "status", None).await?;
            if status["phase"] == "installing" {
                let _drafts = host.drafts.lock().unwrap();
                if let Some(profile) = host.connection().profile { host.assert_clean(&profile)?; }
                app.exit(0);
                return Ok(status);
            }
            if status["phase"] == "failed" || status["phase"] == "rolledBack" { return Err(failure(status["error"].as_str().unwrap_or("The update could not be prepared"))); }
            if start.elapsed() > Duration::from_secs(180) { return Err(failure("Update preparation timed out; Monolith remains open")); }
            delay().await;
        }
    }
    Ok(reply)
}
