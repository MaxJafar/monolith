fn main() {
    println!("cargo:rerun-if-changed=../../web/public/favicon.ico");
    tauri_build::build()
}
