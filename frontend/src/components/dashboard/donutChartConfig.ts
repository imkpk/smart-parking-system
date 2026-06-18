export const DONUT_CHART_HEIGHT = 200;
export const DONUT_CHART_WIDTH = 280;
export const DONUT_INNER_RADIUS = 52;
export const DONUT_OUTER_RADIUS = 88;
export const DONUT_SKELETON_SIZE = 176;
export const DONUT_SKELETON_BORDER = 14;
export const DONUT_CHART_MIN_WIDTH = 200;

export function getResponsiveDonutDimensions(containerWidth: number) {
  const width = Math.max(
    DONUT_CHART_MIN_WIDTH,
    Math.min(containerWidth, DONUT_CHART_WIDTH),
  );
  const scale = width / DONUT_CHART_WIDTH;

  const outerRadius = Math.round(DONUT_OUTER_RADIUS * scale);

  return {
    innerRadius: Math.round(DONUT_INNER_RADIUS * scale),
    outerRadius,
    pieHeight: outerRadius * 2 + 12,
    skeletonBorder: Math.max(12, Math.round(DONUT_SKELETON_BORDER * scale)),
    skeletonSize: Math.round(DONUT_SKELETON_SIZE * scale),
    width,
  };
}