# Vault Drop Explorer

> A lightweight Tauri v2 desktop application for securely managing files on **AWS S3**, **MinIO**, **Oracle Cloud (OCI)**, and **Self-Hosted S3-Compatible Object Storage**.

No browser, no typing. Select your provider preset, click Connect — your buckets appear. Upload and download with native OS file dialogs.

---

## Features

- **Multi-Provider & Self-Hosted**: Connect to AWS S3, MinIO, OCI Object Storage, Cloudflare R2, Wasabi, Backblaze B2, LocalStack, Garage S3, Ceph, and generic custom S3 servers.
- **Built-in Provider Presets**: Instant configuration for MinIO (`http://localhost:9000`), LocalStack (`http://localhost:4566`), Cloudflare R2, Wasabi, and OCI.
- **Saved Connection Profiles**: Save connection profiles locally and switch between multiple servers in one click.
- **Config Export / Import**: Export and import your connections as a single `vault-drop-config.json` configuration file.
- **Path-Style Access Support**: Native support for path-style addressing (`http://endpoint/bucket`) required by MinIO and self-hosted instances.
- **Zero-config Auth**: Automatically reads `~/.aws/credentials` (profiles: `[default]`, `[minio]`, `[oci]`, `[r2]`, etc.) — keys never leave your machine.
- **Live Bucket & File Explorer**: Tile view, folder navigation, instant file previews, and OS file picker upload/download.
- **Tiny Footprint**: Built with Tauri v2 (Rust backend) — lightweight and fast.

---

## Download

👉 [**Download for Windows (.exe)**](https://github.com/tildemark/vault-drop-explorer/releases/latest/download/Vault.Drop.Explorer_1.1.0_x64-setup.exe)

Or visit the [Releases page](https://github.com/tildemark/vault-drop-explorer/releases) for all platforms.

---

## Quick Setup Guides

### 1. MinIO (Self-Hosted / Local Docker)

#### Option A: Connection Form
1. Select **MinIO (Self-Hosted)** preset.
2. Endpoint URL defaults to `http://localhost:9000`.
3. Enter your MinIO **Root User** (Access Key) and **Root Password** (Secret Key).
4. Click **Connect & List Buckets**.

#### Option B: `~/.aws/credentials` profile
Add a `[minio]` profile to your `~/.aws/credentials` file:

```ini
[minio]
aws_access_key_id     = minioadmin
aws_secret_access_key = minioadmin
```

> 📖 **Tutorial**: Want to restrict MinIO access keys to specific buckets only? See our [MinIO Bucket Policy Tutorial](docs/minio-bucket-policy-tutorial.md).

---

### 2. AWS S3

```ini
# ~/.aws/credentials
[default]
aws_access_key_id     = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

---

### 3. OCI Object Storage (S3-Compatible API)

```ini
# ~/.aws/credentials
[oci]
aws_access_key_id     = <Customer Secret Key ID>
aws_secret_access_key = <Customer Secret Key Secret>
```

1. Enter your **tenancy namespace** in the Tenancy Namespace field.
2. Click **Connect & List Buckets**.

---

### 4. Custom S3 / Garage / Ceph / LocalStack

For any S3-compatible app:
1. Select **Custom S3 / Garage / Ceph** or **LocalStack** from the preset dropdown.
2. Enter your server endpoint URL (e.g., `http://192.168.1.100:9000`).
3. Toggle **Force Path-Style Access** under Advanced S3 Settings if your server requires path-based bucket URLs.

---

## Profile Import & Export (`vault-drop-config.json`)

To backup or sync your connection setups across devices:
1. Click **⚙️ Profiles** in the top bar.
2. Click **📤 Export Config File** to save your `vault-drop-config.json`.
3. On another device or fresh install, click **📥 Import JSON Config** to restore all saved profiles instantly.

---

## Architecture

```
vault-drop-explorer/
├── landing/               Static marketing landing page
├── src/                   React + TypeScript frontend (Vite)
│   ├── components/
│   │   ├── BucketBrowser  Bucket & object manager (lists, uploads, downloads, previews)
│   │   ├── ProfileManager Connection profile saver + JSON import/export
│   │   └── StatusBar      Toast notifications
│   ├── lib/
│   │   ├── presets.ts     S3 & self-hosted provider templates (MinIO, R2, OCI, LocalStack, Wasabi)
│   │   ├── awsRegions.ts  AWS regions dropdown list
│   │   └── ociRegions.ts  OCI regions & endpoints list
│   └── types/
│       └── provider.ts    Provider and connection profile TypeScript schemas
└── src-tauri/             Rust backend (Tauri v2)
    └── src/lib.rs         Multi-provider S3 client builder + Tauri commands
```

---

## Development Setup

```bash
# Install dependencies
npm install

# Start dev server (opens Tauri window + hot-reload)
npm run tauri dev

# Build release installer
npm run tauri build
```

---

## License

MIT — see [LICENSE](LICENSE)
