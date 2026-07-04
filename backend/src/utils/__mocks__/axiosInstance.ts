/**
 * Manual Jest mock for src/utils/axiosInstance.ts
 *
 * Jest auto-discovers this file when a test calls:
 *   jest.mock('../utils/axiosInstance')   (from __tests__)
 *   jest.mock('../../utils/axiosInstance') (from services)
 *
 * because it lives at <rootDir>/src/utils/__mocks__/axiosInstance.ts —
 * directly adjacent to the real module.
 *
 * Export `mockAxiosInstance` so tests can attach mockResolvedValueOnce, etc.
 */

export const mockAxiosInstance = {
  post:    jest.fn(),
  get:     jest.fn(),
  put:     jest.fn(),
  delete:  jest.fn(),
  patch:   jest.fn(),
  request: jest.fn(),
  interceptors: {
    request:  { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
};

export const createAxiosInstance = jest.fn(() => mockAxiosInstance);
