use std::{fs::{self, OpenOptions}, io::Write, path::Path};
use crate::{Failure, Result};

#[cfg(windows)]
mod platform {
 use super::*;
 use windows_sys::Win32::{Foundation::{LocalFree, GetLastError, ERROR_NOT_FOUND}, Security::{Credentials::*, Cryptography::*}, Storage::FileSystem::{MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH}};
 fn wide(value: &str) -> Vec<u16> { value.encode_utf16().chain(Some(0)).collect() }
 pub fn credential(name: &str) -> Result<Option<String>> {
  let target=wide(name);let mut pointer=std::ptr::null_mut();
  unsafe {
   if CredReadW(target.as_ptr(),CRED_TYPE_GENERIC,0,&mut pointer)==0 {
    return if GetLastError()==ERROR_NOT_FOUND {Ok(None)} else {Err(Failure::storage())};
   }
   let bytes=std::slice::from_raw_parts((*pointer).CredentialBlob,(*pointer).CredentialBlobSize as usize).to_vec();
   CredFree(pointer.cast());
   String::from_utf8(bytes).map(Some).map_err(|_|Failure::storage())
  }
 }
 pub fn set_credential(name: &str,value: Option<&str>)->Result<()> {
  let mut target=wide(name);
  unsafe {
   if let Some(value)=value {
    let mut credential:CREDENTIALW=std::mem::zeroed();credential.Type=CRED_TYPE_GENERIC;
    credential.TargetName=target.as_mut_ptr();credential.Persist=CRED_PERSIST_LOCAL_MACHINE;
    credential.CredentialBlob=value.as_ptr() as *mut u8;credential.CredentialBlobSize=value.len() as u32;
    if CredWriteW(&credential,0)==0{return Err(Failure::storage())}
   }else if CredDeleteW(target.as_ptr(),CRED_TYPE_GENERIC,0)==0 && GetLastError()!=ERROR_NOT_FOUND{return Err(Failure::storage())}
  }
  Ok(())
 }
 pub fn protect(bytes:&[u8],decrypt:bool)->Result<Vec<u8>> {
  let input=CRYPT_INTEGER_BLOB{cbData:bytes.len() as u32,pbData:bytes.as_ptr() as *mut u8};
  let mut output=CRYPT_INTEGER_BLOB{cbData:0,pbData:std::ptr::null_mut()};
  unsafe {
   let ok=if decrypt {CryptUnprotectData(&input,std::ptr::null_mut(),std::ptr::null(),std::ptr::null(),std::ptr::null(),CRYPTPROTECT_UI_FORBIDDEN,&mut output)} else {CryptProtectData(&input,std::ptr::null(),std::ptr::null(),std::ptr::null(),std::ptr::null(),CRYPTPROTECT_UI_FORBIDDEN,&mut output)};
   if ok==0{return Err(Failure::storage())}
   let result=std::slice::from_raw_parts(output.pbData,output.cbData as usize).to_vec();LocalFree(output.pbData.cast());Ok(result)
  }
 }
 pub fn replace(source:&Path,destination:&Path)->Result<()> {
  use std::os::windows::ffi::OsStrExt;
  let a:Vec<u16>=source.as_os_str().encode_wide().chain(Some(0)).collect();
  let b:Vec<u16>=destination.as_os_str().encode_wide().chain(Some(0)).collect();
  if unsafe {MoveFileExW(a.as_ptr(),b.as_ptr(),MOVEFILE_REPLACE_EXISTING|MOVEFILE_WRITE_THROUGH)}==0{return Err(Failure::storage())} Ok(())
 }
}
#[cfg(windows)] pub use platform::*;
#[cfg(not(windows))] compile_error!("This host is Windows-only. Use the Swift host on macOS.");

pub fn atomic_write(path:&Path,bytes:&[u8])->Result<()> {
 let parent=path.parent().ok_or_else(Failure::storage)?;fs::create_dir_all(parent).map_err(|_|Failure::storage())?;
 let temporary=parent.join(format!("{}.tmp",uuid::Uuid::new_v4()));
 let result=(|| {
  let mut file=OpenOptions::new().write(true).create_new(true).open(&temporary).map_err(|_|Failure::storage())?;
  file.write_all(bytes).and_then(|_|file.sync_all()).map_err(|_|Failure::storage())?;drop(file);replace(&temporary,path)
 })();
 if result.is_err(){let _=fs::remove_file(&temporary);}result
}
