import {Dimensions} from 'react-native';

const {height} = Dimensions.get('window');

const IS_SMALL = height <= 700;
const IS_MEDIUM = !IS_SMALL && height <= 800;

// Precious sml function to configure style depending on the the screen width
export const sml = (s: number, m: number, l: number): number => {
  return IS_SMALL ? s : IS_MEDIUM ? m : l;
};
