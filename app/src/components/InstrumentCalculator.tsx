import {useTheme} from '@react-navigation/native';
import React from 'react';
import {
  Dimensions,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';
import {
  AugmentedInstrument,
  getPortfolioDetails,
} from '../utils/PortfolioTools';
import {TextInput, TouchableOpacity} from 'react-native-gesture-handler';
import {sml} from '../utils/SizeTool';
import LinearGradient from 'react-native-linear-gradient';
import {colorToGradient} from '../utils/Themes';
import {AppContext} from '../context/context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useEffect} from 'react';

/* Calculator sub screen, to help calculate the perfect position size */

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    flex: 1,
  },
  separator: {
    borderTopWidth: 2,
    width: 150,
    alignSelf: 'center',
    marginTop: 15,
    opacity: 0.85,
  },
  inputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  input: {
    fontSize: sml(22, 24, 28),
    textAlignVertical: 'center',
    fontFamily: 'Poppins-Regular',
    justifyContent: 'flex-end',
  },
  legend: {
    marginVertical: sml(10, 15, 20),
    fontSize: sml(10, 12, 14),
    textAlign: 'center',
    fontFamily: 'Poppins-Light',
    paddingHorizontal: 50,
  },
  label: {
    fontSize: 12,
    opacity: 0.8,
    maxWidth: 80,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 130,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontFamily: 'Poppins-Regular',
  },
  result: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'column',
    alignItems: 'center',
  },
  buttonContainer: {
    justifyContent: 'center',
    flexDirection: 'row',
    marginVertical: 20,
  },
  quantity: {
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    fontSize: sml(32, 36, 40),
  },
  quantityLegend: {
    fontFamily: 'Poppins-Bold',
    textAlign: 'center',
    marginTop: -10,
  },
  line: {
    flexDirection: 'row',
  },
  legendContainer: {
    alignItems: 'flex-end',
    margin: 20,
  },
  detail: {
    fontFamily: 'Poppins-Regular',
    fontSize: sml(10, 12, 14),
    opacity: 0.7,
  },
  bold: {
    fontFamily: 'Poppins-Bold',
  },
  detailsmall: {
    fontSize: sml(8, 9, 10),
    opacity: 0.7,
  },
  resultContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    margin: 20,
    borderRadius: 20,
  },
});

interface InstrumentCalculatorProps {
  instrument: AugmentedInstrument;
}

interface Result {
  quantity: number;
  total: string;
  percentCapital: string;
  loss: string;
  percentLoss: string;
}

function InstrumentCalculator({instrument}: InstrumentCalculatorProps) {
  const {colors} = useTheme();
  const {state} = React.useContext(AppContext);
  const {total} = getPortfolioDetails(state.auth.conf || {}, state.instruments);

  const showResult = useSharedValue<boolean>(false);

  const gradient = colorToGradient(colors.primary);
  const textStyle: StyleProp<TextStyle> = {color: colors.text};
  const labelStyle: StyleProp<TextStyle> = {color: colors.text};

  const initialPru = (instrument.li?.last?.toFixed(2) || '') as string;
  const initialStop = ((instrument.li?.last
    ? (instrument.li?.last * 0.93).toFixed(2)
    : 0
  ).toString() || '') as string;

  const [valid, setValid] = React.useState(true);
  const [pru, onChangePru] = React.useState(initialPru);
  const [stop, onChangeStop] = React.useState(initialStop);
  const [risk, onChangeRisk] = React.useState('1');
  const [result, setResult] = React.useState<Result>({
    quantity: 0,
    total: '',
    percentCapital: '',
    loss: '',
    percentLoss: '',
  });

  const calculate = async () => {
    if (!valid) {
      return;
    }

    const cPRU = parseFloat(pru.replace(/,/g, '.') || '0');
    const cRisk = parseFloat(risk.replace(/,/g, '.') || '0');
    const cStop = parseFloat(stop.replace(/,/g, '.') || '0');

    const avgMaxLoss = (total * cRisk) / 100;

    const quantity = Math.floor(avgMaxLoss / (cPRU - cStop));
    const calculatorResult = {
      quantity: quantity,
      total: (quantity * cPRU).toFixed(2),
      percentCapital: (((quantity * cPRU) / total) * 100).toFixed(1),
      loss: ((cStop - cPRU) * quantity).toFixed(2),
      percentLoss: (100 - (100 * cStop) / cPRU).toFixed(1),
    };
    setResult(calculatorResult);
    showResult.value = true;
  };

  useEffect(() => {
    const isValid = !(pru === '' || risk === '' || stop === '');
    setValid(isValid);
    if (!isValid) {
      showResult.value = false;
    }
  }, [pru, risk, stop]);

  const infoStyle = useAnimatedStyle(() => ({
    transform: [
      {translateY: withTiming(showResult.value ? -25 : 0)},
      {scale: withSpring(showResult.value ? 0.5 : 1)},
    ],
    opacity: withTiming(showResult.value ? 0 : 1),
  }));

  const resultStyle = useAnimatedStyle(() => ({
    transform: [
      {translateY: withTiming(showResult.value ? 0 : +25)},
      {scale: withSpring(showResult.value ? 1 : 1.6)},
    ],
    opacity: withTiming(showResult.value ? 1 : 0),
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.separator, {borderColor: colors.primary}]} />
      <View style={styles.inputsContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, textStyle]}
            placeholder={initialPru}
            placeholderTextColor={'grey'}
            keyboardType="numeric"
            onChangeText={onChangePru}
            value={pru}
            selectionColor={colors.primary}
            returnKeyType={'done'}
          />
          <Text style={[styles.label, labelStyle]}>
            Prix d'achat de la valeur
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, textStyle]}
            placeholder={initialStop}
            placeholderTextColor={'grey'}
            keyboardType="numeric"
            onChangeText={onChangeStop}
            value={stop}
            selectionColor={colors.primary}
            returnKeyType={'done'}
          />
          <Text style={[styles.label, labelStyle]}>Niveau de stop</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, textStyle]}
            placeholder="1"
            placeholderTextColor={'grey'}
            keyboardType="numeric"
            onChangeText={onChangeRisk}
            value={risk}
            selectionColor={colors.primary}
            returnKeyType={'done'}
          />
          <Text style={[styles.label, labelStyle]}>Risque de perte (%)</Text>
        </View>
      </View>
      <View style={styles.result}>
        <Animated.View style={[infoStyle]}>
          <Text style={[styles.legend, {color: colors.text}]}>
            {valid
              ? "Calculer la taille d'une position et le risque qui lui est associé."
              : "Merci de remplir les 3 champs afin d'utiliser la calculette :)"}
          </Text>
        </Animated.View>
        <Animated.View
          style={[
            resultStyle,
            styles.resultContainer,
            {
              backgroundColor: colors.card,
            },
          ]}>
          <View style={{flex: 1}}>
            <View>
              <Text style={[styles.quantity, {color: colors.primary}]}>
                {result.quantity}
              </Text>
              <Text style={[styles.quantityLegend, {color: colors.primary}]}>
                titres
              </Text>
            </View>
          </View>
          <View
            style={[
              {
                justifyContent: 'space-around',
                margin: 20,
                flexDirection: 'column',
                flex: 1,
              },
            ]}>
            <View style={styles.legendContainer}>
              <View style={styles.line}>
                <Text
                  style={[styles.detail, styles.bold, {color: colors.text}]}>
                  {result.total}
                  {state.auth.currency}
                </Text>
                <Text style={[styles.detail, , {color: colors.text}]}>
                  {' '}
                  engagés
                </Text>
              </View>
              <View style={styles.line}>
                <Text style={[styles.detailsmall, {color: colors.text}]}>
                  soit{' '}
                </Text>
                <Text
                  style={[
                    styles.detailsmall,
                    styles.bold,
                    {color: colors.text},
                  ]}>
                  {result.percentCapital}%
                </Text>
                <Text style={[styles.detailsmall, {color: colors.text}]}>
                  {' '}
                  du portefeuille
                </Text>
              </View>
            </View>
            <View style={styles.legendContainer}>
              <View style={styles.line}>
                <Text
                  style={[styles.detail, styles.bold, {color: colors.text}]}>
                  {result.loss}
                  {state.auth.currency}
                </Text>
                <Text style={[styles.detail, {color: colors.text}]}>
                  {' '}
                  risqués
                </Text>
              </View>
              <View style={styles.line}>
                <Text style={[styles.detailsmall, {color: colors.text}]}>
                  avec un stop fixé à{' '}
                </Text>
                <Text
                  style={[
                    styles.detailsmall,
                    styles.bold,
                    {color: colors.text},
                  ]}>
                  {result.percentLoss}%
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
      <View style={[styles.buttonContainer, {opacity: valid ? 1 : 0.4}]}>
        <LinearGradient colors={gradient} style={[styles.button]}>
          <TouchableOpacity onPress={calculate}>
            <Text style={[styles.buttonText]}>Calculer</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>
  );
}

export default InstrumentCalculator;
