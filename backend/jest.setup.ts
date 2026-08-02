jest.mock('./src/telemetry', () => ({
  sdk: {
    start: jest.fn(),
    shutdown: jest.fn()
  }
}));