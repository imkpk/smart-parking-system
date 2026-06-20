import { LocalParking } from '@mui/icons-material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DashboardQuickActionTile } from '@/components/dashboard/DashboardQuickActionTile';

describe('DashboardQuickActionTile', () => {
  it('renders title, description, and CTA', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <DashboardQuickActionTile
        ctaLabel="Create parking lot"
        description="Add a new parking area for this property."
        icon={<LocalParking />}
        onClick={onClick}
        title="Create Parking Lot"
      />,
    );

    expect(screen.getByText('Create Parking Lot')).toBeInTheDocument();
    expect(screen.getByText('Add a new parking area for this property.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create parking lot/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows disabled reason instead of description when disabled', () => {
    render(
      <DashboardQuickActionTile
        ctaLabel="Create floor"
        description="Add floor or level details before adding slots."
        disabled
        disabledReason="Create a parking lot first."
        icon={<LocalParking />}
        onClick={vi.fn()}
        title="Create Floor"
      />,
    );

    expect(screen.getByText('Create a parking lot first.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create floor/i })).toBeDisabled();
  });
});