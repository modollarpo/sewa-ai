jest.mock('./src/telemetry', () => ({
  sdk: {
    start: jest.fn(),
    shutdown: jest.fn()
  }
}));

// Mock VLM circuit breaker to prevent "Engine saturated" errors in tests
jest.mock('./src/services/aiService', () => ({
  ...jest.requireActual('./src/services/aiService'),
  generateVLMReport: jest.fn().mockResolvedValue({
    impression: 'Mocked VLM report',
    findings: 'Mocked findings',
    technique: 'Mocked technique',
    fullText: 'Mocked full text',
    updatedResult: {}
  }),
  generateICDCodes: jest.fn().mockResolvedValue({})
}));