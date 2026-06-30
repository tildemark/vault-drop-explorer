use aws_config::BehaviorVersion;
use aws_credential_types::Credentials;
use aws_sdk_s3::config::Builder as S3ConfigBuilder;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::Client;
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

async fn build_client(
    provider: &str,
    region: &str,
    endpoint: Option<&str>,
    access_key_id: Option<&str>,
    secret_access_key: Option<&str>,
) -> Result<Client, String> {
    // If inline creds provided, use them; otherwise fall back to credential chain.
    let sdk_config = if let (Some(key_id), Some(secret)) = (access_key_id, secret_access_key) {
        if !key_id.is_empty() && !secret.is_empty() {
            let creds = Credentials::new(key_id, secret, None, None, "vault-drop-inline");
            aws_config::defaults(BehaviorVersion::latest())
                .region(aws_sdk_s3::config::Region::new(region.to_string()))
                .credentials_provider(creds)
                .load()
                .await
        } else {
            // OCI: try [oci] profile, fall back to default
            let profile = if provider == "oci" { "oci" } else { "default" };
            aws_config::defaults(BehaviorVersion::latest())
                .region(aws_sdk_s3::config::Region::new(region.to_string()))
                .profile_name(profile)
                .load()
                .await
        }
    } else {
        let profile = if provider == "oci" { "oci" } else { "default" };
        aws_config::defaults(BehaviorVersion::latest())
            .region(aws_sdk_s3::config::Region::new(region.to_string()))
            .profile_name(profile)
            .load()
            .await
    };

    let mut s3_config = S3ConfigBuilder::from(&sdk_config);

    // Override endpoint for OCI (or any custom provider)
    if let Some(ep) = endpoint {
        if !ep.is_empty() {
            s3_config = s3_config
                .endpoint_url(ep)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_buckets,
            list_objects,
            upload_to_cloud,
            download_from_cloud,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
