// レスポンシブデザイン用の型定義

export type ResponsiveValue<T> = {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
};

export type ResponsiveBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ResponsiveSize = 'small' | 'medium' | 'large';

export interface ResponsiveComponentProps {
  size?: ResponsiveSize;
  variant?: 'mobile' | 'desktop' | 'adaptive';
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
}

export interface ResponsiveGridProps {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export interface ResponsiveTypographyProps {
  variant?: ResponsiveValue<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2' | 'caption'>;
  fontSize?: ResponsiveValue<string>;
  textAlign?: ResponsiveValue<'left' | 'center' | 'right'>;
}