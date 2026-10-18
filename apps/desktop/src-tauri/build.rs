fn main() {
    println!("cargo:rerun-if-changed=../../web/public/favicon.ico");
    println!("cargo:rerun-if-changed=../../web/public/assets/icons/icon-256x256.png");
    tauri_build::build()
}
