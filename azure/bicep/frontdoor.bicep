// SEWA XAI — Azure Front Door (Standard) edge / TLS termination for multi-region
// Captured for reproducibility. Resources already exist in sewa-ai-production-rg.
// Origin is the DNS name (not the IP) so Front Door sends the correct SNI and
// receives the trusted Let's Encrypt cert; ssl-redirect is disabled on the
// backend ingress so the FD -> origin hop is not 308-redirected.
targetScope = 'resourceGroup'

@description('FD profile name')
param profileName string = 'sewa-ai-fd'

@description('FD endpoint name (FQDN: <name>.z01.azurefd.net)')
param endpointName string = 'sewa-ai-fd'

@description('Origin group name')
param originGroupName string = 'sewa-ai-og'

@description('Origin name')
param originName string = 'sewa-ai-aks'

@description('Route name')
param routeName string = 'sewa-ai-route'

@description('Backend origin hostname (DNS name -> correct SNI for the Lets Encrypt cert)')
param originHostname string = 'api.production.sewaxai.health'

resource profile 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: profileName
  location: 'global'
  sku: { name: 'Standard_AzureFrontDoor' }
}

resource endpoint 'Microsoft.Cdn/profiles/afdendpoints@2023-05-01' = {
  parent: profile
  name: endpointName
  location: 'global'
  properties: {
    enabledState: 'Enabled'
  }
}

resource originGroup 'Microsoft.Cdn/profiles/origingroups@2023-05-01' = {
  parent: profile
  name: originGroupName
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/health'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 100
      probeRequestType: 'GET'
    }
  }
}

resource origin 'Microsoft.Cdn/profiles/origingroups/origins@2023-05-01' = {
  parent: originGroup
  name: originName
  properties: {
    hostName: originHostname
    httpPort: 80
    httpsPort: 443
    originHostHeader: originHostname
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

resource route 'Microsoft.Cdn/profiles/afdendpoints/routes@2023-05-01' = {
  parent: endpoint
  name: routeName
  properties: {
    originGroup: { id: originGroup.id }
    supportedProtocols: [ 'Http', 'Https' ]
    patternsToMatch: [ '/*' ]
    forwardingProtocol: 'HttpsOnly'
    httpsRedirect: 'Redirect'
    linkToDefaultDomain: 'Enabled'
    enabledState: 'Enabled'
  }
}
