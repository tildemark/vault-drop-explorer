import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { AWS_REGIONS } from "@/lib/awsRegions";
import { OCI_REGIONS } from "@/lib/ociRegions";
import { Cloud, Lock, ChevronDown, ChevronUp, ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function App() {
  const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
  const [showApp, setShowApp] = useState(isTauri);

  // Connection visibility status
  const [isConnected, setIsConnected] = useState(false);
  const [disconnectTrigger, setDisconnectTrigger] = useState(0);
  const [activeProvider, setActiveProvider] = useState<"aws" | "oci">("aws");
  const [rememberConnection, setRememberConnection] = useState(true);

  // Credential presence states
  const [awsCredsExist, setAwsCredsExist] = useState(true);
  const [ociCredsExist, setOciCredsExist] = useState(true);

  // AWS state
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [awsAccessKey, setAwsAccessKey] = useState("");
  const [awsSecretKey, setAwsSecretKey] = useState("");

  // OCI state
  const [ociRegion, setOciRegion] = useState("us-phoenix-1");
  const [ociNamespace, setOciNamespace] = useState("");
  const [ociEndpoint, setOciEndpoint] = useState("");
  const [showOciAdvanced, setShowOciAdvanced] = useState(false);
  const [ociAccessKeyId, setOciAccessKeyId] = useState("");
  const [ociSecretAccessKey, setOciSecretAccessKey] = useState("");

  // Check for credentials file profile existence
  const checkCredentials = () => {
    if (isTauri) {
      invoke<boolean>("check_credentials_exist", { provider: "aws" })
        .then(setAwsCredsExist)
        .catch(console.error);
      invoke<boolean>("check_credentials_exist", { provider: "oci" })
        .then(setOciCredsExist)
        .catch(console.error);
    }
  };

  useEffect(() => {
    checkCredentials();

    // Load saved settings
    const savedAwsRegion = localStorage.getItem("aws_region");
    if (savedAwsRegion) setAwsRegion(savedAwsRegion);

    const savedOciRegion = localStorage.getItem("oci_region") || "us-phoenix-1";
    setOciRegion(savedOciRegion);

    const savedOciNamespace = localStorage.getItem("oci_namespace");
    if (savedOciNamespace) {
      setOciNamespace(savedOciNamespace);
      const region = OCI_REGIONS.find((r) => r.value === savedOciRegion);
      if (region) {
        setOciEndpoint(region.endpoint.replace("{namespace}", savedOciNamespace));
      }
    } else if (isTauri) {
      // Attempt to load namespace from .env file process variables
      invoke<string>("get_env_var", { name: "OCI_TENANCY" })
        .then((val) => {
          if (val) {
            setOciNamespace(val);
            const region = OCI_REGIONS.find((r) => r.value === savedOciRegion);
            if (region) {
              setOciEndpoint(region.endpoint.replace("{namespace}", val));
            }
          }
        })
        .catch(() => {
          invoke<string>("get_env_var", { name: "OCI_NAMESPACE" })
            .then((val) => {
              if (val) {
                setOciNamespace(val);
                const region = OCI_REGIONS.find((r) => r.value === savedOciRegion);
                if (region) {
                  setOciEndpoint(region.endpoint.replace("{namespace}", val));
                }
              }
            })
            .catch(console.error);
        });
    }

    if (isTauri) {
      // Attempt to load keys from .env process variables
      invoke<string>("get_env_var", { name: "OCI_ACCESS_KEY_ID" })
        .then(setOciAccessKeyId)
        .catch(console.error);
      invoke<string>("get_env_var", { name: "OCI_SECRET_ACCESS_KEY" })
        .then(setOciSecretAccessKey)
        .catch(console.error);
    }

    const savedProvider = localStorage.getItem("active_provider") as "aws" | "oci" | null;
    if (savedProvider) setActiveProvider(savedProvider);

    const autoConnect = localStorage.getItem("auto_connect") === "true";
    if (autoConnect && savedProvider) {
      setIsConnected(true);
    }
  }, [showApp]);

  // Status
  const [status, setStatus] = useState<StatusType>("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const handleStatus = (s: StatusType, msg: string) => {
    setStatus(s);
    setStatusMsg(msg);
    if (s === "success") {
      checkCredentials();
      if (rememberConnection) {
        localStorage.setItem("auto_connect", "true");
        localStorage.setItem("active_provider", activeProvider);
        localStorage.setItem("aws_region", awsRegion);
        localStorage.setItem("oci_region", ociRegion);
        localStorage.setItem("oci_namespace", ociNamespace);
      }
      setTimeout(() => setStatus("idle"), 5000);
    } else if (s === "error") {
      // If autoconnect failed, return to settings
      localStorage.setItem("auto_connect", "false");
      setIsConnected(false);
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  const handleOciRegionChange = (value: string) => {
    setOciRegion(value);
    const region = OCI_REGIONS.find((r) => r.value === value);
    if (region && ociNamespace) {
      setOciEndpoint(region.endpoint.replace("{namespace}", ociNamespace));
    } else if (region) {
      setOciEndpoint(region.endpoint);
    }
  };

  const handleOciNamespaceChange = (ns: string) => {
    setOciNamespace(ns);
    if (ociRegion) {
      const region = OCI_REGIONS.find((r) => r.value === ociRegion);
      if (region) {
        setOciEndpoint(
          ns
            ? region.endpoint.replace("{namespace}", ns)
            : region.endpoint
        );
      }
    }
  };

  const triggerDisconnect = () => {
    localStorage.setItem("auto_connect", "false");
    setDisconnectTrigger((prev) => prev + 1);
    setIsConnected(false);
  };

  const resolvedOciEndpoint = ociEndpoint.includes("{namespace}")
    ? undefined
    : ociEndpoint || undefined;

  if (!showApp) {
    return <LandingPage onLaunchApp={() => setShowApp(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
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
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30">
          <Cloud className="h-4 w-4 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-100 leading-none">Vault Drop Explorer</h1>
          <p className="text-xs text-slate-500 mt-0.5">Secure cloud file manager</p>
        </div>

        {isConnected && (
          <div className="flex items-center gap-2 ml-6 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="uppercase">{activeProvider}</span>
            <span className="text-slate-600">·</span>
            <span>{activeProvider === "aws" ? awsRegion : ociRegion}</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="h-3 w-3" />
            <span>Local credentials only</span>
          </div>
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

      {/* Main Area */}
      <main className="flex-1 p-6 flex flex-col min-h-0">
        {isConnected ? (
          <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col min-h-0">
            {activeProvider === "aws" ? (
              <BucketBrowser
                provider="aws"
                region={awsRegion}
                accessKeyId={awsAccessKey || undefined}
                secretAccessKey={awsSecretKey || undefined}
                onStatus={handleStatus}
                onConnectStateChange={setIsConnected}
                disconnectTrigger={disconnectTrigger}
              />
            ) : (
              <BucketBrowser
                provider="oci"
                region={ociRegion || "us-ashburn-1"}
                endpoint={resolvedOciEndpoint}
                accessKeyId={ociAccessKeyId || undefined}
                secretAccessKey={ociSecretAccessKey || undefined}
                onStatus={handleStatus}
                onConnectStateChange={setIsConnected}
                disconnectTrigger={disconnectTrigger}
              />
            )}
          </div>
        ) : (
          <div className="w-full max-w-xl mx-auto">
            <Tabs value={activeProvider} onValueChange={(val) => setActiveProvider(val as "aws" | "oci")} className="w-full">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="aws" id="tab-aws" className="flex-1 gap-2">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"
                    alt="AWS"
                    className="h-3.5 w-auto opacity-80"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                  Amazon S3
                </TabsTrigger>
                <TabsTrigger value="oci" id="tab-oci" className="flex-1 gap-2">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg"
                    alt="OCI"
                    className="h-3.5 w-auto opacity-80"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                  OCI Object Storage
                </TabsTrigger>
              </TabsList>

              {/* ── AWS Tab ── */}
              <TabsContent value="aws">
                <Card className="bg-slate-900/40 border-white/5">
                  <CardHeader>
                    <CardTitle className="text-lg">Amazon S3 Configuration</CardTitle>
                    <CardDescription className="text-xs">
                      {awsCredsExist
                        ? "Using default profile in ~/.aws/credentials"
                        : "No credentials profile found. Enter keys to configure and save them."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="aws-region" className="text-xs">Region</Label>
                      <Select value={awsRegion} onValueChange={setAwsRegion}>
                        <SelectTrigger id="aws-region">
                          <SelectValue placeholder="Select a region" />
                        </SelectTrigger>
                        <SelectContent>
                          {AWS_REGIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}{" "}
                              <span className="text-slate-500 text-xs ml-1">({r.value})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Inline Credential Setup for AWS */}
                    {!awsCredsExist && (
                      <div className="space-y-3 p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-lg">
                        <p className="text-[11px] text-indigo-300">
                          Configure new AWS credentials profile to save on this machine:
                        </p>
                        <div className="space-y-1.5">
                          <Label htmlFor="aws-key-id" className="text-[11px]">AWS Access Key ID</Label>
                          <Input
                            id="aws-key-id"
                            placeholder="AKIA..."
                            value={awsAccessKey}
                            onChange={(e) => setAwsAccessKey(e.target.value)}
                            type="password"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="aws-secret" className="text-[11px]">AWS Secret Access Key</Label>
                          <Input
                            id="aws-secret"
                            placeholder="Secret Key"
                            value={awsSecretKey}
                            onChange={(e) => setAwsSecretKey(e.target.value)}
                            type="password"
                          />
                        </div>
                      </div>
                    )}

                    {/* Auto Connect Toggle Checkbox */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="remember-aws"
                        checked={rememberConnection}
                        onChange={(e) => setRememberConnection(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                      />
                      <Label htmlFor="remember-aws" className="text-xs text-slate-400 cursor-pointer">
                        Remember this connection and auto-connect next time
                      </Label>
                    </div>

                    <BucketBrowser
                      provider="aws"
                      region={awsRegion}
                      accessKeyId={awsAccessKey || undefined}
                      secretAccessKey={awsSecretKey || undefined}
                      onStatus={handleStatus}
                      onConnectStateChange={setIsConnected}
                      disconnectTrigger={disconnectTrigger}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── OCI Tab ── */}
              <TabsContent value="oci">
                <Card className="bg-slate-900/40 border-white/5">
                  <CardHeader>
                    <CardTitle className="text-lg">OCI Configuration</CardTitle>
                    <CardDescription className="text-xs">
                      {ociCredsExist
                        ? "Using [oci] profile in ~/.aws/credentials"
                        : "No [oci] credentials found. Enter keys to configure and save them."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Region selector */}
                    <div className="space-y-2">
                      <Label htmlFor="oci-region" className="text-xs">Region</Label>
                      <Select value={ociRegion} onValueChange={handleOciRegionChange}>
                        <SelectTrigger id="oci-region">
                          <SelectValue placeholder="Select an OCI region" />
                        </SelectTrigger>
                        <SelectContent>
                          {OCI_REGIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}{" "}
                              <span className="text-slate-500 text-xs ml-1">({r.value})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Namespace */}
                    <div className="space-y-2">
                      <Label htmlFor="oci-namespace" className="text-xs">Tenancy Namespace</Label>
                      <Input
                        id="oci-namespace"
                        placeholder="e.g. axhz1oupce..."
                        value={ociNamespace}
                        onChange={(e) => handleOciNamespaceChange(e.target.value)}
                      />
                      <p className="text-[10px] text-slate-500">
                        Find it in OCI Console → Tenancy Details → Object Storage Namespace
                      </p>
                    </div>

                    {/* Endpoint (auto-filled, but editable) */}
                    <div className="space-y-2">
                      <Label htmlFor="oci-endpoint" className="text-xs">S3-Compatible Endpoint</Label>
                      <Input
                        id="oci-endpoint"
                        placeholder="Auto-filled when you select a region"
                        value={ociEndpoint}
                        onChange={(e) => setOciEndpoint(e.target.value)}
                      />
                    </div>

                    {/* Inline Credential Setup for OCI */}
                    {!ociCredsExist ? (
                      <div className="space-y-3 p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-lg">
                        <p className="text-[11px] text-indigo-300">
                          Configure new OCI credentials profile to save on this machine:
                        </p>
                        <div className="space-y-1.5">
                          <Label htmlFor="oci-key-id" className="text-[11px]">OCI Access Key ID</Label>
                          <Input
                            id="oci-key-id"
                            placeholder="OCI customer secret key ID"
                            value={ociAccessKeyId}
                            onChange={(e) => setOciAccessKeyId(e.target.value)}
                            type="password"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="oci-secret" className="text-[11px]">OCI Secret Access Key</Label>
                          <Input
                            id="oci-secret"
                            placeholder="OCI customer secret key"
                            value={ociSecretAccessKey}
                            onChange={(e) => setOciSecretAccessKey(e.target.value)}
                            type="password"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <button
                          id="oci-advanced-toggle"
                          type="button"
                          onClick={() => setShowOciAdvanced((v) => !v)}
                          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          {showOciAdvanced ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                          Inline credentials override (optional)
                        </button>
                        {showOciAdvanced && (
                          <div className="mt-3 space-y-3 pl-3 border-l border-white/10">
                            <div className="space-y-2">
                              <Label htmlFor="oci-key-id">Access Key ID</Label>
                              <Input
                                id="oci-key-id"
                                placeholder="OCI customer secret key ID"
                                value={ociAccessKeyId}
                                onChange={(e) => setOciAccessKeyId(e.target.value)}
                                type="password"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="oci-secret">Secret Access Key</Label>
                              <Input
                                id="oci-secret"
                                placeholder="OCI customer secret key"
                                value={ociSecretAccessKey}
                                onChange={(e) => setOciSecretAccessKey(e.target.value)}
                                type="password"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Auto Connect Toggle Checkbox */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="remember-oci"
                        checked={rememberConnection}
                        onChange={(e) => setRememberConnection(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                      />
                      <Label htmlFor="remember-oci" className="text-xs text-slate-400 cursor-pointer">
                        Remember this connection and auto-connect next time
                      </Label>
                    </div>

                    <BucketBrowser
                      provider="oci"
                      region={ociRegion || "us-ashburn-1"}
                      endpoint={resolvedOciEndpoint}
                      accessKeyId={ociAccessKeyId || undefined}
                      secretAccessKey={ociSecretAccessKey || undefined}
                      onStatus={handleStatus}
                      onConnectStateChange={setIsConnected}
                      disconnectTrigger={disconnectTrigger}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
