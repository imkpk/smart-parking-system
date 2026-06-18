import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/test-utils';
import { PlaceholderPage } from './PlaceholderPage';

describe('PlaceholderPage', () => {
  it('renders page title and illustration', () => {
    renderWithProviders(<PlaceholderPage illustration="booking" title="Dashboard" />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByAltText('booking illustration')).toBeInTheDocument();
  });
});