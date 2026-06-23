import DirectionsCar from '@mui/icons-material/DirectionsCar';
import EventAvailable from '@mui/icons-material/EventAvailable';
import LocalParking from '@mui/icons-material/LocalParking';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DashboardQuickActionsPanel } from '@/components/dashboard/DashboardQuickActionsPanel';

const previewActions = [
  {
    id: 'add-vehicle',
    title: 'Add Vehicle',
    icon: <DirectionsCar />,
    accentColor: '#1f6feb',
    iconBgcolor: 'rgba(31, 111, 235, 0.1)',
  },
  {
    id: 'book-slot',
    title: 'Book Slot',
    icon: <EventAvailable />,
    accentColor: '#9a6700',
    iconBgcolor: 'rgba(154, 103, 0, 0.12)',
  },
];

describe('DashboardQuickActionsPanel mobile layout', () => {
  it('loads collapsed by default with preview chips for narrow screens', () => {
    render(
      <DashboardQuickActionsPanel previewActions={previewActions}>
        <button type="button">Add vehicle</button>
      </DashboardQuickActionsPanel>,
    );

    const header = screen.getByRole('button', { name: /^quick actions$/i });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /add vehicle/i })).not.toBeInTheDocument();
  });

  it('expands to show action content on tap', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <DashboardQuickActionsPanel
        description="Get started with your parking in two quick steps."
        previewActions={previewActions}
      >
        <button type="button">Add vehicle</button>
      </DashboardQuickActionsPanel>,
    );

    await user.click(screen.getByRole('button', { name: /^quick actions$/i }));

    expect(screen.getByRole('button', { name: /^quick actions$/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Get started with your parking in two quick steps.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add vehicle/i })).toBeInTheDocument();
  });

  it('wraps many preview chips without breaking the collapsed header', () => {
    const manyActions = Array.from({ length: 6 }, (_, index) => ({
      id: `action-${index}`,
      title: `Action ${index + 1}`,
      icon: <LocalParking />,
      accentColor: '#1f6feb',
      iconBgcolor: 'rgba(31, 111, 235, 0.1)',
    }));

    render(
      <DashboardQuickActionsPanel previewActions={manyActions}>
        <div>Expanded actions</div>
      </DashboardQuickActionsPanel>,
    );

    const header = screen.getByRole('button', { name: /^quick actions$/i });
    expect(header).toBeInTheDocument();
    expect(header).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders helper content when provided', () => {
    render(
      <DashboardQuickActionsPanel
        helperContent={<div>Getting started checklist</div>}
        previewActions={previewActions}
      >
        <button type="button">Add vehicle</button>
      </DashboardQuickActionsPanel>,
    );

    expect(screen.getByText('Getting started checklist')).toBeInTheDocument();
  });
});