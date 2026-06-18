export const DONUT_CHART_HEIGHT = 220;
export const DONUT_CHART_WIDTH = 300;
export const DONUT_INNER_RADIUS = 56;
export const DONUT_OUTER_RADIUS = 94;
export const DONUT_SKELETON_SIZE = 188;
export const DONUT_SKELETON_BORDER = 16;
export const DONUT_CHART_MIN_WIDTH = 220;

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