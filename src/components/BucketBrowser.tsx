import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  FolderOpen,
  File,
  Upload,
  Download,
  ChevronRight,
  Loader2,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import type { StatusType } from "@/components/StatusBar";

interface BucketBrowserProps {
  provider: "aws" | "oci";
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  onStatus: (status: StatusType, message: string) => void;
}

interface S3Object {
  key: string;
  size: number;
  lastModified: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function BucketBrowser({
  provider,
  region,
  endpoint,
  accessKeyId,
  secretAccessKey,
  onStatus,
}: BucketBrowserProps) {
  const [buckets, setBuckets] = useState<string[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [prefix, setPrefix] = useState<string>("");
  const [connecting, setConnecting] = useState(false);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [operatingOn, setOperatingOn] = useState<string | null>(null);

  const connect = async () => {
    setConnecting(true);
    onStatus("loading", "Connecting and listing buckets…");
    try {
      // If credentials were manually provided in the UI, write them to ~/.aws/credentials
      if (accessKeyId && secretAccessKey) {
        await invoke("save_credentials", {
          provider,
          accessKeyId,
          secretAccessKey,
        });
      }

      const result = await invoke<string[]>("list_buckets", {
        provider,
        region,
        endpoint: endpoint ?? null,
        accessKeyId: accessKeyId ?? null,
        secretAccessKey: secretAccessKey ?? null,
      });
      setBuckets(result);
      setSelectedBucket(null);
      setObjects([]);
      setPrefix("");
      onStatus("success", `Connected — found ${result.length} bucket${result.length !== 1 ? "s" : ""}`);
    } catch (e) {
      onStatus("error", `Connection failed: ${e}`);
    } finally {
      setConnecting(false);
    }
  };

  const selectBucket = async (bucket: string) => {
    setSelectedBucket(bucket);
    setPrefix("");
    await loadObjects(bucket, "");
  };

  const loadObjects = async (bucket: string, pfx: string) => {
    setLoadingObjects(true);
    try {
      const result = await invoke<S3Object[]>("list_objects", {
        provider,
        region,
        bucket,
        prefix: pfx,
        endpoint: endpoint ?? null,
        accessKeyId: accessKeyId ?? null,
        secretAccessKey: secretAccessKey ?? null,
      });
      setObjects(result);
      setPrefix(pfx);
    } catch (e) {
      onStatus("error", `Failed to list objects: ${e}`);
    } finally {
      setLoadingObjects(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedBucket) return;
    const filePath = await openDialog({
      multiple: false,
      title: "Select file to upload",
    });
    if (!filePath) return;

    const fileName = (filePath as string).split(/[\\/]/).pop() ?? "upload";
    const objectKey = prefix + fileName;
    setOperatingOn(objectKey);
    onStatus("loading", `Uploading ${fileName}…`);
    try {
      await invoke("upload_to_cloud", {
        provider,
        region,
        bucket: selectedBucket,
        objectName: objectKey,
        filePath,
        endpoint: endpoint ?? null,
        accessKeyId: accessKeyId ?? null,
        secretAccessKey: secretAccessKey ?? null,
      });
      onStatus("success", `${fileName} uploaded successfully`);
      await loadObjects(selectedBucket, prefix);
    } catch (e) {
      onStatus("error", `Upload failed: ${e}`);
    } finally {
      setOperatingOn(null);
    }
  };

  const handleDownload = async (obj: S3Object) => {
    const fileName = obj.key.split("/").pop() ?? obj.key;
    const savePath = await saveDialog({
      defaultPath: fileName,
      title: "Save file as",
    });
    if (!savePath) return;

    setOperatingOn(obj.key);
    onStatus("loading", `Downloading ${fileName}…`);
    try {
      await invoke("download_from_cloud", {
        provider,
        region,
        bucket: selectedBucket,
        objectName: obj.key,
        savePath,
        endpoint: endpoint ?? null,
        accessKeyId: accessKeyId ?? null,
        secretAccessKey: secretAccessKey ?? null,
      });
      onStatus("success", `${fileName} saved successfully`);
    } catch (e) {
      onStatus("error", `Download failed: ${e}`);
    } finally {
      setOperatingOn(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Connect button */}
      <Button
        id={`connect-${provider}`}
        onClick={connect}
        disabled={connecting || !region}
        className="w-full"
        size="lg"
      >
        {connecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LayoutGrid className="h-4 w-4" />
        )}
        {connecting ? "Connecting…" : buckets.length > 0 ? "Reconnect" : "Connect & List Buckets"}
      </Button>

      {/* Bucket list */}
      {buckets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
            Buckets ({buckets.length})
          </p>
          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
            {buckets.map((b) => (
              <button
                key={b}
                onClick={() => selectBucket(b)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all duration-200 ${
                  selectedBucket === b
                    ? "bg-indigo-600/30 border border-indigo-500/50 text-indigo-300"
                    : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">{b}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Object browser */}
      {selectedBucket && (
        <div className="space-y-2">
          {/* Breadcrumb + actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-slate-400 min-w-0">
              <button
                onClick={() => loadObjects(selectedBucket, "")}
                className="hover:text-slate-200 transition-colors shrink-0"
              >
                {selectedBucket}
              </button>
              {prefix && (
                <>
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <span className="truncate">{prefix}</span>
                </>
              )}
            </div>
            <Button
              id={`upload-${provider}`}
              variant="outline"
              size="sm"
              onClick={handleUpload}
              disabled={operatingOn !== null}
              className="shrink-0 ml-2"
            >
              <Upload className="h-3 w-3" />
              Upload
            </Button>
          </div>

          {/* Object list */}
          {loadingObjects ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            </div>
          ) : objects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-sm">
              <FolderOpen className="h-8 w-8 mb-2 opacity-30" />
              <p>Empty bucket</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {objects.map((obj) => {
                const isFolder = obj.key.endsWith("/");
                const displayName = obj.key.replace(prefix, "").replace(/\/$/, "");
                return (
                  <div
                    key={obj.key}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3 border border-white/5 hover:bg-white/8 group transition-all duration-150"
                  >
                    {isFolder ? (
                      <FolderOpen className="h-4 w-4 text-yellow-400 shrink-0" />
                    ) : (
                      <File className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                    <span className="text-sm text-slate-200 flex-1 truncate">{displayName}</span>
                    {!isFolder && (
                      <span className="text-xs text-slate-500 shrink-0">
                        {formatBytes(obj.size)}
                      </span>
                    )}
                    {!isFolder && (
                      <button
                        onClick={() => handleDownload(obj)}
                        disabled={operatingOn === obj.key}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-slate-400 hover:text-indigo-400 disabled:opacity-30"
                        aria-label={`Download ${displayName}`}
                      >
                        {operatingOn === obj.key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    {isFolder && (
                      <button
                        onClick={() => loadObjects(selectedBucket, obj.key)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-slate-400 hover:text-indigo-400"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
