import { Prisma } from '@prisma/client';

export const organizationBrandingSelect = {
  name: true,
  slug: true,
  logoUrl: true,
  primaryColor: true,
  secondaryColor: true,
  accentColor: true,
  loginTitle: true,
  supportEmail: true,
} satisfies Prisma.OrganizationSelect;

export type OrganizationBranding = Prisma.OrganizationGetPayload<{
  select: typeof organizationBrandingSelect;
}>;