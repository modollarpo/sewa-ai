import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginPage } from '../pages/auth/LoginPage';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({ login: vi.fn(), isLoading: false, error: null }),
}));

vi.mock('../services/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    render(<BrowserRouter><LoginPage onNavigate={vi.fn()} /></BrowserRouter>);
    expect(screen.getByPlaceholderText(/doctor@hospital/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••/)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<BrowserRouter><LoginPage onNavigate={vi.fn()} /></BrowserRouter>);
    const btn = screen.getByRole('button', { name: /initiate/i });
    expect(btn).toBeInTheDocument();
  });

  it('shows onboarding link', () => {
    render(<BrowserRouter><LoginPage onNavigate={vi.fn()} /></BrowserRouter>);
    expect(screen.getByText(/request onboarding/i)).toBeInTheDocument();
  });
});
