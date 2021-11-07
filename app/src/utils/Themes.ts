import {Theme} from '@react-navigation/native';
import {ColorSchemeName} from 'react-native';

// Utils function to get colors and gradients

export enum ColorPalette {
  Danger = '#fd5d93',
  Success = '#00bf9a',
}

const themeToColor = (theme: string | undefined): string => {
  return theme === 'primary'
    ? '#e14eca'
    : theme === 'vue'
    ? '#0098f0'
    : theme === 'blue'
    ? '#1d8cf8'
    : theme === 'green'
    ? '#00bf9a'
    : theme === 'orange'
    ? '#ff8d72'
    : theme === 'red'
    ? '#fd5d93'
    : '#e14eca';
};

export const colorToTheme = (color: string): string => {
  return color === '#e14eca'
    ? 'primary'
    : color === '#0098f0'
    ? 'vue'
    : color === '#1d8cf8'
    ? 'blue'
    : color === '#00bf9a'
    ? 'green'
    : color === '#ff8d72'
    ? 'orange'
    : color === '#fd5d93'
    ? 'red'
    : 'primary';
};

export const colorToGradient = (color: string): string[] => {
  const theme = colorToTheme(color);
  return themeToGradient(theme);
};

export const themeToGradient = (theme: string): string[] => {
  return theme === 'primary'
    ? ['#e14eca', '#ba54f5']
    : theme === 'vue'
    ? ['#00f2c3', '#0098f0']
    : theme === 'blue'
    ? ['#1d8cf8', '#3358f4']
    : theme === 'orange'
    ? ['#ff8d72', '#ff6491']
    : theme === 'red'
    ? ['#fd5d93', '#ec250d']
    : theme === 'green'
    ? ['#42b883', '#389466']
    : ['#e14eca', '#ba54f5'];
};

export const themes: string[] = [
  'primary',
  'vue',
  'blue',
  'green',
  'orange',
  'red',
];

export const getTheme = (
  scheme: ColorSchemeName,
  theme: string | undefined,
): Theme => {
  return {
    dark: scheme === 'dark',
    colors: {
      primary: themeToColor(theme),
      background: scheme === 'dark' ? 'rgb(30, 30, 47)' : '#F5F6FA',
      card: scheme === 'dark' ? 'rgb(39, 41, 61)' : '#ffffff',
      text: scheme === 'dark' ? '#ffffff' : '#1D253B',
      border: scheme === 'dark' ? 'rgb(30, 30, 47)' : '#F5F6FA',
      notification: scheme === 'dark' ? 'rgb(30, 30, 47)' : '#F5F6FA',
    },
  };
};

export const hexToRGB = (hex: string, alpha: number): string => {
  var r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);

  if (alpha) {
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  } else {
    return 'rgb(' + r + ', ' + g + ', ' + b + ')';
  }
};
