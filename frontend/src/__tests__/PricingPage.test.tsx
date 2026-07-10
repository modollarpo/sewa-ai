import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { PricingPage } from '../pages/public/PricingPage';
import '@testing-library/jest-dom';

describe('PricingPage', () => {
  it('renders the core pricing components', () => {
    const mockNavigate = vi.fn();
    render(
      <MemoryRouter>
        <PricingPage onNavigate={mockNavigate} />
      </MemoryRouter>
    );
    
    // Verify headings
    expect(screen.getByText(/transparent, regional pricing/i)).toBeInTheDocument();
    
    // Verify pricing tiers
    expect(screen.getAllByText(/Starter Clinic/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Hospital Pro/i).length).toBeGreaterThan(0);
  });
});
