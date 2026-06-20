import { BadRequestException } from '@nestjs/common';

export function slugifyOrganizationName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    throw new BadRequestException('Organization name is required');
  }

  return slug;
}

export async function resolveUniqueOrganizationSlug(
  name: string,
  slugExists: (slug: string) => Promise<boolean>,
) {
  const baseSlug = slugifyOrganizationName(name);
  let candidate = baseSlug;
  let suffix = 2;

  while (await slugExists(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}