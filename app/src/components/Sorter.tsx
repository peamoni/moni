import { useTheme } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import {
  TapGestureHandler,
  TouchableOpacity,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  useDerivedValue,
  useAnimatedGestureHandler,
  runOnJS,
} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ScreenerSortItem } from '../model/model';
import { sml } from '../utils/SizeTool';
const { height, width } = Dimensions.get('screen');

/* Simple animaed component to display sort modal */
// Could be optimize to hide the tabbar !

const ITEM_HEIGTH = sml(34, 36, 38);
const styles = StyleSheet.create({
  container: {},
  filterContainer: {
    position: 'absolute',
    right: 0,
    borderRadius: 8,
    elevation: 1000,
    zIndex: 1000,
  },
  iconContainer: {
    position: 'absolute',
    right: 0,
    marginTop: 10,
    marginRight: 10,
    borderRadius: 4,
    width: 26,
    height: 26,
    elevation: 1000,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    left: -width,
    top: -height,
    opacity: 0.6,
    backgroundColor: 'black',
    height: height * 2,
    width: width * 2,
  },
  itemContainer: {
    height: ITEM_HEIGTH,
    justifyContent: 'center',
  },
  itemStyle: {
    fontFamily: 'Poppins-Regular',
    fontSize: sml(12, 14, 16),
    textAlign: 'right',
    paddingLeft: 15,
    marginRight: 40,
  },
  currentSortIcon: {
    position: 'absolute',
    right: 0,
    height: ITEM_HEIGTH,
    width: ITEM_HEIGTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

interface SorterProps {
  index: number;
  order: 1 | -1;
  items: ScreenerSortItem[];
  onSortChanged: (index: number, order: 1 | -1) => void;
}

const sortItemToLabel = (item: ScreenerSortItem) => {
  if (item === 'name') { return 'Nom'; }
  if (item === 'duration') { return 'Durée de la tendance'; }
  else if (item === 'gapproximity') { return 'Proximité du gap'; }
  else if (item === 'maCrossProximity') { return 'Proximité du croisement'; }
  else if (item === 'perf') { return 'Performance de la tendance'; }
  else if (item === 'perfpos') { return 'Performance de la position'; }
  else if (item === 'proximity') { return 'Proximité du retournement'; }
  else if (item === 'speed') { return 'Vitesse de la tendance'; }
  else if (item === 'variation') { return 'Variation du jour'; }
  else if (item === 'volevol') { return 'Variation du volume'; }
  else if (item === 'volume') { return 'Variation du volume'; }
  else if (item === 'pv') { return '± values'; }
  else if (item === 'stop') { return 'Proximité du stop'; }
  else if (item === 'value') { return 'Valeur de la ligne'; }
  else return 'Volume';
};

const Sorter = ({ items, index, order, onSortChanged }: SorterProps) => {
  const { colors } = useTheme();
  const isActive = useSharedValue(false);
  const selectedIndex = useSharedValue(index);
  const selectedOrder = useSharedValue(order);

  const overlayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: isActive.value ? 0 : withDelay(300, withTiming(1000)) },
    ],
    opacity: withTiming(isActive.value ? 0.5 : 0),
  }));
  const containerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isActive.value ? 1 : 0),
    transform: [
      { translateX: withTiming(isActive.value ? 0 : 400) },
      { scale: withSpring(isActive.value ? 1 : 2) },
    ],
  }));
  const iconContainerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isActive.value ? 0 : 1),
    transform: [{ translateX: withTiming(isActive.value ? 200 : 0) }],
  }));
  const rotation = useDerivedValue<number>(() =>
    withTiming(selectedOrder.value === 1 ? 0 : 180),
  );
  const currentIconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: withTiming(ITEM_HEIGTH * selectedIndex.value) },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const itemStyles = items.map((item, index) => {
    return useAnimatedStyle(() => ({
      opacity: withTiming(selectedIndex.value === index ? 1 : 0.3),
    }));
  });

  function callback(index: number, order: -1 | 1) {
    onSortChanged(index, order);
  }

  const eventHandler = useAnimatedGestureHandler({
    onEnd: (event, ctx) => {
      isActive.value = !isActive.value;
      runOnJS(callback)(selectedIndex.value, selectedOrder.value);
    },
  });

  return (
    <View style={styles.container}>
      <TapGestureHandler onGestureEvent={eventHandler}>
        <Animated.View style={[styles.overlay, overlayStyle]}></Animated.View>
      </TapGestureHandler>
      <Animated.View
        style={[
          styles.filterContainer,
          containerStyle,
          {
            backgroundColor: colors.card,
          },
        ]}>
        <View>
          {items.map((item: ScreenerSortItem, index: number) => {
            return (
              <TouchableOpacity
                style={styles.itemContainer}
                key={'sort' + item}
                onPress={() => {
                  if (selectedIndex.value == index) {
                    selectedOrder.value *= -1;
                  }
                  selectedIndex.value = index;
                }}>
                <Animated.Text
                  style={[
                    styles.itemStyle,
                    {
                      color: colors.text,
                    },
                    itemStyles[index],
                  ]}>
                  {sortItemToLabel(item)}
                </Animated.Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Animated.View style={[styles.currentSortIcon, currentIconStyle]}>
          <Ionicons
            onPress={() => {
              selectedOrder.value *= -1;
            }}
            name={'caret-up-outline'}
            size={28}
            color={colors.primary}
          />
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[
          styles.iconContainer,
          iconContainerStyle,
          {
            backgroundColor: colors.card,
          },
        ]}>
        <TouchableOpacity
          onPress={() => {
            isActive.value = !isActive.value;
          }}>
          <View style={{ alignItems: 'center' }}>
            <Ionicons
              name={'caret-up-outline'}
              size={18}
              color={colors.primary}
            />
            <Ionicons
              name={'caret-down-outline'}
              size={18}
              color={colors.primary}
              style={{ marginTop: -10 }}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default Sorter;
