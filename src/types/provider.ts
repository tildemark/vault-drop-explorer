export type ProviderPresetId =
  | 'aws'
  | 'oci'
  | 'minio'
  | 'r2'
  | 'wasabi'
  | 'backblaze'
  | 'localstack'
  | 'custom';

export interface ProviderPreset {
  id: ProviderPresetId;
  name: string;
  category: 'cloud' | 'self-hosted' | 'custom';
  defaultEndpoint?: string;
  defaultRegion?: string;
  forcePathStyle: boolean;
  requiresEndpoint: boolean;
  credentialsProfileDefault?: string;
  description: string;
}

export interface ConnectionProfile {
  id: string;
  name: string;
  provider: ProviderPresetId;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  useAwsCredentialsFile: boolean;
  profileName: string;
  updatedAt: string;
}

export interface VaultDropConfig {
  version: string;
  activeProfileId?: string;
  profiles: ConnectionProfile[];
}
