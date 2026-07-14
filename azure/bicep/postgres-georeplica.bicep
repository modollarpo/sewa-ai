// SEWA XAI — North Europe PostgreSQL geo-replica + networking (multi-region DR)
// Captured for reproducibility. Resources already exist in sewa-ai-production-rg.
// Prereq: primary server (sewa-ai-production-pg) must have geoRedundantBackup = Enabled.
targetScope = 'resourceGroup'

@description('Secondary/DR region (North Europe)')
param drLocation string = 'northeurope'

@description('Primary PostgreSQL flexible server name (same resource group, UK South)')
param primaryPgServerName string = 'sewa-ai-production-pg'

@description('Geo-replica PostgreSQL flexible server name')
param replicaPgServerName string = 'sewa-ai-production-pg-ne'

@description('UK South VNet name (existing; peering target)')
param ukVnetName string = 'sewa-ai-production-vnet'

@description('North Europe VNet name')
param neVnetName string = 'sewa-ai-ne-vnet'

@description('North Europe VNet address space')
param neVnetAddressPrefix string = '10.11.0.0/16'

@description('North Europe Postgres delegated subnet name')
param neSubnetName string = 'sewa-ai-ne-dbsubnet'

@description('North Europe Postgres delegated subnet prefix')
param neSubnetPrefix string = '10.11.2.0/24'

@description('Private DNS zone for the NE Postgres replica')
param pgPrivateDnsZone string = 'sewa-ai-ne.postgres.database.azure.com'

// North Europe VNet
resource neVnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: neVnetName
  location: drLocation
  properties: {
    addressSpace: { addressPrefixes: [ neVnetAddressPrefix ] }
  }
}

// North Europe Postgres delegated subnet
resource neSubnet 'Microsoft.Network/virtualNetworks/subnets@2023-11-01' = {
  parent: neVnet
  name: neSubnetName
  properties: {
    addressPrefix: neSubnetPrefix
    delegations: [
      {
        name: 'Microsoft.DBforPostgreSQL'
        properties: { serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers' }
      }
    ]
  }
}

// NE VNet -> UK VNet peering
resource neToUkPeering 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2023-11-01' = {
  parent: neVnet
  name: 'sewa-ai-ne-to-uk'
  properties: {
    remoteVirtualNetwork: {
      id: '/subscriptions/${subscription().subscriptionId}/resourceGroups/${resourceGroup().name}/providers/Microsoft.Network/virtualNetworks/${ukVnetName}'
    }
    allowVirtualNetworkAccess: true
    allowForwardedTraffic: true
  }
}

// UK VNet -> NE VNet peering (top-level child of the existing UK VNet)
resource ukToNePeering 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2023-11-01' = {
  name: '${ukVnetName}/sewa-ai-uk-to-ne'
  properties: {
    remoteVirtualNetwork: { id: neVnet.id }
    allowVirtualNetworkAccess: true
    allowForwardedTraffic: true
  }
}

// Private DNS zone for the NE Postgres replica
resource pgDns 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: pgPrivateDnsZone
  location: 'global'
}

// Link the NE VNet to the private DNS zone
resource pgDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: pgDns
  name: '${neVnetName}-link'
  location: 'global'
  properties: {
    virtualNetwork: { id: neVnet.id }
    registrationEnabled: false
  }
}

// North Europe geo-replica (GeoAsyncReplica). Capacity must match primary SKU.
resource replica 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: replicaPgServerName
  location: drLocation
  sku: { name: 'Standard_D4s_v3', tier: 'GeneralPurpose' }
  properties: {
    createMode: 'Replica'
    sourceServerResourceId: '/subscriptions/${subscription().subscriptionId}/resourceGroups/${resourceGroup().name}/providers/Microsoft.DBforPostgreSQL/flexibleServers/${primaryPgServerName}'
    availabilityZone: '1'
    backup: { backupRetentionDays: 7 }
    network: {
      delegatedSubnetResourceId: neSubnet.id
      privateDnsZoneArmResourceId: pgDns.id
    }
  }
}
