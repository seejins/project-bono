import tokens from './colors.json';

export const BRAND_COLORS = tokens.brand;
export const STATUS_COLORS = tokens.status;
export const GRADIENTS = tokens.gradients;

export type BrandColorKey = keyof typeof BRAND_COLORS;
export type StatusColorKey = keyof typeof STATUS_COLORS;

