import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const heavy = () => {
  ReactNativeHapticFeedback.trigger('impactHeavy', hapticOptions);
};

export const medium = () => {
  ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
};

export const light = () => {
  ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
};

export const error = () => {
  ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
};
