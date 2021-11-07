import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {withTiming} from 'react-native-reanimated';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import * as Haptic from '../utils/Haptic';

/* Simple selector with sliding animated background */

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  backgroundSelection: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    opacity: 0.11,
  },
  label: {
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
});

interface SelectorProps {
  elements: string[];
  elementWidth: number;
  onPress: (index: number) => void;
  backgroundSelectionStyle?: StyleProp<ViewStyle>;
  labelContainerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  initialValue?: number;
}

function Selector({
  elements,
  elementWidth,
  onPress,
  backgroundSelectionStyle,
  labelContainerStyle,
  labelStyle,
  initialValue,
}: SelectorProps) {
  const transition = useSharedValue<number>(0);
  const current = useSharedValue<number>(initialValue || 0);

  const style = useAnimatedStyle(() => ({
    transform: [{translateX: withTiming(elementWidth * current.value)}],
  }));

  const opacityStyles = [...Array(5).keys()].map((p, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({
      opacity: withTiming(current.value === i ? 1 : 0.4),
    })),
  );

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.backgroundSelection,
            style,
            {
              width: elementWidth,
            },
            backgroundSelectionStyle,
          ]}
        />
      </View>
      {elements.map((item, index) => {
        return (
          <TouchableWithoutFeedback
            key={item + index}
            onPress={() => {
              Haptic.light();
              transition.value = 0;
              transition.value = withTiming(1);
              current.value = index;
              onPress(index);
            }}>
            <Animated.View
              style={[
                labelContainerStyle,
                opacityStyles[index],
                {width: elementWidth},
              ]}>
              <Text style={[styles.label, labelStyle]}>{item}</Text>
            </Animated.View>
          </TouchableWithoutFeedback>
        );
      })}
    </View>
  );
}

export default Selector;
