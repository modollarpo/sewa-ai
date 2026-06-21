// SEWA AI — src/telemetry.ts
// Enterprise Observability: OpenTelemetry Initialization

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const traceExporter = new OTLPTraceExporter(); // Defaults to localhost:4318
const metricExporter = new OTLPMetricExporter();

export const sdk = new NodeSDK({
  traceExporter: traceExporter as any,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter as any,
    exportIntervalMillis: 10000,
  }) as any,
  instrumentations: [getNodeAutoInstrumentations()],
});

// Initialize telemetry before the application boots
if (process.env.NODE_ENV !== 'test') {
  sdk.start();
}

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
