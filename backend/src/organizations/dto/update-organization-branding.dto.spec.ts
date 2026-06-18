import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateOrganizationBrandingDto } from './update-organization-branding.dto';

describe('UpdateOrganizationBrandingDto', () => {
  it('accepts valid branding fields', async () => {
    const dto = plainToInstance(UpdateOrganizationBrandingDto, {
      logoUrl: 'https://cdn.example.com/logo.svg',
      primaryColor: '#1565C0',
      secondaryColor: '#F9A825',
      accentColor: '#0288D1',
      loginTitle: 'Welcome',
      supportEmail: 'support@example.com',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid hex colors', async () => {
    const dto = plainToInstance(UpdateOrganizationBrandingDto, {
      primaryColor: 'blue',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'primaryColor')).toBe(true);
  });

  it('transforms empty strings to null for optional clears', async () => {
    const dto = plainToInstance(UpdateOrganizationBrandingDto, {
      logoUrl: '',
      loginTitle: '',
    });

    expect(dto.logoUrl).toBeNull();
    expect(dto.loginTitle).toBeNull();
  });
});