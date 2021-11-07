import {useTheme} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {StyleProp, StyleSheet, Text, TextStyle, View} from 'react-native';
import {colorToGradient} from '../utils/Themes';
import {AugmentedInstrument, AugmentedPosition} from '../utils/PortfolioTools';
import {TextInput, TouchableOpacity} from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import Dialog from 'react-native-dialog';
import {round} from 'react-native-redash';
import {updatePosition} from '../dao/firestore';
import {AppContext} from '../context/context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Bugsnag from '@bugsnag/react-native';

/* Display and update current user position for an instrument */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginVertical: 30,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  inputsContainer: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  pruContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pruSeparator: {
    fontSize: 39,
    marginBottom: 12,
    marginHorizontal: 12,
    fontFamily: 'Poppins-Regular',
  },
  inputWithSymbol: {
    flexDirection: 'row',
    alignItems: 'center',
    fontFamily: 'Poppins-Regular',
  },
  symbol: {
    fontFamily: 'Poppins-Regular',
    marginLeft: 6,
    fontSize: 28,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'column',
    fontFamily: 'Poppins-Regular',
  },
  textRight: {
    textAlign: 'right',
  },
  textCenter: {
    textAlign: 'center',
  },
  input: {
    fontSize: 28,
    textAlignVertical: 'center',
    fontFamily: 'Poppins-Regular',
    justifyContent: 'flex-end',
  },
  label: {
    fontSize: 12,
    opacity: 0.8,
    fontFamily: 'Poppins-Regular',
  },
  stopContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    alignSelf: 'stretch',
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
  noPositionContainer: {
    paddingHorizontal: 30,
  },
  noPositionLabel: {
    fontFamily: 'Poppins-Light',
    textAlign: 'center',
  },
  positionContainer: {
    paddingHorizontal: 30,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  totalPositionValue: {
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  totalPositionLabel: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Poppins-Light',
  },
  totalPositionPercent: {
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
  },
});

interface InstrumentPositionProps {
  instrument: AugmentedInstrument;
  position: AugmentedPosition | null;
}

function InstrumentPosition({instrument, position}: InstrumentPositionProps) {
  const {state, dispatch} = React.useContext(AppContext);
  const {colors} = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: colors.text};
  const labelStyle: StyleProp<TextStyle> = {
    color: colors.text,
    borderTopColor: colors.text,
  };
  const gradient = colorToGradient(colors.primary);

  const [quantity, onChangeQuantity] = React.useState(
    (position?.quantity?.toString() || '') as string,
  );
  const [pru, onChangePru] = React.useState(
    (position?.value?.toString() || '') as string,
  );
  const [stop, onChangeStop] = React.useState(
    (position?.stop?.toString() || '') as string,
  );

  const canSave = useSharedValue<boolean>(false);
  const canClose = useSharedValue<boolean>(false);

  const resetForm = () => {
    onChangeQuantity(position?.quantity?.toString() || '');
    onChangePru(position?.value?.toString() || '');
    onChangeStop(position?.stop?.toString() || '');
  };

  useEffect(() => {
    resetForm();
  }, [position]);

  const [displayConfirmModal, setDisplayConfirmModal] = React.useState(false);
  const [displaySellModal, setDisplaySellModal] = React.useState(false);
  const [loadingInfo, setLoadingInfo] = React.useState('');
  const [modalTitle, setModalTitle] = React.useState('');
  const [modalContent, setModalContent] = React.useState('');
  const [cashUpdate, setCashUpdate] = React.useState(0);
  const [sellPrice, onChangeSellPrice] = React.useState('');

  const loadingState = useSharedValue<number>(0);

  const savePosition = async () => {
    try {
      const newQuantity: number = parseInt(quantity.replace(/,/g, '.') || '0');
      const prevQuantity: number = position?.quantity || 0;
      const newPru = parseFloat(pru.replace(/,/g, '.') || '0');

      // Update cash if user is ok
      if (!position || newQuantity > prevQuantity) {
        let cashAdd = newQuantity * newPru;
        let content = `Confirmer et retirer les ${
          round(cashAdd, 2).toLocaleString('fr-FR') + state.auth.currency
        } correspondant à cet achat de votre cash ?`;

        if (position) {
          const positionBefore = prevQuantity * position.value;
          const positionAfter = newQuantity * newPru;
          cashAdd = positionAfter - positionBefore;
          content = `Confirmer et retirer les ${
            round(cashAdd, 2).toLocaleString('fr-FR') + state.auth.currency
          }, correspondant à votre pyramidage, de votre cash ?`;
        }

        // Demander confirmation pour update
        setModalTitle('Achat de titres');
        setModalContent(content);
        setCashUpdate(cashAdd * -1);
        setDisplayConfirmModal(true);
      } else if (newQuantity < prevQuantity && position) {
        const sellQuantity = prevQuantity - newQuantity;

        setModalTitle(`Vous avez allégé de ${sellQuantity} titres ?`);
        setModalContent(
          'Saisissez votre prix de vente unitaire pour ajuster automatiquement votre cash.',
        );
        setDisplaySellModal(true);
      } else {
        if (state.auth.user && state.auth.conf) {
          await updatePosition(
            state.auth.user,
            state.auth.conf,
            dispatch,
            {
              isin: instrument.isin,
              quantity: parseInt(quantity || '0'),
              value: parseFloat(pru.replace(/,/g, '.') || '0'),
              stop: parseFloat(stop.replace(/,/g, '.') || '0'),
            },
            0,
            state.auth.mode,
          );
        }
      }
    } catch (e) {
      Bugsnag.notify(e);
    }
  };
  const closePosition = () => {
    setModalTitle('Vous avez fermé la position.');
    onChangeQuantity('0');
    setModalContent(
      'Saisissez votre prix de vente unitaire pour ajuster automatiquement votre cash.',
    );
    setDisplaySellModal(true);
  };

  const updateCash = async () => {
    try {
      await updatePositionInfo(cashUpdate);
    } catch (e) {
      Bugsnag.notify(e);
    }
  };

  const sellPosition = async () => {
    try {
      const newQuantity: number = parseInt(quantity || '0');
      const prevQuantity: number = position?.quantity || 0;
      const sellQuantity = prevQuantity - newQuantity;

      // Si saisie, mets à jour le cash et on affiche le résumé
      const sellPriceNumber =
        sellPrice === '' ? 0 : parseFloat(sellPrice.replace(/,/g, '.'));
      const cashAdd = sellPriceNumber * sellQuantity;
      //const pv = (sellPrice - position.value) * sellQuantity;

      setDisplaySellModal(false);

      await updatePositionInfo(cashAdd);
    } catch (e) {
      Bugsnag.notify(e);
    }
  };

  useEffect(() => {
    canSave.value = quantity !== '' && pru !== '';
    canClose.value = !!position && quantity !== '';
  }, [quantity, pru, stop]);

  const cancel = () => {
    resetForm();
    setDisplaySellModal(false);
    setDisplayConfirmModal(false);
  };

  const updatePositionInfo = async (addCash: number) => {
    try {
      // Update position with new values
      setDisplaySellModal(false);
      setDisplayConfirmModal(false);
      startLoadingAnimation('Mise à jour de la position...');

      if (state.auth.user && state.auth.conf) {
        await updatePosition(
          state.auth.user,
          state.auth.conf,
          dispatch,
          {
            isin: instrument.isin,
            quantity: parseInt(quantity || '0'),
            value: parseFloat(pru.replace(/,/g, '.') || '0'),
            stop: parseFloat(stop.replace(/,/g, '.') || '0'),
          },
          addCash,
          state.auth.mode,
        );

        stopLoadingAnimation("C'est fait :)");
      }
    } catch (e) {
      Bugsnag.notify(e);
    }
  };

  const startLoadingAnimation = (info: string) => {
    loadingState.value = 1;
    setLoadingInfo(info);
  };

  const stopLoadingAnimation = (info: string) => {
    setLoadingInfo(info);
    loadingState.value = withDelay(1000, withTiming(0));
  };

  const loadingContainerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(loadingState.value === 0 ? 0 : 1),
  }));

  const controlsContainerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(loadingState.value === 0 ? 1 : 0),
  }));

  const loadingTextStyle = useAnimatedStyle(() => ({
    transform: [
      {translateY: withTiming(20 * (loadingState.value === 1 ? 0 : 1))},
    ],
  }));

  const saveStyle = useAnimatedStyle(() => ({
    transform: [{translateX: withTiming(canSave.value ? 0 : -50)}],
    opacity: withTiming(canSave.value ? 1 : 0),
  }));
  const closeStyle = useAnimatedStyle(() => ({
    transform: [{translateX: withTiming(canClose.value ? 0 : +50)}],
    opacity: withTiming(canClose.value ? 1 : 0),
  }));

  return (
    <View style={[styles.container]}>
      <View style={[styles.inputsContainer]}>
        <View style={styles.pruContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, textStyle, styles.textRight]}
              placeholder="100"
              placeholderTextColor={'grey'}
              keyboardType="number-pad"
              onChangeText={onChangeQuantity}
              value={quantity}
              selectionColor={colors.primary}
              returnKeyType={'done'}
            />
            <Text style={[styles.label, labelStyle, styles.textRight]}>
              Nombre de titres
            </Text>
          </View>
          <Text style={[[styles.pruSeparator, textStyle]]}>@</Text>
          <View style={styles.inputContainer}>
            <View style={styles.inputWithSymbol}>
              <TextInput
                style={[styles.input, textStyle]}
                placeholder={instrument.li?.last?.toString() || '0.00'}
                placeholderTextColor={'grey'}
                keyboardType="numeric"
                onChangeText={onChangePru}
                value={pru}
                selectionColor={colors.primary}
                returnKeyType={'done'}
              />
              <Text style={[styles.symbol, textStyle]}>
                {state.auth.currency}
              </Text>
            </View>
            <Text style={[styles.label, labelStyle]}>
              Prix de revient unitaire
            </Text>
          </View>
        </View>
        <View style={[styles.stopContainer]}>
          <View style={styles.inputContainer}>
            <View style={[styles.inputWithSymbol, {justifyContent: 'center'}]}>
              <TextInput
                style={[styles.input, textStyle, styles.textCenter]}
                placeholder={instrument.li?.last?.toString() || '0.00'}
                placeholderTextColor={'grey'}
                keyboardType="numeric"
                onChangeText={onChangeStop}
                value={stop}
                selectionColor={colors.primary}
                returnKeyType={'done'}
              />
              <Text style={[styles.symbol, textStyle]}>
                {state.auth.currency}
              </Text>
            </View>
            <Text style={[styles.label, labelStyle, styles.textCenter]}>
              Niveau de stop
            </Text>
          </View>
        </View>
      </View>
      <View>
        {position ? (
          <View style={styles.positionContainer}>
            <View>
              <Text
                style={[styles.totalPositionValue, {color: colors.primary}]}>
                {round(position.totalValue || 0, 2).toLocaleString('fr-FR') +
                  state.auth.currency}
              </Text>
              <Text style={[styles.totalPositionLabel, textStyle]}>
                engagés
              </Text>
            </View>
            <View>
              <Text style={[styles.totalPositionPercent, textStyle]}>
                {round(position.percentCapital || 0, 1).toLocaleString(
                  'fr-FR',
                ) + '%'}
              </Text>
              <Text style={[styles.totalPositionLabel, textStyle]}>
                du portefeuille
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noPositionContainer}>
            <Text style={[styles.noPositionLabel, textStyle]}>
              Saisissez les détails de votre position pour suivre son évolution
              dans le dashboard.
            </Text>
          </View>
        )}
        <Animated.View
          style={[
            styles.loadingContainer,
            StyleSheet.absoluteFill,
            loadingContainerStyle,
            {backgroundColor: colors.background},
          ]}>
          <Animated.Text
            style={[
              styles.loadingText,
              loadingTextStyle,
              {color: colors.primary},
            ]}>
            {loadingInfo}
          </Animated.Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.buttonContainer, controlsContainerStyle]}>
        <Animated.View style={saveStyle}>
          <TouchableOpacity onPress={savePosition}>
            <LinearGradient colors={gradient} style={[styles.button]}>
              <Text style={[styles.buttonText]}>Enregistrer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {canClose && position ? (
          <Animated.View style={closeStyle}>
            <TouchableOpacity onPress={closePosition}>
              <LinearGradient colors={gradient} style={[styles.button]}>
                <Text style={[styles.buttonText]}>Clôturer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <></>
        )}
      </Animated.View>

      <Dialog.Container visible={displayConfirmModal}>
        <Dialog.Title>{modalTitle}</Dialog.Title>
        <Dialog.Description>{modalContent}</Dialog.Description>
        <Dialog.Button label="Annuler" onPress={cancel} />
        <Dialog.Button label="Confirmer" bold={true} onPress={updateCash} />
      </Dialog.Container>

      <Dialog.Container visible={displaySellModal}>
        <Dialog.Title>{modalTitle}</Dialog.Title>
        <Dialog.Description>{modalContent}</Dialog.Description>
        <Dialog.Input
          placeholder={instrument.li?.last?.toString() || '0.00'}
          placeholderTextColor={'grey'}
          keyboardType="numeric"
          onChangeText={onChangeSellPrice}
          value={sellPrice}
        />
        <Dialog.Button label="Annuler" onPress={cancel} />
        <Dialog.Button label="Confirmer" bold={true} onPress={sellPosition} />
      </Dialog.Container>
    </View>
  );
}

export default InstrumentPosition;
