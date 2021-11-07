import {useNavigation, useTheme} from '@react-navigation/native';
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ColorPalette} from '../utils/Themes';
import {round} from 'react-native-redash';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import {withTiming} from 'react-native-reanimated';
import {AugmentedInstrument, AugmentedPosition} from '../utils/PortfolioTools';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {sml} from '../utils/SizeTool';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Currency, Mode} from '../context/reducers';
import * as Haptic from '../utils/Haptic';

/* Instrument element displayed in every lists, with animated content  */

const CUSTOM_WIDTH = 100;
const CUSTOM_HEIGHT = sml(30, 32, 34);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 4,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
    paddingRight: 8,
  },
  instrumentName: {
    fontSize: sml(12, 14, 16),
  },
  instrumentTicker: {
    fontSize: sml(12, 13, 14),
    fontFamily: 'Poppins-SemiBold',
  },
  quoteContainer: {
    width: 80,
    paddingRight: 8,
  },
  quoteValue: {
    fontSize: sml(12, 13, 14),
    textAlign: 'right',
  },
  customContainer: {
    width: CUSTOM_WIDTH,
    height: CUSTOM_HEIGHT,
  },
  pruAndQuantity: {
    fontSize: sml(12, 13, 14),
    textAlign: 'right',
  },
});

export type InstrumentDisplay =
  | 'GRAPH'
  | 'VALUE'
  | 'PRU'
  | 'TREND'
  | 'VOLUMES'
  | 'SPEED'
  | 'STOP';
const INST_DISPLAYS: InstrumentDisplay[] = [
  'GRAPH',
  'VALUE',
  'PRU',
  'TREND',
  'VOLUMES',
  'SPEED',
  'STOP',
];

interface InstrumentProps {
  instrument: AugmentedInstrument;
  onPress?: () => void;
  position: AugmentedPosition | null;
  display: Animated.SharedValue<InstrumentDisplay>;
  currency: Currency;
  mode: Mode;
}

function InstrumentElement({
  instrument,
  onPress,
  position,
  display,
  currency,
  mode,
}: InstrumentProps) {
  const navigation = useNavigation();
  const {colors} = useTheme();
  const currentDisplay = useDerivedValue<InstrumentDisplay>(
    () => display.value,
  );

  const opacityStylesInstDisplay = INST_DISPLAYS.map(p =>
    useAnimatedStyle(() => ({
      opacity: withTiming(currentDisplay.value === p ? 1 : 0, {duration: 250}),
      //width: currentDisplay.value === p ? CUSTOM_WIDTH : 0
    })),
  );

  const customWidth = {width: mode === 'crypto' ? 120 : CUSTOM_WIDTH};

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        /* 1. Navigate to the Details route with params */
        Haptic.light();
        navigation.navigate('Instrument', {
          instrument,
          position,
        });
        if (onPress) {
          onPress();
        }
      }}>
      <View style={[styles.container, {backgroundColor: colors.card}]}>
        <View style={styles.nameContainer}>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.instrumentName, {color: colors.text}]}>
            {instrument.na}
          </Text>
          <Text style={[styles.instrumentTicker, {color: colors.text}]}>
            {instrument.sy}
          </Text>
        </View>
        <View
          style={[
            styles.quoteContainer,
            {width: mode === 'crypto' ? 100 : 80},
          ]}>
          {instrument.li && instrument.li.last ? (
            <Text style={[styles.quoteValue, {color: colors.text}]}>
              {round(instrument.li?.last, instrument.pd).toLocaleString(
                'fr-FR',
              ) + currency}
            </Text>
          ) : null}
          {instrument.percent != null ? (
            <Text
              style={[
                styles.quoteValue,
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
        </View>
        <View style={[styles.customContainer, customWidth]}>
          {position?.pruPercent != null ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                opacityStylesInstDisplay[INST_DISPLAYS.indexOf('PRU')],
              ]}>
              <Text style={[styles.pruAndQuantity, {color: colors.text}]}>
                {position.quantity}@
                {round(position.value, instrument.pd).toLocaleString('fr-FR')}
              </Text>
              <Text
                style={[
                  styles.quoteValue,
                  {
                    color:
                      position.pruPercent >= 0
                        ? ColorPalette.Success
                        : ColorPalette.Danger,
                  },
                ]}>
                {(position.pruPercent >= 0 ? '+' : '') +
                  round(position.pruPercent, 2).toLocaleString('fr-FR')}
                %
              </Text>
            </Animated.View>
          ) : null}
          {position?.pv != null && position.totalValue != null ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                opacityStylesInstDisplay[INST_DISPLAYS.indexOf('VALUE')],
              ]}>
              <Text style={[styles.pruAndQuantity, {color: colors.text}]}>
                {round(position.totalValue, 2).toLocaleString('fr-FR') +
                  currency}
              </Text>
              <Text
                style={[
                  styles.quoteValue,
                  {
                    color:
                      position.pv >= 0
                        ? ColorPalette.Success
                        : ColorPalette.Danger,
                  },
                ]}>
                {(position.pv >= 0 ? '+' : '') +
                  round(position.pv, 2).toLocaleString('fr-FR') +
                  currency}
              </Text>
            </Animated.View>
          ) : null}
          {position?.stop != null && position.stopPercent ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                opacityStylesInstDisplay[INST_DISPLAYS.indexOf('STOP')],
              ]}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}>
                <Ionicons
                  name={'close-circle-outline'}
                  size={sml(14, 16, 18)}
                  color={colors.text}
                  style={{marginRight: 4}}
                />
                <Text style={[styles.quoteValue, {color: colors.text}]}>
                  {round(position.stop, instrument.pd).toLocaleString('fr-FR') +
                    currency}
                </Text>
              </View>
              <Text
                style={[
                  styles.pruAndQuantity,
                  {
                    color:
                      position.stopPercent <= 10
                        ? ColorPalette.Success
                        : ColorPalette.Danger,
                  },
                ]}>
                {round(position.stopPercent, 1).toLocaleString('fr-FR')}%
              </Text>
            </Animated.View>
          ) : null}
          {instrument && instrument.in.bd != null ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                opacityStylesInstDisplay[INST_DISPLAYS.indexOf('TREND')],
              ]}>
              <Text
                style={[
                  styles.quoteValue,
                  {
                    color: instrument.in.p
                      ? ColorPalette.Success
                      : ColorPalette.Danger,
                  },
                ]}>
                {instrument.in.p ? 'Haussière' : 'Baissière'}
              </Text>
              <Text style={[styles.pruAndQuantity, {color: colors.text}]}>
                le{' '}
                {new Date(instrument.in.bd * 1000).toLocaleDateString('fr-FR')}
              </Text>
            </Animated.View>
          ) : null}
          {instrument.trendSpeed != null &&
          instrument.trendPerformance != null ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                opacityStylesInstDisplay[INST_DISPLAYS.indexOf('SPEED')],
              ]}>
              <Text style={[styles.quoteValue, {color: colors.text}]}>
                {round(instrument.trendPerformance, 2).toLocaleString('fr-FR')}%
              </Text>
              <Text style={[styles.pruAndQuantity, {color: colors.text}]}>
                {round(instrument.trendSpeed, 1).toLocaleString('fr-FR')}%/mois
              </Text>
            </Animated.View>
          ) : null}
          {instrument.ave != null && instrument.volEvol != null ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                opacityStylesInstDisplay[INST_DISPLAYS.indexOf('VOLUMES')],
              ]}>
              <Text style={[styles.quoteValue, {color: colors.text}]}>
                {round(instrument.ave, 0).toLocaleString('fr-FR')}k{currency}
              </Text>
              <Text
                style={[
                  styles.pruAndQuantity,
                  {
                    color:
                      instrument.volEvol >= 0
                        ? ColorPalette.Success
                        : ColorPalette.Danger,
                  },
                ]}>
                x{round(instrument.volEvol, 1).toLocaleString('fr-FR')}
              </Text>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

export default InstrumentElement;
