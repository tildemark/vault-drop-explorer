use aws_config::BehaviorVersion;
use aws_credential_types::Credentials;
use aws_sdk_s3::config::Builder as S3ConfigBuilder;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::Client;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct S3Object {
    pub key: String,
    pub size: i64,
    #[serde(rename = "lastModified")]
    pub last_modified: String,
}

// ─── Build S3 client ────────────────────────────────────────────────────────

fn load_env() {
    if let Ok(content) = std::fs::read_to_string(".env") {
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some((key, val)) = line.split_once('=') {
                std::env::set_var(key.trim(), val.trim());
            }
        }
    }
}

async fn build_client(
    provider: &str,
    region: &str,
    endpoint: Option<&str>,
    access_key_id: Option<&str>,
    secret_access_key: Option<&str>,
) -> Result<Client, String> {
    let mut key_id = access_key_id.unwrap_or("").trim().to_string();
    let mut secret = secret_access_key.unwrap_or("").trim().to_string();
    let trimmed_region = region.trim().to_string();

    // If UI creds are empty and provider is OCI, fall back to environment variables (loaded from .env)
    if key_id.is_empty() && secret.is_empty() && provider == "oci" {
        if let (Ok(env_key), Ok(env_sec)) = (std::env::var("OCI_ACCESS_KEY_ID"), std::env::var("OCI_SECRET_ACCESS_KEY")) {
            key_id = env_key.trim().to_string();
            secret = env_sec.trim().to_string();
        }
    }

    let sdk_config = if !key_id.is_empty() && !secret.is_empty() {
        let creds = Credentials::new(key_id, secret, None, None, "vault-drop");
        aws_config::defaults(BehaviorVersion::latest())
            .region(aws_sdk_s3::config::Region::new(trimmed_region))
            .credentials_provider(creds)
            .load()
            .await
    } else {
        let profile = if provider == "oci" { "oci" } else { "default" };
        aws_config::defaults(BehaviorVersion::latest())
            .region(aws_sdk_s3::config::Region::new(trimmed_region))
            .profile_name(profile)
            .load()
            .await
    };

    let mut s3_config = S3ConfigBuilder::from(&sdk_config);

    // Override endpoint for OCI (or any custom provider)
    if let Some(ep) = endpoint {
        let trimmed_ep = ep.trim();
        if !trimmed_ep.is_empty() {
            s3_config = s3_config
                .endpoint_url(trimmed_ep)
                .force_path_style(true); // OCI requires path-style
        }
    }

    Ok(Client::from_conf(s3_config.build()))
}

// ─── Tauri Commands ─────────────────────────────────────────────────────────

#[tauri::command]
async fn list_buckets(
    provider: String,
    region: String,
    endpoint: Option<String>,
    access_key_id: Option<String>,
    secret_access_key: Option<String>,
) -> Result<Vec<String>, String> {
    let client = build_client(
        &provider,
        &region,
        endpoint.as_deref(),
        access_key_id.as_deref(),
        secret_access_key.as_deref(),
    )
    .await?;

    let resp = client
        .list_buckets()
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let names = resp
        .buckets()
        .iter()
        .filter_map(|b| b.name().map(String::from))
        .collect();

    Ok(names)
}

#[tauri::command]
async fn list_objects(
    provider: String,
    region: String,
    bucket: String,
    prefix: Option<String>,
    endpoint: Option<String>,
    access_key_id: Option<String>,
    secret_access_key: Option<String>,
) -> Result<Vec<S3Object>, String> {
    let client = build_client(
        &provider,
        &region,
        endpoint.as_deref(),
        access_key_id.as_deref(),
        secret_access_key.as_deref(),
    )
    .await?;

    let mut req = client.list_objects_v2().bucket(&bucket);
    if let Some(pfx) = &prefix {
        if !pfx.is_empty() {
            req = req.prefix(pfx);
        }
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;

    let objects = resp
        .contents()
        .iter()
        .map(|obj| S3Object {
            key: obj.key().unwrap_or_default().to_string(),
            size: obj.size().unwrap_or(0),
            last_modified: obj
                .last_modified()
                .map(|t| t.to_string())
                .unwrap_or_default(),
        })
        .collect();

    Ok(objects)
}

#[tauri::command]
async fn upload_to_cloud(
    provider: String,
    region: String,
    bucket: String,
    object_name: String,
    file_path: String,
    endpoint: Option<String>,
    access_key_id: Option<String>,
    secret_access_key: Option<String>,
) -> Result<String, String> {
    let client = build_client(
        &provider,
        &region,
        endpoint.as_deref(),
        access_key_id.as_deref(),
        secret_access_key.as_deref(),
    )
    .await?;

    let body = ByteStream::from_path(Path::new(&file_path))
        .await
        .map_err(|e| e.to_string())?;

    client
        .put_object()
        .bucket(&bucket)
        .key(&object_name)
        .body(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(format!("Uploaded {} to {}/{}", file_path, bucket, object_name))
}

#[tauri::command]
async fn download_from_cloud(
    provider: String,
    region: String,
    bucket: String,
    object_name: String,
    save_path: String,
    endpoint: Option<String>,
    access_key_id: Option<String>,
    secret_access_key: Option<String>,
) -> Result<String, String> {
    let client = build_client(
        &provider,
        &region,
        endpoint.as_deref(),
        access_key_id.as_deref(),
        secret_access_key.as_deref(),
    )
    .await?;

    let resp = client
        .get_object()
        .bucket(&bucket)
        .key(&object_name)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data = resp
        .body
        .collect()
        .await
        .map_err(|e| e.to_string())?
        .into_bytes();

    fs::write(&save_path, &data)
        .await
        .map_err(|e| e.to_string())?;

    Ok(format!("Downloaded {} to {}", object_name, save_path))
}

// ─── App entry ──────────────────────────────────────────────────────────────

fn get_credentials_path() -> Result<std::path::PathBuf, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Could not find home directory".to_string())?;
    let mut path = std::path::PathBuf::from(home);
    path.push(".aws");
    path.push("credentials");
    Ok(path)
}

#[tauri::command]
fn check_credentials_exist(provider: String) -> Result<bool, String> {
    let path = match get_credentials_path() {
        Ok(p) => p,
        Err(_) => return Ok(false),
    };
    if !path.exists() {
        return Ok(false);
    }
    let content = std::fs::read_to_string(&path).unwrap_or_default();
    let profile_name = if provider == "oci" { "[oci]" } else { "[default]" };
    Ok(content.contains(profile_name))
}

#[tauri::command]
async fn save_credentials(
    provider: String,
    access_key_id: String,
    secret_access_key: String,
) -> Result<String, String> {
    if access_key_id.is_empty() || secret_access_key.is_empty() {
        return Err("Credentials cannot be empty".to_string());
    }

    let path = get_credentials_path()?;
    
    // Ensure parent directory exists (~/.aws)
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
    }

    let profile_name = if provider == "oci" { "oci" } else { "default" };

    // Read existing file content if it exists
    let mut content = if path.exists() {
        fs::read_to_string(&path).await.unwrap_or_default()
    } else {
        String::new()
    };

    // Replace or append the profile block
    let profile_header = format!("[{}]", profile_name);
    let new_block = format!(
        "[{}]\naws_access_key_id = {}\naws_secret_access_key = {}\n",
        profile_name, access_key_id, secret_access_key
    );

    if let Some(start_idx) = content.find(&profile_header) {
        // Find end of this profile block (starts at next "[" or end of file)
        let rest = &content[start_idx..];
        let end_idx = rest[profile_header.len()..]
            .find('[')
            .map(|i| start_idx + profile_header.len() + i)
            .unwrap_or(content.len());

        content.replace_range(start_idx..end_idx, &new_block);
    } else {
        // Profile doesn't exist, append to end
        if !content.is_empty() && !content.ends_with('\n') {
            content.push('\n');
        }
        content.push_str(&new_block);
    }

    fs::write(&path, content).await.map_err(|e| e.to_string())?;

    Ok(format!("Credentials saved to profile [{}]", profile_name))
}

#[tauri::command]
async fn get_object_preview(
    provider: String,
    region: String,
    bucket: String,
    object_name: String,
    endpoint: Option<String>,
    access_key_id: Option<String>,
    secret_access_key: Option<String>,
) -> Result<String, String> {
    let client = build_client(
        &provider,
        &region,
        endpoint.as_deref(),
        access_key_id.as_deref(),
        secret_access_key.as_deref(),
    )
    .await?;

    let resp = client
        .get_object()
        .bucket(&bucket)
        .key(&object_name)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data = resp
        .body
        .collect()
        .await
        .map_err(|e| e.to_string())?
        .into_bytes();

    Ok(BASE64.encode(&data))
}

// ─── App entry ──────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    load_env();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_buckets,
            list_objects,
            upload_to_cloud,
            download_from_cloud,
            check_credentials_exist,
            save_credentials,
            get_object_preview,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
