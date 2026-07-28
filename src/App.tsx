import { useState, useEffect } from "react";
import { safeInvoke as invoke, isTauri } from "@/lib/tauriShim";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BucketBrowser } from "@/components/BucketBrowser";
import { StatusBar, type StatusType } from "@/components/StatusBar";
import { LandingPage } from "@/components/LandingPage";
import { ProfileManager, saveStoredProfiles, loadStoredProfiles } from "@/components/ProfileManager";
import { getPresetById } from "@/lib/presets";
import { ProviderPresetId, ConnectionProfile } from "@/types/provider";
import { AWS_REGIONS } from "@/lib/awsRegions";
import { OCI_REGIONS } from "@/lib/ociRegions";
import { Lock, ChevronDown, ChevronUp, ArrowLeft, LogOut, LayoutGrid, Loader2, User, Globe, Server, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function App() {
  const localStorageRef = isTauri ? window.localStorage : window.sessionStorage;
  const [showApp, setShowApp] = useState(isTauri);

  // Connection visibility status
  const [isConnected, setIsConnected] = useState(false);
  const [activePresetId, setActivePresetId] = useState<ProviderPresetId>("aws");
  const [rememberConnection, setRememberConnection] = useState(true);

  // Active Connection Config Form State
  const [endpoint, setEndpoint] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [forcePathStyle, setForcePathStyle] = useState(false);
  const [profileName, setProfileName] = useState("default");
  const [ociNamespace, setOciNamespace] = useState("");

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [credsExistInAwsFile, setCredsExistInAwsFile] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [buckets, setBuckets] = useState<string[]>([]);

  // Status state
  const [status, setStatus] = useState<StatusType>("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const activePreset = getPresetById(activePresetId);

  const handleStatus = (s: StatusType, msg: string) => {
    setStatus(s);
    setStatusMsg(msg);
    if (s === "success") {
      checkCredentialsFile(activePresetId, profileName);
      if (rememberConnection) {
        localStorageRef.setItem("auto_connect", "true");
        localStorageRef.setItem("active_preset", activePresetId);
        localStorageRef.setItem("config_endpoint", endpoint);
        localStorageRef.setItem("config_region", region);
        localStorageRef.setItem("config_access_key", accessKeyId);
        localStorageRef.setItem("config_secret_key", secretAccessKey);
        localStorageRef.setItem("config_force_path_style", String(forcePathStyle));
        localStorageRef.setItem("config_profile_name", profileName);
        localStorageRef.setItem("config_oci_namespace", ociNamespace);
      }
      setTimeout(() => setStatus("idle"), 5000);
    } else if (s === "error") {
      if (!isConnected) {
        localStorageRef.setItem("auto_connect", "false");
        setIsConnected(false);
      }
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  const checkCredentialsFile = (providerId: string, profName: string) => {
    if (isTauri) {
      invoke<boolean>("check_credentials_exist", {
        provider: providerId,
        profileName: profName || undefined,
      })
        .then(setCredsExistInAwsFile)
        .catch(console.error);
    }
  };

  const handleApplyPreset = (presetId: ProviderPresetId) => {
    setActivePresetId(presetId);
    const preset = getPresetById(presetId);
    setEndpoint(preset.defaultEndpoint || "");
    setRegion(preset.defaultRegion || "us-east-1");
    setForcePathStyle(preset.forcePathStyle);
    const targetProfile = preset.credentialsProfileDefault || "default";
    setProfileName(targetProfile);
    checkCredentialsFile(presetId, targetProfile);
  };

  const handleSelectProfile = (prof: ConnectionProfile) => {
    setActivePresetId(prof.provider);
    setEndpoint(prof.endpoint || "");
    setRegion(prof.region || "us-east-1");
    setAccessKeyId(prof.accessKeyId || "");
    setSecretAccessKey(prof.secretAccessKey || "");
    setForcePathStyle(prof.forcePathStyle);
    setProfileName(prof.profileName || "default");
    checkCredentialsFile(prof.provider, prof.profileName);
    handleStatus("success", `Loaded profile "${prof.name}"`);
  };

  const handleSaveCurrentProfile = (name: string) => {
    const profiles = loadStoredProfiles();
    const newProf: ConnectionProfile = {
      id: `prof_${Date.now()}`,
      name,
      provider: activePresetId,
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
      forcePathStyle,
      useAwsCredentialsFile: !accessKeyId && !secretAccessKey,
      profileName,
      updatedAt: new Date().toISOString(),
    };
    const updated = [newProf, ...profiles.filter((p) => p.name !== name)];
    saveStoredProfiles(updated);
    handleStatus("success", `Profile "${name}" saved!`);
  };

  const handleConnect = async (overridePreset?: ProviderPresetId) => {
    setConnecting(true);
    const presetId = overridePreset || activePresetId;
    const preset = getPresetById(presetId);

    let effectiveEndpoint = endpoint;
    if (presetId === "oci" && ociNamespace && (!endpoint || endpoint.includes("{namespace}"))) {
      const ociReg = OCI_REGIONS.find((r) => r.value === region);
      if (ociReg) {
        effectiveEndpoint = ociReg.endpoint.replace("{namespace}", ociNamespace);
      }
    }

    handleStatus("loading", `Connecting to ${preset.name}…`);

    try {
      if (isTauri && accessKeyId && secretAccessKey) {
        await invoke("save_credentials", {
          provider: presetId,
          accessKeyId,
          secretAccessKey,
          profileName: profileName || preset.credentialsProfileDefault || "default",
        });
      }

      const result = await invoke<string[]>("list_buckets", {
        provider: presetId,
        region: region || preset.defaultRegion || "us-east-1",
        endpoint: effectiveEndpoint || null,
        accessKeyId: accessKeyId || null,
        secretAccessKey: secretAccessKey || null,
        forcePathStyle,
        profileName: profileName || preset.credentialsProfileDefault || "default",
      });

      setBuckets(result);
      handleStatus(
        "success",
        `Connected to ${preset.name} — found ${result.length} bucket${result.length !== 1 ? "s" : ""}`
      );
      setIsConnected(true);
    } catch (e: any) {
      handleStatus("error", `Connection failed: ${e.message || e}`);
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    const savedPreset = (localStorageRef.getItem("active_preset") as ProviderPresetId) || "aws";
    setActivePresetId(savedPreset);

    const preset = getPresetById(savedPreset);
    setEndpoint(localStorageRef.getItem("config_endpoint") || preset.defaultEndpoint || "");
    setRegion(localStorageRef.getItem("config_region") || preset.defaultRegion || "us-east-1");
    setAccessKeyId(localStorageRef.getItem("config_access_key") || "");
    setSecretAccessKey(localStorageRef.getItem("config_secret_key") || "");
    setForcePathStyle(localStorageRef.getItem("config_force_path_style") === "true" || preset.forcePathStyle);
    setProfileName(localStorageRef.getItem("config_profile_name") || preset.credentialsProfileDefault || "default");
    setOciNamespace(localStorageRef.getItem("config_oci_namespace") || "");

    checkCredentialsFile(savedPreset, localStorageRef.getItem("config_profile_name") || preset.credentialsProfileDefault || "default");

    const autoConnect = localStorageRef.getItem("auto_connect") === "true";
    if (autoConnect && savedPreset) {
      setTimeout(() => {
        handleConnect(savedPreset);
      }, 50);
    }
  }, [showApp]);

  const handleOciRegionChange = (val: string) => {
    setRegion(val);
    const reg = OCI_REGIONS.find((r) => r.value === val);
    if (reg && ociNamespace) {
      setEndpoint(reg.endpoint.replace("{namespace}", ociNamespace));
    } else if (reg) {
      setEndpoint(reg.endpoint);
    }
  };

  const handleOciNamespaceChange = (ns: string) => {
    setOciNamespace(ns);
    if (activePresetId === "oci") {
      const reg = OCI_REGIONS.find((r) => r.value === region);
      if (reg) {
        setEndpoint(ns ? reg.endpoint.replace("{namespace}", ns) : reg.endpoint);
      }
    }
  };

  const triggerDisconnect = () => {
    localStorageRef.setItem("auto_connect", "false");
    setIsConnected(false);
  };

  if (!showApp) {
    return <LandingPage onLaunchApp={() => setShowApp(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-slate-950/40">
        {!isTauri && !isConnected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowApp(false)}
            className="mr-2 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Landing Page
          </Button>
        )}
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 overflow-hidden p-1 shrink-0">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-100 leading-none">Vault Drop Explorer</h1>
          <p className="text-xs text-slate-500 mt-0.5">S3 & Self-Hosted Object Storage Browser</p>
        </div>

        {isConnected && (
          <div className="flex items-center gap-2 ml-6 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold uppercase">{activePreset.name}</span>
            <span className="text-slate-600">·</span>
            <span>{region}</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-slate-400 hover:text-emerald-400 cursor-help"
            title="Local Credentials Only: Your access keys are processed and stored entirely on this computer. They are never sent to external servers."
          >
            <Lock className="h-4 w-4" />
          </div>
          <a
            href="https://sanchez.ph"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-slate-400 hover:text-indigo-400 cursor-pointer"
            title="Dev: Alfredo Sanchez, Jr (https://sanchez.ph)"
          >
            <User className="h-4 w-4" />
          </a>
          <a
            href="https://vaultdrop.sanchez.ph"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-slate-400 hover:text-indigo-400 cursor-pointer"
            title="Launch Web Version (https://vaultdrop.sanchez.ph)"
          >
            <Globe className="h-4 w-4" />
          </a>
          <div className="w-2"></div>
          {isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={triggerDisconnect}
              className="bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400 h-8 px-3 text-xs"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Disconnect
            </Button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 flex flex-col min-h-0">
        {!isTauri && (
          <div className={`w-full ${isConnected ? "max-w-4xl" : "max-w-xl"} mx-auto mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex flex-col gap-1 shadow-lg`}>
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              ⚠️ Web Demo Mode Active
            </span>
            <span>
              To protect your credentials, connection and file operations are simulated. Download the desktop app to access your MinIO, S3, or self-hosted servers locally.
            </span>
          </div>
        )}

        {isConnected ? (
          <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col min-h-0">
            <BucketBrowser
              provider={activePresetId}
              region={region}
              endpoint={endpoint || undefined}
              accessKeyId={accessKeyId || undefined}
              secretAccessKey={secretAccessKey || undefined}
              forcePathStyle={forcePathStyle}
              profileName={profileName}
              initialBuckets={buckets}
              onStatus={handleStatus}
            />
          </div>
        ) : (
          <div className="w-full max-w-xl mx-auto space-y-4">
            {/* Top Toolbar: Saved Profiles & Presets */}
            <div className="bg-slate-900/60 border border-white/10 p-3 rounded-xl shadow-lg">
              <ProfileManager
                currentProfile={{
                  provider: activePresetId,
                  endpoint,
                  region,
                  accessKeyId,
                  secretAccessKey,
                  forcePathStyle,
                  profileName,
                }}
                onSelectProfile={handleSelectProfile}
                onApplyPreset={handleApplyPreset}
                onSaveCurrentProfile={handleSaveCurrentProfile}
                onNotify={(msg, type) => handleStatus(type === 'error' ? 'error' : 'success', msg)}
              />
            </div>

            {/* Main Provider Connection Form */}
            <Card className="bg-slate-900/40 border-white/5 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Server className="h-5 w-5 text-indigo-400" />
                      {activePreset.name} Configuration
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {activePreset.description}
                    </CardDescription>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
                    {activePreset.category}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Endpoint URL Field (required for self-hosted / custom endpoints) */}
                {(activePreset.requiresEndpoint || activePresetId === "minio" || activePresetId === "custom" || activePresetId === "localstack") && (
                  <div className="space-y-1.5">
                    <Label htmlFor="endpoint-url" className="text-xs flex items-center justify-between">
                      <span>Server Endpoint URL</span>
                      <span className="text-[10px] text-slate-500">e.g. http://localhost:9000</span>
                    </Label>
                    <Input
                      id="endpoint-url"
                      placeholder="http://localhost:9000"
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                    />
                  </div>
                )}

                {/* OCI Special Tenancy Namespace Input */}
                {activePresetId === "oci" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="oci-namespace" className="text-xs">Tenancy Namespace</Label>
                    <Input
                      id="oci-namespace"
                      placeholder="e.g. axhz1oupce..."
                      value={ociNamespace}
                      onChange={(e) => handleOciNamespaceChange(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-500">
                      Find in OCI Console → Tenancy Details → Object Storage Namespace
                    </p>
                  </div>
                )}

                {/* Region Selector or Text Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="region-input" className="text-xs">Region</Label>
                  {activePresetId === "aws" ? (
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger id="region-input">
                        <SelectValue placeholder="Select an AWS region" />
                      </SelectTrigger>
                      <SelectContent>
                        {AWS_REGIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label} <span className="text-slate-500 text-xs ml-1">({r.value})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : activePresetId === "oci" ? (
                    <Select value={region} onValueChange={handleOciRegionChange}>
                      <SelectTrigger id="region-input">
                        <SelectValue placeholder="Select an OCI region" />
                      </SelectTrigger>
                      <SelectContent>
                        {OCI_REGIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label} <span className="text-slate-500 text-xs ml-1">({r.value})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="region-input"
                      placeholder="us-east-1"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                    />
                  )}
                </div>

                {/* Credentials Profile Box & Key Inputs */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Access Key Credentials</span>
                    {credsExistInAwsFile ? (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle className="h-3 w-3" /> Found [{profileName}] in ~/.aws/credentials
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-400 font-medium">
                        Enter keys below to auto-save to [{profileName}] profile
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="access-key" className="text-[11px] text-slate-400">Access Key ID</Label>
                      <Input
                        id="access-key"
                        placeholder={credsExistInAwsFile && !accessKeyId ? `Using ~/.aws/credentials [${profileName}]` : "Access Key / MinIO Username"}
                        value={accessKeyId}
                        onChange={(e) => setAccessKeyId(e.target.value)}
                        type="password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="secret-key" className="text-[11px] text-slate-400">Secret Access Key</Label>
                      <Input
                        id="secret-key"
                        placeholder={credsExistInAwsFile && !secretAccessKey ? `Using ~/.aws/credentials [${profileName}]` : "Secret Key / MinIO Password"}
                        value={secretAccessKey}
                        onChange={(e) => setSecretAccessKey(e.target.value)}
                        type="password"
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Options Toggle (Force Path Style & Custom AWS Profile Name) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
                  >
                    {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Advanced S3 Settings (Path Style & Profile Tag)
                  </button>
                  {showAdvanced && (
                    <div className="mt-2 space-y-3 p-3 bg-slate-950/40 border border-slate-800 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="force-path-style"
                          checked={forcePathStyle}
                          onChange={(e) => setForcePathStyle(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <Label htmlFor="force-path-style" className="text-xs text-slate-300 cursor-pointer">
                          Force Path-Style Access (<code className="text-indigo-300">http://endpoint/bucket</code>) — Required for MinIO & LocalStack
                        </Label>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="aws-profile-name" className="text-[11px] text-slate-400">
                          Credentials Profile Name (in <code className="text-slate-300">~/.aws/credentials</code>)
                        </Label>
                        <Input
                          id="aws-profile-name"
                          placeholder="default"
                          value={profileName}
                          onChange={(e) => {
                            setProfileName(e.target.value);
                            checkCredentialsFile(activePresetId, e.target.value);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto Connect Toggle Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="remember-connection"
                    checked={rememberConnection}
                    onChange={(e) => setRememberConnection(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <Label htmlFor="remember-connection" className="text-xs text-slate-400 cursor-pointer">
                    Remember connection and auto-connect next time
                  </Label>
                </div>

                {/* Connect Button */}
                <Button
                  id="connect-btn"
                  onClick={() => handleConnect()}
                  disabled={connecting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-600/20 py-6 transition-all duration-200 mt-2"
                  size="lg"
                >
                  {connecting ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <LayoutGrid className="h-5 w-5 mr-2" />
                  )}
                  {connecting ? `Connecting to ${activePreset.name}…` : `Connect & List Buckets`}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <StatusBar
        status={status}
        message={statusMsg}
        onDismiss={() => setStatus("idle")}
      />
    </div>
  );
}
