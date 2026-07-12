import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, test, describe } from 'vitest';
import { Button, Toggle, Tabs, Modal } from '../design-system/components';

expect.extend(toHaveNoViolations);

describe('Button a11y', () => {
  test('renders without violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });

  test('has accessible name with aria-label', async () => {
    render(<Button aria-label="Save document">Save</Button>);
    expect(screen.getByRole('button', { name: 'Save document' })).toBeInTheDocument();
  });

  test('disabled button has aria-disabled', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toBeDisabled();
  });

  test('keyboard focus is visible (no outline:none)', () => {
    const { container } = render(<Button>Focus me</Button>);
    const btn = container.querySelector('button')!;
    expect(btn.style.outline).not.toBe('none');
  });
});

describe('Toggle a11y', () => {
  test('renders without violations', async () => {
    const { container } = render(<Toggle checked={false} onChange={() => {}} label="Enable" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  test('has role="switch" and aria-checked', () => {
    render(<Toggle checked={true} onChange={() => {}} label="Notifications" />);
    const sw = screen.getByRole('switch');
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  test('is keyboard focusable', () => {
    render(<Toggle checked={false} onChange={() => {}} label="Dark mode" />);
    const sw = screen.getByRole('switch');
    expect(sw).toHaveAttribute('tabindex', '0');
  });

  test('toggles on Enter key', () => {
    let value = false;
    render(<Toggle checked={value} onChange={v => { value = v; }} label="Toggle" />);
    const sw = screen.getByRole('switch');
    fireEvent.keyDown(sw, { key: 'Enter' });
    expect(value).toBe(true);
  });

  test('toggles on Space key', () => {
    let value = false;
    render(<Toggle checked={value} onChange={v => { value = v; }} label="Toggle" />);
    const sw = screen.getByRole('switch');
    fireEvent.keyDown(sw, { key: ' ' });
    expect(value).toBe(true);
  });
});

describe('Tabs a11y', () => {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'scans', label: 'Scans' },
    { id: 'settings', label: 'Settings' },
  ];

  test('renders without violations', async () => {
    const { container } = render(<Tabs tabs={tabs} active="overview" onChange={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  test('container has role="tablist"', () => {
    render(<Tabs tabs={tabs} active="overview" onChange={() => {}} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  test('each tab has role="tab" and aria-selected', () => {
    render(<Tabs tabs={tabs} active="scans" onChange={() => {}} />);
    const tablist = screen.getByRole('tablist');
    const tabButtons = tablist.querySelectorAll('[role="tab"]');
    expect(tabButtons).toHaveLength(3);
    expect(tabButtons[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabButtons[0]).toHaveAttribute('aria-selected', 'false');
  });

  test('active tab has tabIndex=0, inactive tabs have tabIndex=-1', () => {
    render(<Tabs tabs={tabs} active="settings" onChange={() => {}} />);
    const tablist = screen.getByRole('tablist');
    const tabButtons = tablist.querySelectorAll('[role="tab"]');
    expect(tabButtons[2]).toHaveAttribute('tabindex', '0');
    expect(tabButtons[0]).toHaveAttribute('tabindex', '-1');
  });
});

describe('Modal a11y', () => {
  test('renders without violations when open', async () => {
    const { container } = render(
      <Modal open={true} onClose={() => {}} title="Test Dialog">
        <p>Modal content</p>
      </Modal>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  test('has role="dialog" and aria-modal', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Settings">
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('closes on Escape key', () => {
    let closed = false;
    render(
      <Modal open={true} onClose={() => { closed = true; }} title="Closeable">
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closed).toBe(true);
  });

  test('returns null when not open', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Hidden">
        <p>Content</p>
      </Modal>
    );
    expect(container.innerHTML).toBe('');
  });
});
