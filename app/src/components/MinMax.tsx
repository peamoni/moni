import {useTheme} from '@react-navigation/native';
import React from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import {round} from 'react-native-redash';
import {GraphDataWrapper} from '../utils/Data2Graph';
import AnimateableText from 'react-native-animateable-text';
import {Currency} from '../context/reducers';

/* Graph overlay to display min and max values on the period */

const LABEL_WIDTH = 70;
const Y_OFFSET = 14;

const styles = StyleSheet.create({
  minMaxContainer: {
    width: LABEL_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    opacity: 0.8,
  },
  minmaxLabel: {
    borderRadius: LABEL_WIDTH / 2,
    paddingHorizontal: 6,
    fontSize: 12,
    color: 'white',
    fontFamily: 'Poppins-Regular',
  },
  minmaxDateLabel: {
    fontSize: 9,
    fontFamily: 'Poppins-Regular',
  },
});

interface MinMaxProps {
  index: Animated.SharedValue<number>;
  graphs: GraphDataWrapper[];
  width: number;
  decimal: number;
  currency: Currency;
}

const MinMax = ({index, graphs, width, decimal, currency}: MinMaxProps) => {
  const {colors} = useTheme();

  const maxTranslate = width - LABEL_WIDTH;
  const priceMin = useDerivedValue<string>(() => {
    if (graphs && graphs[index.value]) {
      return (
        round(graphs[index.value].data.min.price, decimal).toLocaleString(
          'fr-FR',
        ) + currency
      );
    }
    return '';
  });
  const dateMin = useDerivedValue<string>(() => {
    if (graphs && graphs[index.value]) {
      return `${new Date(
        graphs[index.value].data.min.date * 1000,
      ).toLocaleDateString('fr-FR')}`;
    }
    return '';
  });
  const styleMin = useAnimatedStyle(() => {
    if (graphs && graphs[index.value]) {
      let translateX = graphs[index.value].data.min.x - LABEL_WIDTH / 2;
      translateX = Math.min(translateX, maxTranslate);
      translateX = Math.max(translateX, 0);
      return {
        transform: [{translateX: withSpring(translateX)}],
      };
    }
    return {};
  });
  const priceMax = useDerivedValue<string>(() => {
    if (graphs && graphs[index.value]) {
      return (
        round(graphs[index.value].data.max.price, decimal).toLocaleString(
          'fr-FR',
        ) + currency
      );
    }
    return '';
  });
  const dateMax = useDerivedValue<string>(() => {
    if (graphs && graphs[index.value]) {
      return `${new Date(
        graphs[index.value].data.max.date * 1000,
      ).toLocaleDateString('fr-FR')}`;
    }
    return '';
  });
  const priceMinTextProps = useAnimatedProps(() => ({text: priceMin.value}));
  const dateMinTextProps = useAnimatedProps(() => ({text: dateMin.value}));
  const priceMaxTextProps = useAnimatedProps(() => ({text: priceMax.value}));
  const dateMaxTextProps = useAnimatedProps(() => ({text: dateMax.value}));

  const styleMax = useAnimatedStyle(() => {
    if (graphs && graphs[index.value]) {
      let translateX = graphs[index.value].data.max.x - LABEL_WIDTH / 2;
      translateX = Math.min(translateX, maxTranslate);
      translateX = Math.max(translateX, 0);
      return {
        transform: [{translateX: withSpring(translateX)}],
      };
    }
    return {};
  });
  return (
    <View style={[StyleSheet.absoluteFill, {justifyContent: 'space-between'}]}>
      <Animated.View
        style={[styles.minMaxContainer, styleMax, {marginTop: -Y_OFFSET}]}>
        <AnimateableText
          animatedProps={dateMaxTextProps}
          style={[styles.minmaxDateLabel, {color: colors.primary}]}
        />
        <AnimateableText
          animatedProps={priceMaxTextProps}
          style={[styles.minmaxLabel, {backgroundColor: colors.primary}]}
        />
      </Animated.View>
      <Animated.View
        style={[styles.minMaxContainer, styleMin, {marginBottom: -Y_OFFSET}]}>
        <AnimateableText
          animatedProps={priceMinTextProps}
          style={[styles.minmaxLabel, {backgroundColor: colors.primary}]}
        />
        <AnimateableText
          animatedProps={dateMinTextProps}
          style={[styles.minmaxDateLabel, {color: colors.primary}]}
        />
      </Animated.View>
    </View>
  );
};

export default MinMax;
