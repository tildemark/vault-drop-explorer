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
import { Cloud, Lock, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function App() {
  const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
  const [showApp, setShowApp] = useState(isTauri);

  // Credential presence states
  const [awsCredsExist, setAwsCredsExist] = useState(true);
  const [ociCredsExist, setOciCredsExist] = useState(true);

  // AWS state
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [awsAccessKey, setAwsAccessKey] = useState("");
  const [awsSecretKey, setAwsSecretKey] = useState("");

  // OCI state
  const [ociRegion, setOciRegion] = useState("");
  const [ociNamespace, setOciNamespace] = useState("");
  const [ociEndpoint, setOciEndpoint] = useState("");
  const [showOciAdvanced, setShowOciAdvanced] = useState(false);
  const [ociAccessKeyId, setOciAccessKeyId] = useState("");
  const [ociSecretAccessKey, setOciSecretAccessKey] = useState("");

  // Status
  const [status, setStatus] = useState<StatusType>("idle");
  const [statusMsg, setStatusMsg] = useState("");

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
  }, [showApp]);

  const handleStatus = (s: StatusType, msg: string) => {
    setStatus(s);
    setStatusMsg(msg);
    if (s === "success") {
      // Recheck credential file on successful connection in case keys were saved
      checkCredentials();
      setTimeout(() => setStatus("idle"), 5000);
    } else if (s === "error") {
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

  const resolvedOciEndpoint = ociEndpoint.includes("{namespace}")
    ? undefined
    : ociEndpoint || undefined;

  if (!showApp) {
    return <LandingPage onLaunchApp={() => setShowApp(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
        {!isTauri && (
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
        <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          <Lock className="h-3 w-3" />
          <span>Local credentials only</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-6">
        <Tabs defaultValue="aws" className="w-full max-w-2xl mx-auto">
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
            <Card>
              <CardHeader>
                <CardTitle>Amazon S3</CardTitle>
                <CardDescription>
                  {awsCredsExist
                    ? "Using local profile [default] in ~/.aws/credentials"
                    : "No local credentials found. Enter keys to configure and save them."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="aws-region">Region</Label>
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

                {/* Inline Credential Setup for first-run AWS */}
                {!awsCredsExist && (
                  <div className="space-y-3 p-4 bg-yellow-950/20 border border-yellow-500/20 rounded-lg">
                    <p className="text-xs text-yellow-400">
                      No AWS credentials found in <code>~/.aws/credentials</code>. Enter them below to connect and automatically save them locally.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="aws-key-id">AWS Access Key ID</Label>
                      <Input
                        id="aws-key-id"
                        placeholder="AKIA..."
                        value={awsAccessKey}
                        onChange={(e) => setAwsAccessKey(e.target.value)}
                        type="password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aws-secret">AWS Secret Access Key</Label>
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

                <BucketBrowser
                  provider="aws"
                  region={awsRegion}
                  accessKeyId={awsAccessKey || undefined}
                  secretAccessKey={awsSecretKey || undefined}
                  onStatus={handleStatus}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── OCI Tab ── */}
          <TabsContent value="oci">
            <Card>
              <CardHeader>
                <CardTitle>OCI Object Storage</CardTitle>
                <CardDescription>
                  {ociCredsExist
                    ? "Using local profile [oci] in ~/.aws/credentials"
                    : "No local credentials found. Enter keys to configure and save them."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Region selector */}
                <div className="space-y-2">
                  <Label htmlFor="oci-region">Region</Label>
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
                  <Label htmlFor="oci-namespace">Tenancy Namespace</Label>
                  <Input
                    id="oci-namespace"
                    placeholder="e.g. axhz1oupce..."
                    value={ociNamespace}
                    onChange={(e) => handleOciNamespaceChange(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Find it in OCI Console → Tenancy Details → Object Storage Namespace
                  </p>
                </div>

                {/* Endpoint (auto-filled, but editable) */}
                <div className="space-y-2">
                  <Label htmlFor="oci-endpoint">S3-Compatible Endpoint</Label>
                  <Input
                    id="oci-endpoint"
                    placeholder="Auto-filled when you select a region"
                    value={ociEndpoint}
                    onChange={(e) => setOciEndpoint(e.target.value)}
                  />
                </div>

                {/* Inline Credential Setup for first-run OCI or advanced manual configuration */}
                {!ociCredsExist ? (
                  <div className="space-y-3 p-4 bg-yellow-950/20 border border-yellow-500/20 rounded-lg">
                    <p className="text-xs text-yellow-400">
                      No OCI credentials found in <code>~/.aws/credentials</code> under the <code>[oci]</code> profile. Enter them below to connect and automatically save them locally.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="oci-key-id">OCI Access Key ID</Label>
                      <Input
                        id="oci-key-id"
                        placeholder="OCI customer secret key ID"
                        value={ociAccessKeyId}
                        onChange={(e) => setOciAccessKeyId(e.target.value)}
                        type="password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="oci-secret">OCI Secret Access Key</Label>
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

                <BucketBrowser
                  provider="oci"
                  region={ociRegion || "us-ashburn-1"}
                  endpoint={resolvedOciEndpoint}
                  accessKeyId={ociAccessKeyId || undefined}
                  secretAccessKey={ociSecretAccessKey || undefined}
                  onStatus={handleStatus}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <StatusBar
        status={status}
        message={statusMsg}
        onDismiss={() => setStatus("idle")}
      />
    </div>
  );
}
