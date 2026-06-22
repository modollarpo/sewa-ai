import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';

expect.extend(toHaveNoViolations);

// Example a11y test (replace with your actual component)
const ExampleComponent = () => (
  <div>
    <h1>Welcome to SEWA AI</h1>
    <button aria-label="Login">Login</button>
  </div>
);

test('renders without accessibility violations', async () => {
  const { container } = render(<ExampleComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
