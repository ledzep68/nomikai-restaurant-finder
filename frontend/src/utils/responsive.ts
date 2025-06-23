// レスポンシブデザイン用の共通ユーティリティ

export const responsiveSpacing = {
  small: { xs: 1, sm: 2 },
  medium: { xs: 2, sm: 3 },
  large: { xs: 3, sm: 4 },
};

export const responsiveFontSizes = {
  small: { xs: '0.75rem', sm: '0.875rem' },
  medium: { xs: '0.875rem', sm: '1rem' },
  large: { xs: '1rem', sm: '1.25rem' },
  xlarge: { xs: '1.25rem', sm: '1.5rem' },
  title: { xs: '1.5rem', sm: '2rem' },
};

export const responsiveHeights = {
  button: { xs: 44, sm: 40 },
  input: { xs: 48, sm: 56 },
  tab: { xs: 48, sm: 64 },
  image: {
    thumbnail: { xs: 120, sm: 150 },
    card: { xs: 200, sm: 250 },
    hero: { xs: 250, sm: 300, md: 400 },
  },
};

export const responsiveBreakpoints = {
  mobile: { xs: 12, sm: 6 },
  tablet: { xs: 12, sm: 6, md: 4 },
  desktop: { xs: 12, sm: 6, md: 4, lg: 3 },
  sidebar: { xs: 12, lg: 8 },
  content: { xs: 12, lg: 4 },
};

export const mobileFirstStyles = {
  card: {
    flexDirection: { xs: 'row', sm: 'column' },
    padding: { xs: 1.5, sm: 2 },
    borderRadius: { xs: 1, sm: 2 },
  },
  container: {
    py: { xs: 2, sm: 3, md: 4 },
    px: { xs: 1, sm: 2 },
  },
  button: {
    width: { xs: '100%', sm: 'auto' },
    minHeight: responsiveHeights.button,
    fontSize: responsiveFontSizes.small,
  },
  text: {
    fontSize: responsiveFontSizes.medium,
    lineHeight: { xs: 1.3, sm: 1.4 },
  },
};

export const hiddenOnMobile = {
  display: { xs: 'none', sm: 'block' },
};

export const hiddenOnDesktop = {
  display: { xs: 'block', sm: 'none' },
};

export const centerOnMobile = {
  textAlign: { xs: 'center', sm: 'left' },
};

export const stackOnMobile = {
  flexDirection: { xs: 'column', sm: 'row' },
  gap: responsiveSpacing.small,
};