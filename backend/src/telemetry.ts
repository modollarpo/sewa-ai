// SEWA XAI — src/telemetry.ts
// Enterprise Observability: OpenTelemetry & Azure Application Insights

import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || process.env.AZURE_APPINSIGHTS_CONNECTION_STRING;

if (connectionString && process.env.NODE_ENV !== 'test') {
  console.log('[Telemetry] Initializing Azure Application Insights Monitor');
  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString: connectionString
    }
  });
} else {
  console.log('[Telemetry] Initializing Local OTLP OpenTelemetry Tracing');
  const traceExporter = new OTLPTraceExporter(); // Defaults to localhost:4318
  const metricExporter = new OTLPMetricExporter();

  const sdk = new NodeSDK({
    traceExporter: traceExporter as any,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter as any,
      exportIntervalMillis: 10000,
    }) as any,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  if (process.env.NODE_ENV !== 'test') {
    sdk.start();
  }

  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
}
