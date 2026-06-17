/**
 * Theme entry point — implementation lives in ./theme/
 * Edit frontend/src/theme/tokens.ts to change colors, radii, and motion app-wide.
 */
export {
  brand,
  createAppTheme,
  motionTokens,
  parkingTokens,
  resolveThemeTokens,
  shapeTokens,
  typographyTokens,
} from './theme/index';
export type { ThemeBrandOverrides, ThemeModeTokens } from './theme/index';

import { createAppTheme } from './theme/index';

/** @deprecated Use createAppTheme via ThemeModeProvider */
export const theme = createAppTheme('light');