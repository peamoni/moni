import {useTheme} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack/lib/typescript/src/types';
import React, {useEffect, useState} from 'react';

import {Dimensions, Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {round, useVector} from 'react-native-redash';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  AugmentedInstrument,
  AugmentedPosition,
  getPortfolioDetails,
} from './utils/PortfolioTools';
import {ColorPalette} from './utils/Themes';
import {GraphDataWrapper, getInstrumentGraph} from './utils/Data2Graph';
import InstrumentNavigation from './components/InstrumentNavigation';
import {ScrollView} from 'react-native-gesture-handler';
import InstrumentGraph from './components/InstrumentGraph';
import InstrumentPosition from './components/InstrumentPosition';
import InstrumentCalculator from './components/InstrumentCalculator';
import {AppContext} from './context/context';
import AnimateableText from 'react-native-animateable-text';
import {sml} from './utils/SizeTool';
import Bugsnag from '@bugsnag/react-native';
const {width} = Dimensions.get('window');
import * as Haptic from './utils/Haptic';

/* Instrument details (displayed as a modal), containing a scroll view with other components */

// Global modal conf, and shared stuffs
export const SCROLLVIEW_HEIGHT = 380;
const GRAPH_HEIGHT = SCROLLVIEW_HEIGHT - 80;
const GRAPH_WIDTH = width;
const PERIODS: [string, number][] = [
  ['1M', 1],
  ['3M', 3],
  ['6M', 6],
  ['1A', 12],
];

// Modal parameters
type InstrumentParamList = {
  Instrument: {
    instrument: AugmentedInstrument;
    position: AugmentedPosition;
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  headerContainer: {
    paddingHorizontal: 30,
    paddingVertical: 10,
    marginBottom: 4,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instrumentName: {
    fontSize: 20,
    marginTop: 16,
    paddingHorizontal: 50,
    alignSelf: 'center',
  },
  tickerContainer: {
    flex: 1,
    paddingRight: 8,
  },
  instrumentTicker: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  instrumentIsin: {
    fontSize: 8,
    fontFamily: 'Poppins-Regular',
  },
  quoteContainer: {
    flex: 1,
    marginTop: 3,
  },
  quoteValue: {
    fontSize: 24,
    textAlign: 'center',
  },
  rightContainer: {
    flex: 1,
    height: 36,
  },
  percentContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  percentValue: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  histoDate: {
    fontSize: sml(10, 12, 14),
    marginTop: sml(8, 5, 2),
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    color: 'white',
    fontFamily: 'Poppins-Regular',
  },
  dateValue: {
    textAlign: 'right',
    fontSize: 8,
  },
});

function InstrumentScreen({
  navigation,
  route,
}: StackScreenProps<InstrumentParamList, 'Instrument'>) {
  const {instrument} = route.params;
  const {state} = React.useContext(AppContext);
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  // Ref to programatically manipulate the scroll view position
  const scrollViewRef = React.createRef<ScrollView>();

  // Get the current position, if the user has one on the current instrument
  const {positions} = getPortfolioDetails(
    state.auth.conf || {},
    state.instruments,
  );
  const position =
    positions.find(p => p.pos?.isin === instrument.isin)?.pos || null;

  // Load instruments graphs
  const [graphs, setGraphs] = useState<GraphDataWrapper[]>([]);
  useEffect(() => {
    try {
      async function getGraphs() {
        const gg = await getInstrumentGraph(
          instrument,
          PERIODS,
          GRAPH_HEIGHT,
          GRAPH_WIDTH,
        );
        setGraphs(gg);
      }
      getGraphs();
    } catch (e) {
      Bugsnag.notify(e);
    }
  }, []);
  useEffect(() => {
    if (graphs.length) {
      previousPeriod.value = 0;
    }
  }, [graphs]);

  // Translation help us get the current coordinate of user interraction on the graph
  const translation = useVector();
  // ...and this shared value to know if the user is swipping the graph
  const isCursorActive = useSharedValue(false);
  const previousPeriod = useSharedValue<number>(-1);
  const currentPeriod = useSharedValue<number>(0);
  // With interpolation, we're able to determine the price and date on the user graph touch
  const histInfo = useDerivedValue<{date: string; price: number}>(() => {
    if (!isCursorActive.value || !graphs || !graphs[currentPeriod.value]) {
      return {
        price: 0,
        date: '',
      };
    }
    const histo = graphs[currentPeriod.value].histo;
    const p = interpolate(
      translation.x.value,
      [0, width],
      [histo[0][1], histo[histo.length - 1][1]],
    );
    const histoIndex = histo.findIndex(h => h[1] >= p);
    return {
      price: histo[histoIndex][0],
      date: `${new Date(histo[histoIndex][1] * 1000).toLocaleDateString(
        'fr-FR',
      )}`,
    };
  });
  // Update dynamically the price text
  const histoPriceTextProps = useAnimatedProps(() => ({
    text:
      round(histInfo.value.price, instrument.pd).toLocaleString('fr-FR') +
      state.auth.currency,
  }));
  // ...and the date text
  const histoDateTextProps = useAnimatedProps(() => ({
    text: histInfo.value.date,
  }));

  // The percent disapear when cursor is active, to display the price !
  const percentStyles = [0, 0].map(() =>
    useAnimatedStyle(() => ({
      opacity: withTiming(isCursorActive.value ? 0 : 1),
      transform: [
        {translateY: withTiming(-20 * (isCursorActive.value ? 1 : 0))},
      ],
    })),
  );
  const histoStyles = [0, 0].map(() =>
    useAnimatedStyle(() => ({
      opacity: withTiming(isCursorActive.value ? 1 : 0),
      transform: [
        {translateY: withTiming(20 * (isCursorActive.value ? 0 : 1))},
      ],
    })),
  );
  const graphOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(previousPeriod.value === -1 ? 0 : 1),
  }));

  return (
    <View style={[styles.container]}>
      <Pressable style={{flex: 1}} onPress={() => navigation.goBack()} />
      <View
        style={[
          styles.modalContent,
          {
            paddingBottom: insets.bottom,
            backgroundColor: colors.background,
          },
        ]}>
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={[styles.instrumentName, {color: colors.text}]}>
          {instrument.na}
        </Text>
        <View style={styles.headerContainer}>
          <View style={styles.tickerContainer}>
            <Text style={[styles.instrumentTicker, {color: colors.text}]}>
              {instrument.sy}
            </Text>
            <Text style={[styles.instrumentIsin, {color: colors.text}]}>
              {instrument.isin}
            </Text>
          </View>
          <View style={styles.rightContainer}>
            <Animated.View
              style={[
                styles.quoteContainer,
                StyleSheet.absoluteFill,
                percentStyles[0],
              ]}>
              {instrument.li && instrument.li.last ? (
                <Text style={[styles.quoteValue, {color: colors.text}]}>
                  {round(instrument.li?.last, instrument.pd).toLocaleString(
                    'fr-FR',
                  ) + state.auth.currency}
                </Text>
              ) : null}
            </Animated.View>
            <Animated.View
              style={[
                styles.quoteContainer,
                StyleSheet.absoluteFill,
                histoStyles[0],
              ]}>
              <AnimateableText
                animatedProps={histoPriceTextProps}
                style={[styles.quoteValue, {color: colors.text}]}
              />
            </Animated.View>
          </View>
          <View style={styles.rightContainer}>
            <Animated.View
              style={[
                styles.percentContainer,
                StyleSheet.absoluteFill,
                percentStyles[1],
              ]}>
              {instrument.percent != null ? (
                <Text
                  style={[
                    styles.percentValue,
                    {
                      color:
                        instrument.percent >= 0
                          ? ColorPalette.Success
                          : ColorPalette.Danger,
                    },
                  ]}>
                  {(instrument.percent >= 0 ? '+' : '') +
                    round(instrument.percent, 2).toLocaleString('fr-FR')}
                  %
                </Text>
              ) : null}
              {instrument.li?.lt ? (
                <Text
                  style={[styles.dateValue, {color: colors.text}]}>{`${new Date(
                  instrument.li.lt * 1000,
                ).toLocaleString('fr-FR')}`}</Text>
              ) : null}
            </Animated.View>
            <Animated.View
              style={[
                styles.percentContainer,
                StyleSheet.absoluteFill,
                histoStyles[1],
              ]}>
              <AnimateableText
                animatedProps={histoDateTextProps}
                style={[styles.histoDate, {backgroundColor: colors.primary}]}
              />
            </Animated.View>
          </View>
        </View>
        <ScrollView
          ref={scrollViewRef}
          pagingEnabled={true}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={{
            width: '100%',
            height: SCROLLVIEW_HEIGHT,
          }}>
          <Animated.View
            style={[graphOpacity, {width: width, height: SCROLLVIEW_HEIGHT}]}>
            <InstrumentGraph
              graphs={graphs}
              instrument={instrument}
              isCursorActive={isCursorActive}
              translation={translation}
              previousPeriod={previousPeriod}
              currentPeriod={currentPeriod}
              currency={state.auth.currency}
            />
          </Animated.View>
          <View style={{width: width, height: SCROLLVIEW_HEIGHT}}>
            <InstrumentPosition instrument={instrument} position={position} />
          </View>
          <View style={{width: width, height: SCROLLVIEW_HEIGHT}}>
            <InstrumentCalculator instrument={instrument} />
          </View>
          <View style={{width: width, backgroundColor: 'blue', height: 100}} />
          <View
            style={{
              width: width,
              backgroundColor: 'yellow',
              height: 100,
            }}
          />
        </ScrollView>
        <InstrumentNavigation
          onPress={(index: number) => {
            if (index === -1) {
              Haptic.light();
              navigation.goBack();
            } else {
              scrollViewRef.current?.scrollTo({
                x: index * width,
                animated: true,
              });
            }
          }}
        />
      </View>
    </View>
  );
}

export default InstrumentScreen;
