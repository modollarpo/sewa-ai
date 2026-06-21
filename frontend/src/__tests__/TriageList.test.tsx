import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TriageList from '../components/TriageList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient();

describe('TriageList Component', () => {
  it('renders the component and shows a loading state or empty state initially', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TriageList scans={[]} />
        </BrowserRouter>
      </QueryClientProvider>
    );
    
    // We expect the Priority AI Worklist title
    expect(screen.getByText(/Priority AI Worklist/i)).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
