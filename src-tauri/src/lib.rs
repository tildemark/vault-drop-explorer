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

fn log_debug(msg: &str) {
    use std::fs::OpenOptions;
    use std::io::Write;
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .write(true)
        .append(true)
        .open("c:\\code\\vault-drop-explorer\\debug.log")
    {
        let _ = writeln!(file, "{}", msg);
    }
}

fn load_env() {
    std::env::set_var("AWS_REQUEST_CHECKSUM_CALCULATION", "WHEN_REQUIRED");
    std::env::set_var("AWS_RESPONSE_CHECKSUM_CALCULATION", "WHEN_REQUIRED");

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
    force_path_style: Option<bool>,
    profile_name: Option<&str>,
) -> Result<Client, String> {
    let mut key_id = access_key_id.unwrap_or("").trim().to_string();
    let mut secret = secret_access_key.unwrap_or("").trim().to_string();
    let trimmed_region = if region.trim().is_empty() { "us-east-1" } else { region.trim() };

    // If UI creds are empty, fall back to environment variables for known providers
    if key_id.is_empty() && secret.is_empty() {
        match provider {
            "oci" => {
                if let (Ok(env_key), Ok(env_sec)) = (std::env::var("OCI_ACCESS_KEY_ID"), std::env::var("OCI_SECRET_ACCESS_KEY")) {
                    key_id = env_key.trim().to_string();
                    secret = env_sec.trim().to_string();
                }
            }
            "minio" => {
                if let (Ok(env_key), Ok(env_sec)) = (std::env::var("MINIO_ACCESS_KEY"), std::env::var("MINIO_SECRET_KEY")) {
                    key_id = env_key.trim().to_string();
                    secret = env_sec.trim().to_string();
                }
            }
            _ => {}
        }
    }

    let sdk_config = if !key_id.is_empty() && !secret.is_empty() {
        let creds = Credentials::new(key_id, secret, None, None, "vault-drop");
        aws_config::defaults(BehaviorVersion::latest())
            .region(aws_sdk_s3::config::Region::new(trimmed_region.to_string()))
            .credentials_provider(creds)
            .load()
            .await
    } else {
        let target_profile = profile_name.unwrap_or_else(|| {
            match provider {
                "oci" => "oci",
                "minio" => "minio",
                "r2" => "r2",
                "localstack" => "localstack",
                "wasabi" => "wasabi",
                "backblaze" => "b2",
                _ => "default",
            }
        });
        aws_config::defaults(BehaviorVersion::latest())
            .region(aws_sdk_s3::config::Region::new(trimmed_region.to_string()))
            .profile_name(target_profile)
            .load()
            .await
    };

    let mut s3_config = S3ConfigBuilder::from(&sdk_config);

    if let Some(ep) = endpoint {
        let trimmed_ep = ep.trim();
        if !trimmed_ep.is_empty() {
            s3_config = s3_config.endpoint_url(trimmed_ep);
        }
    }

    let is_path_style = force_path_style.unwrap_or_else(|| {
        match provider {
            "oci" | "minio" | "localstack" | "custom" => true,
            _ => {
                if let Some(ep) = endpoint {
                    let ep_lower = ep.to_lowercase();
                    ep_lower.contains("localhost") || ep_lower.contains("127.0.0.1")
                } else {
                    false
                }
            }
        }
    });

    if is_path_style {
        s3_config = s3_config.force_path_style(true);
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
    force_path_style: Option<bool>,
    profile_name: Option<String>,
) -> Result<Vec<String>, String> {
    let client = build_client(
        &provider,
        &region,
        endpoint.as_deref(),
        access_key_id.as_deref(),
        secret_access_key.as_deref(),
        force_path_style,
        profile_name.as_deref(),
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
    force_path_style: Option<bool>,
    profile_name: Option<String>,
) -> Result<Vec<S3Object>, String> {
    let client = build_client(
        &provider,
        &region,
        endpoint.as_deref(),
        access_key_id.as_deref(),
        secret_access_key.as_deref(),
        force_path_style,
        profile_name.as_deref(),
    )
    .await?;

    let mut req = client.list_objects_v2().bucket(&bucket).delimiter("/");
    if let Some(pfx) = &prefix {
        if !pfx.is_empty() {
            req = req.prefix(pfx);
        }
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;

    log_debug(&format!("[DEBUG S3] list_objects bucket='{}', prefix='{:?}'", bucket, prefix));
    log_debug(&format!("[DEBUG S3] contents: {:?}", resp.contents()));
    log_debug(&format!("[DEBUG S3] common_prefixes: {:?}", resp.common_prefixes()));

    let mut list = Vec::new();

    // Add folders from common_prefixes
    for prefix_obj in resp.common_prefixes() {
        if let Some(pfx) = prefix_obj.prefix() {
            log_debug(&format!("[DEBUG S3] parsed folder prefix: {}", pfx));
            list.push(S3Object {
                key: pfx.to_string(),
                size: 0,
                last_modified: String::new(),
            });
        }
    }

    // Add files from contents
    for obj in resp.contents() {
        let key = obj.key().unwrap_or_default().to_string();
        log_debug(&format!("[DEBUG S3] parsed file content key: {}", key));
        // Filter out the directory folder object itself if returned in contents
        if let Some(pfx) = &prefix {
            if key == *pfx {
                continue;
            }
        }
        list.push(S3Object {
            key,
            size: obj.size().unwrap_or(0),
            last_modified: obj
                .last_modified()
                .map(|t| t.to_string())
                .unwrap_or_default(),
        });
    }

    Ok(list)
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
    force_path_style: Option<bool>,
    profile_name: Option<String>,
) -> Result<String, String> {
    let client = build_client(
        &provider,
        &region,
        endpoint.as_deref(),
        access_key_id.as_deref(),
        secret_access_key.as_deref(),
        force_path_style,
        profile_name.as_deref(),
    )
    .await?;

    let path = Path::new(&file_path);
    let metadata = std::fs::metadata(path).map_err(|e| e.to_string())?;
    let file_size = metadata.len();

    let body = ByteStream::from_path(path)
        .await
        .map_err(|e| e.to_string())?;

    log_debug(&format!("[DEBUG S3] put_object bucket='{}', key='{}', file='{}', size={}", bucket, object_name, file_path, file_size));

    let put_resp = client
        .put_object()
        .bucket(&bucket)
        .key(&object_name)
        .body(body)
        .content_length(file_size as i64)
        .customize()
        .disable_payload_signing()
        .send()
        .await
        .map_err(|e| {
            let err_msg = format!("[DEBUG S3] put_object error: {:?}", e);
            log_debug(&err_msg);
            e.to_string()
        })?;

    log_debug(&format!("[DEBUG S3] put_object response: {:?}", put_resp));

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
    force_path_style: Option<bool>,
    profile_name: Option<String>,
) -> Result<String, String> {
    let client = build_client(
        &provider,
        &region,
        endpoint.as_deref(),
        access_key_id.as_deref(),
        secret_access_key.as_deref(),
        force_path_style,
        profile_name.as_deref(),
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
fn check_credentials_exist(provider: String, profile_name: Option<String>) -> Result<bool, String> {
    let path = match get_credentials_path() {
        Ok(p) => p,
        Err(_) => return Ok(false),
    };
    if !path.exists() {
        return Ok(false);
    }
    let content = std::fs::read_to_string(&path).unwrap_or_default();
    let target_profile = profile_name.unwrap_or_else(|| {
        match provider.as_str() {
            "oci" => "oci".to_string(),
            "minio" => "minio".to_string(),
            "r2" => "r2".to_string(),
            "localstack" => "localstack".to_string(),
            _ => "default".to_string(),
        }
    });
    let profile_header = format!("[{}]", target_profile);
    Ok(content.contains(&profile_header))
}

#[tauri::command]
async fn save_credentials(
    provider: String,
    access_key_id: String,
    secret_access_key: String,
    profile_name: Option<String>,
) -> Result<String, String> {
    if access_key_id.is_empty() || secret_access_key.is_empty() {
        return Err("Credentials cannot be empty".to_string());
    }

    let path = get_credentials_path()?;
    
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
    }

    let target_profile = profile_name.unwrap_or_else(|| {
        match provider.as_str() {
            "oci" => "oci".to_string(),
            "minio" => "minio".to_string(),
            "r2" => "r2".to_string(),
            "localstack" => "localstack".to_string(),
            _ => "default".to_string(),
        }
    });

    let mut content = if path.exists() {
        fs::read_to_string(&path).await.unwrap_or_default()
    } else {
        String::new()
    };

    let profile_header = format!("[{}]", target_profile);
    let new_block = format!(
        "[{}]\naws_access_key_id = {}\naws_secret_access_key = {}\n",
        target_profile, access_key_id, secret_access_key
    );

    if let Some(start_idx) = content.find(&profile_header) {
        let rest = &content[start_idx..];
        let end_idx = rest[profile_header.len()..]
            .find('[')
            .map(|i| start_idx + profile_header.len() + i)
            .unwrap_or(content.len());

        content.replace_range(start_idx..end_idx, &new_block);
    } else {
        if !content.is_empty() && !content.ends_with('\n') {
            content.push('\n');
        }
        content.push_str(&new_block);
    }

    fs::write(&path, content).await.map_err(|e| e.to_string())?;

    Ok(format!("Credentials saved to profile [{}]", target_profile))
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
    force_path_style: Option<bool>,
    profile_name: Option<String>,
) -> Result<String, String> {
    let client = build_client(
        &provider,
        &region,
        endpoint.as_deref(),
        access_key_id.as_deref(),
        secret_access_key.as_deref(),
        force_path_style,
        profile_name.as_deref(),
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

#[tauri::command]
async fn create_bucket(
    provider: String,
    region: String,
    bucket: String,
    endpoint: Option<String>,
    access_key_id: Option<String>,
    secret_access_key: Option<String>,
    force_path_style: Option<bool>,
    profile_name: Option<String>,
) -> Result<String, String> {
    let client = build_client(
        &provider,
        &region,
        endpoint.as_deref(),
        access_key_id.as_deref(),
        secret_access_key.as_deref(),
        force_path_style,
        profile_name.as_deref(),
    )
    .await?;

    let mut builder = client.create_bucket().bucket(&bucket);

    if provider == "aws" && region != "us-east-1" {
        let constraint = aws_sdk_s3::types::BucketLocationConstraint::from(region.as_str());
        let config = aws_sdk_s3::types::CreateBucketConfiguration::builder()
            .location_constraint(constraint)
            .build();
        builder = builder.create_bucket_configuration(config);
    }

    builder.send().await.map_err(|e| e.to_string())?;

    Ok(format!("Bucket '{}' created successfully", bucket))
}

#[tauri::command]
async fn delete_object(
    provider: String,
    region: String,
    bucket: String,
    object_name: String,
    endpoint: Option<String>,
    access_key_id: Option<String>,
    secret_access_key: Option<String>,
    force_path_style: Option<bool>,
    profile_name: Option<String>,
) -> Result<String, String> {
    let client = build_client(
        &provider,
        &region,
        endpoint.as_deref(),
        access_key_id.as_deref(),
        secret_access_key.as_deref(),
        force_path_style,
        profile_name.as_deref(),
    )
    .await?;

    client
        .delete_object()
        .bucket(&bucket)
        .key(&object_name)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(format!("Deleted {} from {}", object_name, bucket))
}

#[tauri::command]
fn get_env_var(name: String) -> Result<String, String> {
    std::env::var(&name).map_err(|_| format!("Env var {} not found", name))
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
            create_bucket,
            get_env_var,
            delete_object,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
