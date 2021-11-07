import {useTheme} from '@react-navigation/native';
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {withTiming} from 'react-native-reanimated';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaskedView from '@react-native-community/masked-view';
import {colorToGradient} from '../utils/Themes';
import LinearGradient from 'react-native-linear-gradient';

/* Bottom instrument Bar to switch between instrument sub screens */
/* Cool masked view and gradient effect, todo : remove embedded styles ! */

const ITEM_WIDTH = 90;
const ITEM_PADDING = 5;
const ITEM_HEIGHT = 60;

const styles = StyleSheet.create({
  container: {
    marginLeft: 12,
    marginRight: 20,
    marginTop: 20,
    marginBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  backgroundSelection: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    opacity: 0.11,
  },
  labelContainer: {
    width: ITEM_WIDTH,
    paddingHorizontal: ITEM_PADDING,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 6,
  },
  label: {
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    lineHeight: 13,
    fontSize: 12,
  },
});

interface InstrumentNavigationProps {
  onPress: (index: number) => void;
}

function InstrumentNavigation({onPress}: InstrumentNavigationProps) {
  const {colors} = useTheme();
  const gradient = colorToGradient(colors.primary);

  const transition = useSharedValue<number>(0);
  const current = useSharedValue<number>(0);

  const items: {label: string; icon: string}[] = [
    {label: 'Afficher le\ngraphique', icon: 'bar-chart-outline'},
    {label: 'Modifier\nla position', icon: 'cart-outline'},
    {label: 'Calculer\nla taille', icon: 'calculator-outline'},
  ];

  const style = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming((ITEM_WIDTH + ITEM_PADDING) * current.value, {
          duration: 250,
          easing: Easing.ease,
        }),
      },
    ],
  }));
  // const opacityStyles = elements.map((p, i) => useAnimatedStyle(() => ({
  //     opacity: withTiming(current.value === i ? 1 : 0.4)
  // })));

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginLeft: 12,
        marginRight: 20,
        marginTop: 20,
        marginBottom: 30,
      }}>
      <MaskedView
        style={[
          {
            flexDirection: 'row',
          },
        ]}
        maskElement={
          <View
            style={[
              {
                backgroundColor: 'transparent',
                flexDirection: 'row',
                justifyContent: 'space-around',
                flex: 1,
                height: 60,
              },
            ]}>
            {items.map((item, index) => {
              return (
                <Animated.View
                  key={'masked' + item.label + index}
                  style={[styles.labelContainer]}>
                  <Ionicons
                    style={styles.icon}
                    name={item.icon}
                    size={24}
                    color={'black'}
                  />
                  <Text style={[styles.label]}>{item.label}</Text>
                </Animated.View>
              );
            })}
          </View>
        }>
        <View
          style={{
            width: (ITEM_PADDING * 2 + ITEM_WIDTH) * items.length,
            height: ITEM_HEIGHT,
            backgroundColor: 'grey',
            flexDirection: 'row',
          }}>
          <View style={StyleSheet.absoluteFill}>
            <Animated.View
              style={[
                style,
                {
                  width: ITEM_PADDING * 2 + ITEM_WIDTH,
                  height: ITEM_HEIGHT,
                  borderRadius: ITEM_HEIGHT / 2,
                },
              ]}>
              <LinearGradient colors={gradient} style={[{flex: 1}]} />
            </Animated.View>
          </View>
          {items.map((item, index) => {
            return (
              <TouchableWithoutFeedback
                style={[
                  styles.labelContainer,
                  {
                    width: ITEM_PADDING * 2 + ITEM_WIDTH,
                    height: ITEM_HEIGHT,
                    //backgroundColor: ['red', 'orange', 'blue'][index]
                  },
                ]}
                key={item.label + index}
                onPress={() => {
                  transition.value = 0;
                  transition.value = withTiming(1);
                  current.value = index;
                  onPress(index);
                }}
              />
            );
          })}
        </View>
      </MaskedView>
      <TouchableWithoutFeedback
        style={{}}
        onPress={() => {
          onPress(-1);
        }}>
        <Animated.View style={[styles.labelContainer]}>
          <Ionicons name={'close-outline'} size={46} color={colors.text} />
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
}

export default InstrumentNavigation;
