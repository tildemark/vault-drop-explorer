import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  FolderOpen,
  File,
  Upload,
  Download,
  ChevronRight,
  Loader2,
  LayoutGrid,
  Eye,
  X,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Plus,
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
  onConnectStateChange?: (connected: boolean) => void;
  disconnectTrigger?: number; // Used by parent to trigger disconnect
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

const isImageFile = (key: string) => {
  const ext = key.split(".").pop()?.toLowerCase();
  return ext ? ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext) : false;
};

const getFileIcon = (key: string, isFolder: boolean) => {
  if (isFolder) return <FolderOpen className="h-5 w-5 text-amber-400 shrink-0" />;
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext && ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
    return <ImageIcon className="h-5 w-5 text-emerald-400 shrink-0" />;
  }
  if (ext && ["pdf", "doc", "docx", "txt", "md"].includes(ext)) {
    return <FileText className="h-5 w-5 text-blue-400 shrink-0" />;
  }
  if (ext && ["xls", "xlsx", "csv"].includes(ext)) {
    return <FileSpreadsheet className="h-5 w-5 text-green-400 shrink-0" />;
  }
  return <File className="h-5 w-5 text-slate-400 shrink-0" />;
};

export function BucketBrowser({
  provider,
  region,
  endpoint,
  accessKeyId,
  secretAccessKey,
  onStatus,
  onConnectStateChange,
  disconnectTrigger = 0,
}: BucketBrowserProps) {
  const [buckets, setBuckets] = useState<string[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [prefix, setPrefix] = useState<string>("");
  const [connecting, setConnecting] = useState(false);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [operatingOn, setOperatingOn] = useState<string | null>(null);

  // Bucket creation states
  const [creatingBucket, setCreatingBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");
  const [isSubmittingBucket, setIsSubmittingBucket] = useState(false);

  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);

  // Preview states
  const [previewObject, setPreviewObject] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const disconnect = () => {
    setBuckets([]);
    setSelectedBucket(null);
    setObjects([]);
    setPrefix("");
    if (onConnectStateChange) onConnectStateChange(false);
  };

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;
    setIsSubmittingBucket(true);
    onStatus("loading", `Creating bucket '${newBucketName}'…`);
    try {
      await invoke("create_bucket", {
        provider,
        region,
        bucket: newBucketName.trim(),
        endpoint: endpoint ?? null,
        accessKeyId: accessKeyId ?? null,
        secretAccessKey: secretAccessKey ?? null,
      });
      onStatus("success", `Bucket '${newBucketName}' created successfully!`);
      const result = await invoke<string[]>("list_buckets", {
        provider,
        region,
        endpoint: endpoint ?? null,
        accessKeyId: accessKeyId ?? null,
        secretAccessKey: secretAccessKey ?? null,
      });
      setBuckets(result);
      setNewBucketName("");
      setCreatingBucket(false);
    } catch (err) {
      onStatus("error", `Failed to create bucket: ${err}`);
    } finally {
      setIsSubmittingBucket(false);
    }
  };

  useEffect(() => {
    if (disconnectTrigger > 0) {
      disconnect();
    }
  }, [disconnectTrigger]);

  const connect = async () => {
    setConnecting(true);
    onStatus("loading", "Connecting and listing buckets…");
    try {
      // Save credentials first if inline ones were typed in the UI
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
      if (onConnectStateChange) onConnectStateChange(true);
    } catch (e) {
      onStatus("error", `Connection failed: ${e}`);
      if (onConnectStateChange) onConnectStateChange(false);
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

  // Tauri Native Window Drag and Drop Listener
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    
    async function setupDragDrop() {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        const unsubscribe = await appWindow.onDragDropEvent(async (event) => {
          if (!selectedBucket) return;
          
          if (event.payload.type === "enter" || event.payload.type === "over") {
            setIsDragging(true);
          } else if (event.payload.type === "leave") {
            setIsDragging(false);
          } else if (event.payload.type === "drop") {
            setIsDragging(false);
            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
              onStatus("loading", `Uploading ${paths.length} file(s)…`);
              for (const filePath of paths) {
                const fileName = filePath.split(/[\\/]/).pop() ?? "upload";
                const objectKey = prefix + fileName;
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
                } catch (err) {
                  onStatus("error", `Upload failed for ${fileName}: ${err}`);
                }
              }
              onStatus("success", `Uploaded files successfully!`);
              await loadObjects(selectedBucket, prefix);
            }
          }
        });
        unlisten = unsubscribe;
      } catch (e) {
        console.error("Failed to setup Tauri drag-drop listener:", e);
      }
    }

    setupDragDrop();

    // Prevent default browser drag/drop behaviors globally to avoid page navigation
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", preventDefault, false);
    window.addEventListener("drop", preventDefault, false);

    return () => {
      if (unlisten) unlisten();
      window.removeEventListener("dragover", preventDefault, false);
      window.removeEventListener("drop", preventDefault, false);
    };
  }, [selectedBucket, prefix, provider, region, endpoint, accessKeyId, secretAccessKey]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (selectedBucket) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Preview loader
  const handlePreview = async (obj: S3Object) => {
    setPreviewObject(obj.key);
    setLoadingPreview(true);
    setPreviewData(null);
    try {
      const base64Data = await invoke<string>("get_object_preview", {
        provider,
        region,
        bucket: selectedBucket,
        objectName: obj.key,
        endpoint: endpoint ?? null,
        accessKeyId: accessKeyId ?? null,
        secretAccessKey: secretAccessKey ?? null,
      });
      const ext = obj.key.split(".").pop()?.toLowerCase();
      const mime = ext === "svg" ? "image/svg+xml" : `image/${ext || "png"}`;
      setPreviewData(`data:${mime};base64,${base64Data}`);
    } catch (e) {
      onStatus("error", `Failed to load preview: ${e}`);
      setPreviewObject(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Back navigation for folder structure
  const navigateBack = () => {
    if (!prefix) return;
    const parts = prefix.split("/").filter(Boolean);
    parts.pop();
    const newPrefix = parts.length > 0 ? parts.join("/") + "/" : "";
    loadObjects(selectedBucket!, newPrefix);
  };

  // Renders connection block when NOT connected
  if (buckets.length === 0) {
    return (
      <Button
        id={`connect-${provider}`}
        onClick={connect}
        disabled={connecting || !region}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-600/20 py-6 transition-all duration-200"
        size="lg"
      >
        {connecting ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <LayoutGrid className="h-5 w-5 mr-2" />
        )}
        {connecting ? "Connecting to Cloud Account…" : "Connect & List Buckets"}
      </Button>
    );
  }

  return (
    <div className="flex bg-slate-900/60 border border-white/5 rounded-xl overflow-hidden flex-1 min-h-0 w-full">
      {/* Sidebar: Bucket list */}
      <div className="w-[200px] border-r border-white/5 bg-slate-950/40 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            Buckets ({buckets.length})
          </p>
          <button
            id="btn-create-bucket"
            onClick={() => setCreatingBucket((v) => !v)}
            className="text-slate-400 hover:text-white p-0.5 rounded transition-all hover:bg-white/5"
            title="Create Bucket"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {creatingBucket && (
          <form onSubmit={handleCreateBucket} className="space-y-1.5 shrink-0 bg-white/3 border border-white/5 p-2 rounded-lg">
            <input
              type="text"
              placeholder="Bucket name..."
              value={newBucketName}
              onChange={(e) => setNewBucketName(e.target.value)}
              disabled={isSubmittingBucket}
              className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <div className="flex gap-1 justify-end">
              <button
                type="button"
                onClick={() => setCreatingBucket(false)}
                className="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingBucket}
                className="text-[9px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {buckets.map((b) => (
            <button
              key={b}
              onClick={() => selectBucket(b)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left transition-all duration-150 ${
                selectedBucket === b
                  ? "bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-semibold"
                  : "bg-transparent border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <FolderOpen className={`h-4 w-4 shrink-0 ${selectedBucket === b ? "text-indigo-400" : "text-slate-500"}`} />
              <span className="truncate">{b}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Area: Object explorer */}
      <div
        className="flex-1 flex flex-col min-w-0 relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag over overlay dropzone */}
        {isDragging && (
          <div className="absolute inset-0 bg-indigo-950/80 backdrop-filter backdrop-blur-md z-30 flex flex-col items-center justify-center border-2 border-dashed border-indigo-500/50 m-2 rounded-xl transition-all duration-200">
            <Upload className="h-12 w-12 text-indigo-400 animate-bounce mb-3" />
            <p className="text-sm font-semibold text-indigo-200">Drop files here to upload</p>
            <p className="text-xs text-indigo-500 mt-1">Uploading to: {prefix || "/"}</p>
          </div>
        )}

        {selectedBucket ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-slate-950/20 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
                {prefix && (
                  <button
                    onClick={navigateBack}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium mr-2 shrink-0"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back
                  </button>
                )}
                <span className="font-semibold text-slate-300 shrink-0">{selectedBucket}</span>
                <ChevronRight className="h-3 w-3 text-slate-600 shrink-0" />
                <span className="truncate text-slate-400">{prefix || "/"}</span>
              </div>
              <Button
                id={`upload-${provider}`}
                variant="outline"
                size="sm"
                onClick={handleUpload}
                disabled={operatingOn !== null}
                className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border-indigo-500/20 shrink-0 text-xs px-3 h-8"
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                Upload File
              </Button>
            </div>

            {/* Object List */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {loadingObjects ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                  <p className="text-xs text-slate-500 mt-2">Fetching object list…</p>
                </div>
              ) : objects.length === 0 ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleUpload}
                  className="border-2 border-dashed border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer h-[240px] max-w-md mx-auto my-6"
                >
                  <Upload className="h-10 w-10 text-indigo-400/80 mb-3 animate-pulse" />
                  <p className="text-sm font-semibold text-slate-200">Drag & Drop files here</p>
                  <p className="text-xs text-slate-500 mt-1 text-center">Or click to select files from your computer</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    {objects.map((obj) => {
                      const isFolder = obj.key.endsWith("/");
                      const displayName = obj.key.replace(prefix, "").replace(/\/$/, "");
                      return (
                        <div
                          key={obj.key}
                          onClick={() => {
                            if (isFolder) {
                              loadObjects(selectedBucket, obj.key);
                            }
                          }}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/3 border border-white/5 hover:bg-white/8 hover:border-white/10 group transition-all duration-150 ${isFolder ? 'cursor-pointer' : ''}`}
                        >
                          {getFileIcon(obj.key, isFolder)}
                          <span className="text-xs text-slate-200 flex-1 truncate font-medium">{displayName}</span>
                          {!isFolder && (
                            <span className="text-[11px] text-slate-500 shrink-0 font-mono">
                              {formatBytes(obj.size)}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                            {isImageFile(obj.key) && !isFolder && (
                              <button
                                onClick={() => handlePreview(obj)}
                                className="text-slate-400 hover:text-indigo-400 p-1 rounded hover:bg-white/5 transition-all"
                                title="Preview Image"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                            {!isFolder && (
                              <button
                                onClick={() => handleDownload(obj)}
                                disabled={operatingOn === obj.key}
                                className="text-slate-400 hover:text-indigo-400 p-1 rounded hover:bg-white/5 transition-all disabled:opacity-30"
                                title="Download File"
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
                                className="text-slate-400 hover:text-indigo-400 p-1 rounded hover:bg-white/5 transition-all"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dedicated visual drag and drop zone at bottom of files list */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleUpload}
                    className="border border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-xl p-4 flex flex-col items-center justify-center transition-all cursor-pointer group/drop"
                  >
                    <Upload className="h-5 w-5 text-slate-500 group-hover/drop:text-indigo-400 mb-1 transition-colors" />
                    <p className="text-xs font-semibold text-slate-400 group-hover/drop:text-slate-200 transition-colors">
                      Drag & Drop more files here to upload
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">Or click to upload files manually</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-slate-500 text-sm">
            <FolderOpen className="h-12 w-12 mb-3 opacity-20 text-indigo-400" />
            <p className="font-semibold text-slate-300">No bucket selected</p>
            <p className="text-xs text-slate-600 mt-1">Please select a bucket from the sidebar to browse files.</p>
          </div>
        )}
      </div>

      {/* Sleek Image Preview Modal */}
      {previewObject && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0 bg-slate-950/20">
              <span className="text-xs font-semibold text-slate-300 truncate max-w-md">
                {previewObject.split("/").pop()}
              </span>
              <button
                onClick={() => setPreviewObject(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Image View */}
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/40 overflow-hidden min-h-0">
              {loadingPreview ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                  <p className="text-xs text-slate-500 mt-2">Loading image preview…</p>
                </div>
              ) : previewData ? (
                <img
                  src={previewData}
                  alt={previewObject}
                  className="max-w-full max-h-[50vh] object-contain rounded-lg border border-white/5 bg-slate-900 shadow-lg"
                />
              ) : (
                <p className="text-xs text-slate-500">Failed to load preview</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-white/5 flex justify-end gap-3 bg-slate-950/20 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewObject(null)}
                className="text-xs"
              >
                Close
              </Button>
              {!loadingPreview && (
                <Button
                  size="sm"
                  onClick={() => {
                    const obj = objects.find((o) => o.key === previewObject);
                    if (obj) handleDownload(obj);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-xs"
                >
                  <Download className="h-4.5 w-4.5 mr-1" />
                  Download File
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
