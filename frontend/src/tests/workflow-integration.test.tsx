import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '../i18n/I18nContext';
import App from '../App';
import { useAuthStore } from '../store/authStore';

jest.mock('../services/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../services/socketService', () => ({
  socketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
  },
}));

jest.mock('../hooks/useTenant', () => ({
  useTenant: () => ({ isLoaded: true }),
}));

jest.mock('../store/scanStore', () => ({
  useScanStore: Object.assign(
    jest.fn(() => ({
      criticalAlerts: [],
      fetchWorklist: jest.fn(),
      handleAIResult: jest.fn(),
      updateScanStatus: jest.fn(),
    })),
    { getState: jest.fn(() => ({
      handleAIResult: jest.fn(),
      updateScanStatus: jest.fn(),
      fetchWorklist: jest.fn(),
    })) }
  ),
}));

jest.mock('../store/notificationStore', () => ({
  useNotificationStore: jest.fn(() => ({
    notifications: [],
    addNotification: jest.fn(),
    markRead: jest.fn(),
  })),
}));

jest.mock('../store/settingsStore', () => ({
  useSettingsStore: jest.fn(() => ({
    region: 'UK',
    lang: 'en',
    setLang: jest.fn(),
    setRegion: jest.fn(),
  })),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
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
    <BrowserRouter>
      <I18nProvider>
        <QueryClientProvider client={createTestClient()}>
          <App />
        </QueryClientProvider>
      </I18nProvider>
    </BrowserRouter>
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
