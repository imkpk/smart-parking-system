import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock, patchMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  patchMock: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  apiClient: {
    get: getMock,
    patch: patchMock,
  },
}));

import {
  getCurrentBranding,
  getPublicBranding,
  updateOrganizationBranding,
} from '@/api/organizationsApi';

const brandingResponse = {
  name: 'Acme Parking',
  slug: 'acme-parking',
  primaryColor: '#112233',
};

describe('organizationsApi', () => {
  beforeEach(() => {
    getMock.mockReset();
    patchMock.mockReset();
  });

  it('fetches public branding by slug', async () => {
    getMock.mockResolvedValue({ data: brandingResponse });

    const result = await getPublicBranding('acme-parking');

    expect(getMock).toHaveBeenCalledWith('/organizations/public-branding/acme-parking');
    expect(result).toEqual(brandingResponse);
  });

  it('fetches current organization branding', async () => {
    getMock.mockResolvedValue({ data: brandingResponse });

    const result = await getCurrentBranding();

    expect(getMock).toHaveBeenCalledWith('/organizations/current/branding');
    expect(result).toEqual(brandingResponse);
  });

  it('updates organization branding', async () => {
    patchMock.mockResolvedValue({ data: brandingResponse });

    const payload = { primaryColor: '#112233' };
    const result = await updateOrganizationBranding(payload);

    expect(patchMock).toHaveBeenCalledWith('/organizations/current/branding', payload);
    expect(result).toEqual(brandingResponse);
  });
});