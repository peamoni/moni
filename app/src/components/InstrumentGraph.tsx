import {useTheme} from '@react-navigation/native';
import React from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
} from 'react-native-reanimated';
import {withTiming} from 'react-native-reanimated';
import {hexToRGB} from '../utils/Themes';
import Svg, {Path} from 'react-native-svg';
import {mixPath, Vector} from 'react-native-redash';
import Cursor from './Cursor';
import MinMax from './MinMax';
import {GraphDataWrapper} from '../utils/Data2Graph';
import {AugmentedInstrument} from '../utils/PortfolioTools';
import Selector from './Selector';
import {Currency} from '../context/reducers';

const {width} = Dimensions.get('window');

/* Display instrument graph on multiple periods of time, swipe effect, min max and cursor overlays */

const PERIOD_SELECTOR_WIDTH = 64;
const GRAPH_HEIGHT = 300;
const GRAPH_WIDTH = width;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  graphContainer: {
    marginVertical: 20,
    height: GRAPH_HEIGHT,
  },
  labelContainer: {
    paddingHorizontal: 19,
    paddingVertical: 6,
    width: PERIOD_SELECTOR_WIDTH,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
});

interface InstrumentGraphProps {
  graphs: GraphDataWrapper[];
  translation: Vector<Animated.SharedValue<number>>;
  instrument: AugmentedInstrument;
  isCursorActive: Animated.SharedValue<boolean>;
  previousPeriod: Animated.SharedValue<number>;
  currentPeriod: Animated.SharedValue<number>;
  currency: Currency;
}

function InstrumentGraph({
  graphs,
  translation,
  instrument,
  isCursorActive,
  previousPeriod,
  currentPeriod,
  currency,
}: InstrumentGraphProps) {
  const AnimatedPath = Animated.createAnimatedComponent(Path);
  const {colors} = useTheme();
  const transition = useSharedValue(0);
  const animatedProps = useAnimatedProps(() => {
    if (!graphs.length) {
      return {d: ''};
    }
    const previousPath = graphs[previousPeriod.value].data.path;
    const currentPath = graphs[currentPeriod.value].data.path;
    return {
      d: mixPath(transition.value, previousPath, currentPath),
    };
  });
  return (
    <View style={styles.container}>
      <View style={styles.graphContainer}>
        <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
          <AnimatedPath
            animatedProps={animatedProps}
            fill="transparent"
            stroke={colors.text}
            strokeWidth={2}
          />
        </Svg>
        <MinMax
          graphs={graphs}
          index={currentPeriod}
          width={GRAPH_WIDTH}
          decimal={instrument.pd}
          currency={currency}
        />
        <Cursor
          translation={translation}
          index={currentPeriod}
          graphs={graphs}
          isActive={isCursorActive}
          cursorBackground={hexToRGB(colors.primary, 0.2)}
          dotBackground={colors.primary}
        />
      </View>
      <View style={{flexDirection: 'row', justifyContent: 'center'}}>
        {graphs.length ? (
          <Selector
            elements={graphs.map(item => item.label)}
            elementWidth={PERIOD_SELECTOR_WIDTH}
            onPress={(index: number) => {
              previousPeriod.value = currentPeriod.value;
              currentPeriod.value = index;
              transition.value = 0;
              transition.value = withTiming(1);
            }}
            backgroundSelectionStyle={{
              backgroundColor: colors.text,
              opacity: 0.21,
            }}
            labelContainerStyle={styles.labelContainer}
            initialValue={currentPeriod.value}
            labelStyle={[styles.label, {color: colors.text}]}
          />
        ) : null}
      </View>
    </View>
  );
}

export default InstrumentGraph;
