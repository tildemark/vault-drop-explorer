import { invoke } from "@tauri-apps/api/core";

export const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;

// Mock database for the web browser version
const mockObjects: Record<string, Array<{ key: string; size: number; lastModified: string }>> = {
  "production-assets": [
    { key: "logo.svg", size: 4500, lastModified: "2026-07-01 10:00:00" },
    { key: "images/", size: 0, lastModified: "" },
    { key: "images/banner.png", size: 1204000, lastModified: "2026-07-01 10:05:00" },
    { key: "documents/", size: 0, lastModified: "" },
    { key: "documents/release-notes.pdf", size: 345000, lastModified: "2026-07-01 10:10:00" }
  ],
  "user-backups": [
    { key: "backup-2026-06-30.zip", size: 45000000, lastModified: "2026-06-30 23:59:00" }
  ],
  "temp-uploads": [],
  "static-images": [
    { key: "welcome.webp", size: 53906, lastModified: "2025-11-25 15:00:51" },
    { key: "gallery/", size: 0, lastModified: "" },
    { key: "gallery/tayud1.webp", size: 114620, lastModified: "2025-12-03 16:09:19" }
  ]
};

export async function safeInvoke<T>(cmd: string, args?: any): Promise<T> {
  if (isTauri) {
    return invoke<T>(cmd, args);
  }

  // Web Browser fallbacks
  console.log(`[Web Shim] invoke("${cmd}")`, args);

  // Add artificial delay to simulate network/Rust backend latency
  await new Promise((resolve) => setTimeout(resolve, 600));

  switch (cmd) {
    case "check_credentials_exist":
      return true as unknown as T;

    case "get_env_var":
      return "mock-tenancy-namespace" as unknown as T;

    case "save_credentials":
      return "Credentials saved successfully (Simulated)" as unknown as T;

    case "list_buckets":
      return Object.keys(mockObjects) as unknown as T;

    case "list_objects": {
      const { bucket, prefix = "" } = args || {};
      const bucketObjs = mockObjects[bucket] || [];
      const result: any[] = [];
      const folders = new Set<string>();

      for (const obj of bucketObjs) {
        if (obj.key.startsWith(prefix) && obj.key !== prefix) {
          const remaining = obj.key.slice(prefix.length);
          const slashIdx = remaining.indexOf("/");
          if (slashIdx === -1) {
            // It's a file in this folder
            result.push(obj);
          } else {
            // It's a subfolder
            const folderName = prefix + remaining.slice(0, slashIdx + 1);
            folders.add(folderName);
          }
        }
      }

      // Add folders
      for (const f of folders) {
        result.push({ key: f, size: 0, lastModified: "" });
      }

      return result as unknown as T;
    }

    case "create_bucket": {
      const { bucket } = args || {};
      if (bucket && !mockObjects[bucket]) {
        mockObjects[bucket] = [];
      }
      return `Bucket '${bucket}' created successfully (Simulated)` as unknown as T;
    }

    case "upload_to_cloud": {
      const { bucket, objectName } = args || {};
      if (bucket && objectName) {
        if (!mockObjects[bucket]) mockObjects[bucket] = [];
        // Remove existing if any
        mockObjects[bucket] = mockObjects[bucket].filter((o) => o.key !== objectName);
        mockObjects[bucket].push({
          key: objectName,
          size: Math.floor(Math.random() * 150000) + 1000,
          lastModified: new Date().toISOString().replace("T", " ").slice(0, 19)
        });
      }
      return `Uploaded successfully (Simulated)` as unknown as T;
    }

    case "download_from_cloud":
      return `Downloaded successfully (Simulated)` as unknown as T;

    case "delete_object": {
      const { bucket, objectName } = args || {};
      if (bucket && objectName && mockObjects[bucket]) {
        mockObjects[bucket] = mockObjects[bucket].filter((o) => o.key !== objectName);
      }
      return `Deleted successfully (Simulated)` as unknown as T;
    }

    case "get_object_preview":
      // Return a base64 encoded small generic green dot SVG
      return "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQwIiBmaWxsPSIjMTBiOTgxIi8+PC9zdmc+" as unknown as T;

    default:
      throw new Error(`Command not implemented in browser shim: ${cmd}`);
  }
}

export async function safeOpenDialog(options?: any): Promise<string | null> {
  if (isTauri) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    return open(options) as Promise<string | null>;
  }

  // Browser fallback: programmatic file upload selector
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      resolve(file ? file.name : null);
    };
    input.onerror = () => resolve(null);
    input.click();
  });
}

export async function safeSaveDialog(options?: any): Promise<string | null> {
  if (isTauri) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    return save(options);
  }

  // Browser fallback
  const defaultPath = options?.defaultPath || "downloaded-file";
  const res = prompt("Save file as (Simulated):", defaultPath);
  return res || null;
}

export async function safeAsk(message: string, options?: any): Promise<boolean> {
  if (isTauri) {
    const { ask } = await import("@tauri-apps/plugin-dialog");
    return ask(message, options);
  }

  // Browser fallback
  return window.confirm(message);
}
