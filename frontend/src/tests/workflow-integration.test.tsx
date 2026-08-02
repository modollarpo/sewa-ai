import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '../i18n/I18nContext';
import App from '../App';
import { useAuthStore } from '../store/authStore';
import { vi } from 'vitest';

vi.mock('../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../services/socketService', () => ({
  socketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock('../hooks/useTenant', () => ({
  useTenant: () => ({ isLoaded: true }),
}));

vi.mock('../store/scanStore', () => ({
  useScanStore: Object.assign(
    vi.fn(() => ({
      criticalAlerts: [],
      fetchWorklist: vi.fn(),
      handleAIResult: vi.fn(),
      updateScanStatus: vi.fn(),
    })),
    {
      getState: vi.fn(() => ({
        handleAIResult: vi.fn(),
        updateScanStatus: vi.fn(),
        fetchWorklist: vi.fn(),
      })),
    }
  ),
}));

vi.mock('../store/notificationStore', () => ({
  useNotificationStore: vi.fn(() => ({
    notifications: [],
    addNotification: vi.fn(),
    markRead: vi.fn(),
  })),
}));

vi.mock('../store/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({
    region: 'UK',
    lang: 'en',
    setLang: vi.fn(),
    setRegion: vi.fn(),
  })),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const createTestClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0 },
    mutations: { retry: false },
  },
});

function TestApp({ userData }: { userData?: any }) {
  return (
    <I18nProvider>
      <QueryClientProvider client={createTestClient()}>
        <App />
      </QueryClientProvider>
    </I18nProvider>
  );
}

describe('SEWA Enterprise Clinical Platform', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('renders landing page when unauthenticated', async () => {
    render(<TestApp />);
    await waitFor(() => {
      expect(document.querySelector('.subnav-container')).toBeNull();
    });
  });

  it('renders dashboard when authenticated as doctor', async () => {
    const userData = {
      id: 'test-user-1',
      tenantId: 'tenant-1',
      email: 'clinician@sewa.ai',
      region: 'UK',
      language: 'en',
      firstName: 'Dr Test',
      lastName: 'User',
      role: 'doctor',
      tenantName: 'Test Hospital',
      currency: 'GBP',
    };

    useAuthStore.setState({
      user: userData,
      token: 'mock-token',
      refreshToken: 'mock-refresh',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    render(<TestApp />);

    await waitFor(() => {
      expect(screen.getByText(/SEWA XAI v2.4.1/)).toBeInTheDocument();
    });
  });
});