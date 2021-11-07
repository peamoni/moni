import React, {useState} from 'react';

import {StyleSheet, FlatList, View} from 'react-native';
import Header from './components/Header';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useTheme} from '@react-navigation/native';
import StrongTrendScreener from './model/screeners/StrongTrendScreener';
import {AppContext} from './context/context';
import InstrumentList from './components/InstrumentList';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {InstrumentDisplay} from './components/InstrumentElement';
import Selector from './components/Selector';
import {ScreenerSortItem} from './model/model';
import SoonTrendScreener from './model/screeners/SoonTrendScreener';
import {TouchableOpacity} from 'react-native-gesture-handler';
import YoungTrendScreener from './model/screeners/YoungTrendScreener';
import SpeedTrendScreener from './model/screeners/SpeedTrendScreener';
import ActionScreener from './model/screeners/ActionScreener';
import {sml} from './utils/SizeTool';
import {StackNavigationHelpers} from '@react-navigation/stack/lib/typescript/src/types';
import Sorter from './components/Sorter';
import * as Haptic from './utils/Haptic';

const SCREENER_NAME_HEIGHT = sml(32, 36, 40);

/* Display the web screeners into an instrument list*/
const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  screenerNameContainer: {
    flex: 1,
    height: SCREENER_NAME_HEIGHT,
    alignItems: 'center',
    paddingTop: 5,
  },
  screenerName: {
    fontSize: sml(16, 18, 20),
    height: SCREENER_NAME_HEIGHT,
    opacity: 0.9,
    fontFamily: 'Poppins-Regular',
    color: 'white',
  },
  container: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: 10,
  },
  screenerTools: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  scrollToTopContainer: {
    position: 'absolute',
    right: 10,
    top: 10,
    zIndex: 1000,
  },
});

// Define available screeners (implementation of Screener object)
const strongTrend = new StrongTrendScreener();
const soonTrend = new SoonTrendScreener();
const youngTrend = new YoungTrendScreener();
const speedTrend = new SpeedTrendScreener();
const actionScreener = new ActionScreener();

const INST_DISPLAY_SELECTOR_WIDTH = 80;

// Sort elements
const sorts: ScreenerSortItem[] = ['name', 'duration', 'variation', 'volume'];

function ScreenerScreen({navigation}: {navigation: StackNavigationHelpers}) {
  const {colors} = useTheme();
  const {state} = React.useContext(AppContext);

  // Ref to the instrument list, cool to manipulate it programatically
  const listRef = React.createRef<FlatList>();

  // Active screeners
  const screeners = [
    strongTrend,
    soonTrend,
    youngTrend,
    speedTrend,
    actionScreener,
  ];
  // Current active screener
  const [activeScreenerIndex, setActiveScreenerIndex] = useState(0);

  // Current active screener index, to animate
  const current = useSharedValue<number>(0);
  // List of screeners name
  const screenerNames: string[] = screeners.map(s => s.name);
  // Update screener name style dynamically
  const screenerStyles = screenerNames.map((p, i) =>
    useAnimatedStyle(() => ({
      opacity: withTiming(current.value === i ? 1 : 0),
      transform: [
        {translateY: withTiming(-SCREENER_NAME_HEIGHT * current.value)},
      ],
    })),
  );
  const currentScreener = screeners[activeScreenerIndex];

  // Current sort element and order
  const [sort, setSort] = useState(currentScreener.defaultSortItem);
  const [sortOrder, setSortOrder] = useState(currentScreener.defaultSortOrder);

  // Filter and sort instruments depending on the current state
  const filteredInstruments = currentScreener
    .filter(state.instruments.livelist)
    .sort((a, b) => {
      if (!sort || sort === 'name') {
        return a.ins.na.localeCompare(b.ins.na) * sortOrder;
      }
      if (sort === 'variation' && a.ins.percent && b.ins.percent) {
        return (a.ins.percent - b.ins.percent) * sortOrder;
      }
      if (sort === 'volume' && a.ins.ave && b.ins.ave) {
        return (a.ins.ave - b.ins.ave) * sortOrder;
      }
      if (sort === 'volevol' && a.ins.volEvol && b.ins.volEvol) {
        return (a.ins.volEvol - b.ins.volEvol) * sortOrder;
      }
      if (
        sort === 'proximity' &&
        a.ins.reversePercent &&
        b.ins.reversePercent
      ) {
        return (a.ins.reversePercent - b.ins.reversePercent) * sortOrder;
      }
      if (sort === 'duration' && a.ins.in.bd && b.ins.in.bd) {
        return (a.ins.in.bd - b.ins.in.bd) * sortOrder;
      }
      if (sort === 'perf' && a.ins.trendPerformance && b.ins.trendPerformance) {
        return (a.ins.trendPerformance - b.ins.trendPerformance) * sortOrder;
      }
      if (sort === 'speed' && a.ins.trendSpeed && b.ins.trendSpeed) {
        return (a.ins.trendSpeed - b.ins.trendSpeed) * sortOrder;
      }
      return 1;
    })
    .slice(0, 50);

  // Shared value to animate the list
  const y = new Animated.Value(0);

  // Instrument display configuration and shared values
  const instrumentDisplays: InstrumentDisplay[] = ['TREND', 'VOLUMES', 'SPEED'];
  const instrumentDisplaysLabels: string[] = ['Tendance', 'Volumes', 'Vitesse'];
  const currentInstDisplayIndex = useSharedValue<number>(0);
  const currentInstDisplay = useDerivedValue<InstrumentDisplay>(
    () => instrumentDisplays[currentInstDisplayIndex.value],
  );

  // Animate the header while scrolling (todo: use reanimated2)
  const HEADER_SIZE = 65;
  const translateHeaderY = y.interpolate({
    inputRange: [-1, 0, HEADER_SIZE],
    outputRange: [0, 0, HEADER_SIZE],
  });
  const translateSelectorX = y.interpolate({
    inputRange: [-1, 0, HEADER_SIZE],
    outputRange: [0, 0, 150],
  });
  const opacitySelector = y.interpolate({
    inputRange: [-1, 0, HEADER_SIZE / 1.5],
    outputRange: [1, 1, 0],
  });
  const translateScrollToTopX = y.interpolate({
    inputRange: [-1, 0, HEADER_SIZE * 3, HEADER_SIZE * 1000],
    outputRange: [30, 30, 0, 0],
  });
  const opacityScrollToTop = y.interpolate({
    inputRange: [-1, 0, HEADER_SIZE * 3, HEADER_SIZE * 1000],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <>
      <Header navigation={navigation}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => {
              current.value = activeScreenerIndex - 1;
              setActiveScreenerIndex(activeScreenerIndex - 1);
              Haptic.light();
            }}
            disabled={activeScreenerIndex === 0}
            style={{padding: 10}}>
            <Ionicons
              style={{opacity: activeScreenerIndex === 0 ? 0.1 : 1}}
              name={'chevron-back-outline'}
              size={20}
              color={'white'}
            />
          </TouchableOpacity>
          <View style={styles.screenerNameContainer}>
            {screenerNames.map((item, index) => {
              return (
                <Animated.Text
                  key={'screenerName' + index}
                  style={[styles.screenerName, screenerStyles[index]]}>
                  {item}
                </Animated.Text>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => {
              current.value = activeScreenerIndex + 1;
              setActiveScreenerIndex(activeScreenerIndex + 1);
              Haptic.light();
            }}
            disabled={activeScreenerIndex === screeners.length - 1}
            style={{padding: 10}}>
            <Ionicons
              style={{
                opacity: activeScreenerIndex === screeners.length - 1 ? 0.1 : 1,
              }}
              name={'chevron-forward-outline'}
              size={20}
              color={'white'}
            />
          </TouchableOpacity>
        </View>
      </Header>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.scrollToTopContainer,
            {
              opacity: opacityScrollToTop,
              transform: [{translateX: translateScrollToTopX}],
            },
          ]}>
          <Ionicons
            onPress={() =>
              listRef.current?.scrollToOffset({offset: 0, animated: true})
            }
            name={'chevron-up-circle-outline'}
            size={28}
            color={colors.primary}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.scrollToTopContainer,
            {
              opacity: opacitySelector,
              transform: [{translateX: translateSelectorX}],
              position: 'absolute',
              zIndex: 1000,
            },
          ]}>
          <Sorter
            index={sorts.indexOf(sort)}
            order={sortOrder}
            items={sorts}
            onSortChanged={(index, order) => {
              setSort(sorts[index]);
              setSortOrder(order);
            }}
          />
        </Animated.View>

        <InstrumentList
          keyPrefix={'screener'}
          currentInstDisplay={currentInstDisplay}
          currency={state.auth.currency}
          mode={state.auth.mode}
          footer={null}
          listRef={listRef}
          header={
            <Animated.View
              style={[
                styles.screenerTools,
                {
                  justifyContent: 'center',
                  transform: [{translateY: translateHeaderY}],
                },
              ]}>
              <Animated.View
                style={{
                  opacity: opacitySelector,
                  transform: [{translateX: translateSelectorX}],
                }}>
                <Selector
                  elements={instrumentDisplaysLabels}
                  elementWidth={INST_DISPLAY_SELECTOR_WIDTH}
                  onPress={index => {
                    currentInstDisplayIndex.value = index;
                  }}
                  backgroundSelectionStyle={{
                    backgroundColor: colors.text,
                    opacity: 0.11,
                  }}
                  labelContainerStyle={{padding: 6}}
                  initialValue={currentInstDisplayIndex.value}
                  labelStyle={{color: colors.text, fontSize: 12}}
                />
              </Animated.View>
            </Animated.View>
          }
          instruments={filteredInstruments}
          y={y}
        />
      </View>
    </>
  );
}

export default ScreenerScreen;
