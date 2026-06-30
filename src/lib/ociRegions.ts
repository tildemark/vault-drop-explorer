export interface OciRegion {
  value: string;
  label: string;
  endpoint: string;
}

export const OCI_REGIONS: OciRegion[] = [
  // North America
  {
    value: "us-ashburn-1",
    label: "US East (Ashburn)",
    endpoint: "https://{namespace}.compat.objectstorage.us-ashburn-1.oraclecloud.com",
  },
  {
    value: "us-phoenix-1",
    label: "US West (Phoenix)",
    endpoint: "https://{namespace}.compat.objectstorage.us-phoenix-1.oraclecloud.com",
  },
  {
    value: "us-chicago-1",
    label: "US Midwest (Chicago)",
    endpoint: "https://{namespace}.compat.objectstorage.us-chicago-1.oraclecloud.com",
  },
  {
    value: "us-sanjose-1",
    label: "US West (San Jose)",
    endpoint: "https://{namespace}.compat.objectstorage.us-sanjose-1.oraclecloud.com",
  },
  {
    value: "ca-toronto-1",
    label: "Canada Southeast (Toronto)",
    endpoint: "https://{namespace}.compat.objectstorage.ca-toronto-1.oraclecloud.com",
  },
  {
    value: "ca-montreal-1",
    label: "Canada Southeast (Montreal)",
    endpoint: "https://{namespace}.compat.objectstorage.ca-montreal-1.oraclecloud.com",
  },
  // South America
  {
    value: "sa-saopaulo-1",
    label: "Brazil East (São Paulo)",
    endpoint: "https://{namespace}.compat.objectstorage.sa-saopaulo-1.oraclecloud.com",
  },
  {
    value: "sa-vinhedo-1",
    label: "Brazil East (Vinhedo)",
    endpoint: "https://{namespace}.compat.objectstorage.sa-vinhedo-1.oraclecloud.com",
  },
  {
    value: "sa-santiago-1",
    label: "Chile (Santiago)",
    endpoint: "https://{namespace}.compat.objectstorage.sa-santiago-1.oraclecloud.com",
  },
  // Europe
  {
    value: "eu-frankfurt-1",
    label: "Germany Central (Frankfurt)",
    endpoint: "https://{namespace}.compat.objectstorage.eu-frankfurt-1.oraclecloud.com",
  },
  {
    value: "eu-amsterdam-1",
    label: "Netherlands Northwest (Amsterdam)",
    endpoint: "https://{namespace}.compat.objectstorage.eu-amsterdam-1.oraclecloud.com",
  },
  {
    value: "eu-stockholm-1",
    label: "Sweden Central (Stockholm)",
    endpoint: "https://{namespace}.compat.objectstorage.eu-stockholm-1.oraclecloud.com",
  },
  {
    value: "eu-paris-1",
    label: "France Central (Paris)",
    endpoint: "https://{namespace}.compat.objectstorage.eu-paris-1.oraclecloud.com",
  },
  {
    value: "eu-marseille-1",
    label: "France South (Marseille)",
    endpoint: "https://{namespace}.compat.objectstorage.eu-marseille-1.oraclecloud.com",
  },
  {
    value: "eu-milan-1",
    label: "Italy Northwest (Milan)",
    endpoint: "https://{namespace}.compat.objectstorage.eu-milan-1.oraclecloud.com",
  },
  {
    value: "eu-madrid-1",
    label: "Spain Central (Madrid)",
    endpoint: "https://{namespace}.compat.objectstorage.eu-madrid-1.oraclecloud.com",
  },
  {
    value: "uk-london-1",
    label: "UK South (London)",
    endpoint: "https://{namespace}.compat.objectstorage.uk-london-1.oraclecloud.com",
  },
  {
    value: "uk-cardiff-1",
    label: "UK West (Newport / Cardiff)",
    endpoint: "https://{namespace}.compat.objectstorage.uk-cardiff-1.oraclecloud.com",
  },
  {
    value: "eu-zurich-1",
    label: "Switzerland North (Zurich)",
    endpoint: "https://{namespace}.compat.objectstorage.eu-zurich-1.oraclecloud.com",
  },
  // Middle East & Africa
  {
    value: "me-dubai-1",
    label: "UAE East (Dubai)",
    endpoint: "https://{namespace}.compat.objectstorage.me-dubai-1.oraclecloud.com",
  },
  {
    value: "me-abudhabi-1",
    label: "UAE Central (Abu Dhabi)",
    endpoint: "https://{namespace}.compat.objectstorage.me-abudhabi-1.oraclecloud.com",
  },
  {
    value: "me-jeddah-1",
    label: "Saudi Arabia West (Jeddah)",
    endpoint: "https://{namespace}.compat.objectstorage.me-jeddah-1.oraclecloud.com",
  },
  {
    value: "af-johannesburg-1",
    label: "South Africa Central (Johannesburg)",
    endpoint: "https://{namespace}.compat.objectstorage.af-johannesburg-1.oraclecloud.com",
  },
  // Asia Pacific
  {
    value: "ap-tokyo-1",
    label: "Japan East (Tokyo)",
    endpoint: "https://{namespace}.compat.objectstorage.ap-tokyo-1.oraclecloud.com",
  },
  {
    value: "ap-osaka-1",
    label: "Japan Central (Osaka)",
    endpoint: "https://{namespace}.compat.objectstorage.ap-osaka-1.oraclecloud.com",
  },
  {
    value: "ap-seoul-1",
    label: "South Korea Central (Seoul)",
    endpoint: "https://{namespace}.compat.objectstorage.ap-seoul-1.oraclecloud.com",
  },
  {
    value: "ap-chuncheon-1",
    label: "South Korea North (Chuncheon)",
    endpoint: "https://{namespace}.compat.objectstorage.ap-chuncheon-1.oraclecloud.com",
  },
  {
    value: "ap-sydney-1",
    label: "Australia East (Sydney)",
    endpoint: "https://{namespace}.compat.objectstorage.ap-sydney-1.oraclecloud.com",
  },
  {
    value: "ap-melbourne-1",
    label: "Australia Southeast (Melbourne)",
    endpoint: "https://{namespace}.compat.objectstorage.ap-melbourne-1.oraclecloud.com",
  },
  {
    value: "ap-mumbai-1",
    label: "India West (Mumbai)",
    endpoint: "https://{namespace}.compat.objectstorage.ap-mumbai-1.oraclecloud.com",
  },
  {
    value: "ap-hyderabad-1",
    label: "India South (Hyderabad)",
    endpoint: "https://{namespace}.compat.objectstorage.ap-hyderabad-1.oraclecloud.com",
  },
  {
    value: "ap-singapore-1",
    label: "Singapore (Singapore)",
    endpoint: "https://{namespace}.compat.objectstorage.ap-singapore-1.oraclecloud.com",
  },
];
