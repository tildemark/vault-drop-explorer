# Vault Drop Explorer

> A lightweight Tauri v2 desktop application for securely managing files on **AWS S3** and **Oracle Cloud Infrastructure (OCI) Object Storage**.

No browser, no typing. Select your region, click Connect — your buckets appear. Upload and download with native OS file dialogs.

---

## Features

- **Dual Cloud**: Switch between AWS S3 and OCI Object Storage (via S3-compatible API)
- **Zero-config auth**: Reads `~/.aws/credentials` automatically — keys never leave your machine
- **Pre-populated regions**: All AWS + OCI regions are dropdown selectors, OCI endpoint auto-fills
- **Live bucket browser**: Click Connect → buckets appear as tiles → browse objects in a file-explorer view
- **Native file dialogs**: Upload/download use your OS's native picker
- **Tiny footprint**: Built with Tauri v2 (Rust backend) — no bundled browser engine

---

## Download

👉 [**Download for Windows (.exe)**](https://github.com/tildemark/vault-drop-explorer/releases/latest/download/VaultDropExplorer_0.1.0_x64-setup.exe)

Or visit the [Releases page](https://github.com/tildemark/vault-drop-explorer/releases) for all platforms.

---

## Getting Started

Follow these steps to clone the repository, set up your credentials, and start the application locally:

### 1. Clone the Repository
```bash
git clone https://github.com/tildemark/vault-drop-explorer.git
cd vault-drop-explorer
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Credentials
Ensure you have S3 credentials in your `~/.aws/credentials` file. See the [Credential Setup](#credential-setup) section below for format details.

### 4. Run the Dev Server
Launch the hot-reloading development server to open the desktop window:
```bash
npm run tauri dev
```

---

## Credential Setup

Vault Drop Explorer reads credentials from the standard AWS credentials file. No UI setup needed.

### AWS S3

```ini
# ~/.aws/credentials
[default]
aws_access_key_id     = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### OCI Object Storage (S3-Compatible API)

OCI uses [Customer Secret Keys](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managingcredentials.htm#create-secret-key) for S3-compatible access.

1. **Generate a Customer Secret Key** in OCI Console → Identity → Users → Your user → Customer Secret Keys
2. Copy the **Access Key** (Key ID) and **Secret** shown at creation
3. Add them under an `[oci]` profile in `~/.aws/credentials`:

```ini
# ~/.aws/credentials
[oci]
aws_access_key_id     = <Customer Secret Key ID>
aws_secret_access_key = <Customer Secret Key Secret>
```

4. Find your **tenancy namespace** in OCI Console → Tenancy Details → Object Storage Namespace (e.g. `axhz1oupce7t`)
5. In the app, select your **OCI region** → the endpoint auto-fills with `https://{namespace}.compat.objectstorage.<region>.oraclecloud.com`
6. Enter your **namespace** in the Tenancy Namespace field → endpoint updates automatically

---

## Architecture

```
vault-drop-explorer/
├── landing/               Static marketing landing page (index.html + style.css)
├── src/                   React + TypeScript frontend (Vite)
│   ├── components/
│   │   ├── ui/            Custom shadcn-style UI components (no shadcn CLI needed)
│   │   ├── BucketBrowser  Connects → lists buckets → lists objects → upload/download
│   │   └── StatusBar      Toast-style status notifications
│   └── lib/
│       ├── awsRegions.ts  All AWS region options (~30 regions)
│       └── ociRegions.ts  All OCI commercial regions + pre-built S3 endpoints
└── src-tauri/             Rust backend (Tauri v2)
    └── src/lib.rs         S3 client builder + 4 Tauri commands
```

### How the Dual-Provider Architecture Works

The Rust backend uses a single `build_client()` helper that:

1. **Loads credentials** via the AWS SDK's default credential chain (reads `~/.aws/credentials` using the `default` or `oci` named profile, depending on provider)
2. **Overrides credentials** if the user enters inline key/secret in the OCI "Advanced" panel
3. **Overrides the endpoint URL** for OCI by calling `.endpoint_url()` on the S3 config builder, enabling the AWS SDK to talk to OCI's S3-compatible API
4. **Enables path-style access** (`.force_path_style(true)`) which OCI requires (unlike AWS which prefers virtual-hosted)

This means the same four Tauri commands (`list_buckets`, `list_objects`, `upload_to_cloud`, `download_from_cloud`) work for both providers — the client configuration is the only difference.

---

## Development Setup

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) 18+
- [Tauri v2 prerequisites](https://tauri.app/start/prerequisites/) for your platform

### Run Locally

```bash
# Install dependencies
npm install

# Start dev server (opens Tauri window + hot-reload)
npm run tauri dev
```

### Build Release

```bash
npm run tauri build
```

The installer will be in `src-tauri/target/release/bundle/`.

---

## Landing Page

The `landing/` directory contains a standalone static marketing page. Open `landing/index.html` directly in any browser — no build step required.

To host it, deploy the `landing/` folder to GitHub Pages, Netlify, or any static host.

---

## License

MIT — see [LICENSE](LICENSE)
