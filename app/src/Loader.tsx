import React from 'react';

import {Dimensions, StyleSheet, Text, View} from 'react-native';
import MaskedView from '@react-native-community/masked-view';
import {useTheme} from '@react-navigation/native';
import {colorToGradient} from './utils/Themes';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
const {width} = Dimensions.get('window');

/* Simple loading screen using masked View and animated style*/
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskStyle: {
    height: 100,
    width: width,
  },
  maskText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 42,
    textAlign: 'center',
  },
  maskTextMini: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginTop: -10,
    textAlign: 'center',
  },
  maskBackground: {
    width,
    height: 200,
    marginTop: 50,
  },
});
function LoaderScreen() {
  const {colors} = useTheme();
  const gradient = [colors.background, ...colorToGradient(colors.primary)];

  const style = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withRepeat(
          withSequence(
            withTiming(0, {duration: 2000}),
            withTiming(-170, {duration: 2000}),
          ),
          9999,
          true,
        ),
      },
    ],
  }));

  return (
    <View style={[styles.container]}>
      <MaskedView
        style={styles.maskStyle}
        maskElement={
          <View style={{flex: 1}}>
            <Text style={[styles.maskText]}>moni</Text>
            <Text style={[styles.maskTextMini]}>
              Le copilote de votre épargne
            </Text>
          </View>
        }>
        <Animated.View style={[style, styles.maskBackground]}>
          <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </MaskedView>
    </View>
  );
}

export default LoaderScreen;
