import React from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';
import {PanGestureHandler} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {getYForX, Vector} from 'react-native-redash';
import {GraphDataWrapper} from '../utils/Data2Graph';

/* Animated graph overlay, displayed when the user swippe a graph */

const CURSOR = 50;
const styles = StyleSheet.create({
  cursor: {
    width: CURSOR,
    height: CURSOR,
    borderRadius: CURSOR / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cursorBody: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: 'white',
  },
});

interface CursorProps {
  index: Animated.SharedValue<number>;
  translation: Vector<Animated.SharedValue<number>>;
  graphs: GraphDataWrapper[];
  isActive: Animated.SharedValue<boolean>;
  cursorBackground: string;
  dotBackground: string;
}

const Cursor = ({
  index,
  translation,
  graphs,
  isActive,
  cursorBackground,
  dotBackground,
}: CursorProps) => {
  const onGestureEvent = useAnimatedGestureHandler(
    {
      onStart: () => {
        isActive.value = true;
      },
      onActive: event => {
        if (graphs[index.value]) {
          translation.x.value = event.x;
          translation.y.value =
            getYForX(graphs[index.value].data.path, translation.x.value) || 0;
        }
      },
      onEnd: () => {
        isActive.value = false;
      },
    },
    [graphs],
  );

  const style = useAnimatedStyle(() => {
    const translateX = translation.x.value - CURSOR / 2;
    const translateY = translation.y.value - CURSOR / 2;
    return {
      transform: [
        {translateX},
        {translateY},
        {scale: withSpring(isActive.value ? 1 : 0)},
      ],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <PanGestureHandler {...{onGestureEvent}}>
        <Animated.View style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[styles.cursor, style, {backgroundColor: cursorBackground}]}>
            <View
              style={[styles.cursorBody, {backgroundColor: dotBackground}]}
            />
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

export default Cursor;
