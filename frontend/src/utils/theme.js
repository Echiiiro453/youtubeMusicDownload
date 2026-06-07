import { themeFromImage, hexFromArgb } from '@material/material-color-utilities';

export const applyThemeFromImage = async (imageElement) => {
  try {
    const theme = await themeFromImage(imageElement);
    // Usaremos sempre o modo escuro (dark scheme) para este app
    const darkScheme = theme.schemes.dark;
    
    // Fallbacks para variáveis de container caso a versão do material-color-utilities não possua
    const nPalette = theme.palettes.neutral;
    const getHex = (val, fallbackTone) => {
        if (val !== undefined && val !== null) return hexFromArgb(val);
        return hexFromArgb(nPalette.tone(fallbackTone));
    }

    const properties = {
      '--md-sys-color-background': getHex(darkScheme.background, 6),
      '--md-sys-color-surface': getHex(darkScheme.surface, 6),
      '--md-sys-color-surface-dim': getHex(darkScheme.surfaceDim, 6),
      '--md-sys-color-surface-container-lowest': getHex(darkScheme.surfaceContainerLowest, 4),
      '--md-sys-color-surface-container-low': getHex(darkScheme.surfaceContainerLow, 10),
      '--md-sys-color-surface-container': getHex(darkScheme.surfaceContainer, 12),
      '--md-sys-color-surface-container-high': getHex(darkScheme.surfaceContainerHigh, 17),
      '--md-sys-color-surface-container-highest': getHex(darkScheme.surfaceContainerHighest, 22),
      '--md-sys-color-on-surface': getHex(darkScheme.onSurface, 90),
      '--md-sys-color-on-surface-variant': getHex(darkScheme.onSurfaceVariant, 80),
      '--md-sys-color-primary': getHex(darkScheme.primary, 80),
      '--md-sys-color-on-primary': getHex(darkScheme.onPrimary, 20),
      '--md-sys-color-primary-container': getHex(darkScheme.primaryContainer, 30),
      '--md-sys-color-on-primary-container': getHex(darkScheme.onPrimaryContainer, 90),
      '--md-sys-color-secondary': getHex(darkScheme.secondary, 80),
      '--md-sys-color-on-secondary': getHex(darkScheme.onSecondary, 20),
      '--md-sys-color-secondary-container': getHex(darkScheme.secondaryContainer, 30),
      '--md-sys-color-on-secondary-container': getHex(darkScheme.onSecondaryContainer, 90),
      '--md-sys-color-tertiary': getHex(darkScheme.tertiary, 80),
      '--md-sys-color-on-tertiary': getHex(darkScheme.onTertiary, 20),
      '--md-sys-color-tertiary-container': getHex(darkScheme.tertiaryContainer, 30),
      '--md-sys-color-on-tertiary-container': getHex(darkScheme.onTertiaryContainer, 90),
      '--md-sys-color-outline': getHex(darkScheme.outline, 60),
      '--md-sys-color-outline-variant': getHex(darkScheme.outlineVariant, 30),
      '--md-sys-color-error': getHex(darkScheme.error, 80),
      '--md-sys-color-on-error': getHex(darkScheme.onError, 20),
      '--md-sys-color-error-container': getHex(darkScheme.errorContainer, 30),
      '--md-sys-color-on-error-container': getHex(darkScheme.onErrorContainer, 90),
    };

    for (const [key, value] of Object.entries(properties)) {
      document.documentElement.style.setProperty(key, value);
    }
  } catch (error) {
    console.error("Erro ao aplicar tema do wallpaper:", error);
  }
};

export const resetTheme = () => {
  const root = document.documentElement;
  const variables = [
    'background', 'surface', 'surface-dim', 'surface-container-lowest', 'surface-container-low',
    'surface-container', 'surface-container-high', 'surface-container-highest', 'on-surface',
    'on-surface-variant', 'primary', 'on-primary', 'primary-container', 'on-primary-container',
    'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container', 'tertiary',
    'on-tertiary', 'tertiary-container', 'on-tertiary-container', 'outline', 'outline-variant',
    'error', 'on-error', 'error-container', 'on-error-container'
  ];
  
  variables.forEach(v => root.style.removeProperty(`--md-sys-color-${v}`));
};
