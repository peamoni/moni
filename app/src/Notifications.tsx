import React, {useMemo, useState} from 'react';

import {
  Alert,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {FlatList, ScrollView} from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import {TextInput, TouchableOpacity} from 'react-native-gesture-handler';
import {AppContext} from './context/context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '@react-navigation/native';
import {ColorPalette, colorToGradient} from './utils/Themes';
import {sml} from './utils/SizeTool';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {useEffect} from 'react';
import {StackScreenProps} from '@react-navigation/stack';
import {
  Instrument,
  UserConf,
  ALERT_DIRECTION,
  ALERT_STATUSES,
  AlertWrapper,
} from './model/model';
import {createNewAlert, removeAlert, updateUserConf} from './dao/firestore';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getPositionInfo, PositionInfo} from './utils/PortfolioTools';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {round} from 'react-native-redash';
const {width} = Dimensions.get('window');
import * as Haptic from './utils/Haptic';

/* Display notification or configuration to activate notificaitons */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  noNotifContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  noNotifLabel: {
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    fontSize: 24,
    marginBottom: 40,
    paddingHorizontal: sml(10, 20, 30),
  },
  button: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancel: {
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginVertical: 20,
  },
  buttonText: {
    color: 'white',
    fontFamily: 'Poppins-Regular',
  },
  title: {
    fontFamily: 'Poppins-Regular',
    paddingTop: sml(5, 10, 15),
    fontSize: sml(20, 24, 28),
  },
  alertsContainer: {
    flex: 1,
  },
  scrollItem: {
    width,
    height: '100%',
    paddingHorizontal: 20,
  },
  searchInput: {
    fontSize: sml(18, 20, 22),
    fontFamily: 'Poppins-Regular',
    marginTop: 20,
    paddingBottom: 4,
    borderBottomWidth: 1,
    textAlign: 'center',
    minWidth: 250,
    opacity: 0.6,
  },
  priceInput: {
    fontSize: sml(34, 40, 46),
    fontFamily: 'Poppins-Regular',
    marginTop: 40,
    paddingBottom: 4,
    borderBottomWidth: 1,
    textAlign: 'center',
    minWidth: 180,
    opacity: 0.6,
  },
  searchResults: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultItemText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 28,
    maxWidth: width - 100,
  },
  select: {
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  alertContainer: {
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  alertTickerName: {
    fontFamily: 'Poppins-Bold',
    fontSize: sml(16, 17, 18),
    marginLeft: 8,
  },
  alertName: {
    fontFamily: 'Poppins-Regular',
    fontSize: sml(10, 11, 12),
  },
  alertTriggered: {
    fontFamily: 'Poppins-Regular',
    color: ColorPalette.Danger,
    fontSize: sml(8, 9, 10),
    textAlign: 'right',
  },
  alertValue: {
    fontSize: sml(16, 17, 18),
    marginRight: 6,
  },
  alertActiveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  alertDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: sml(8, 9, 10),
    textAlign: 'right',
  },
});

// Custom types for the screen parameters
type NotificationsParamList = {
  Notifications: {};
};

// Custom type to display alerts
type AlertWrapperWrapper = {
  alert: AlertWrapper;
  ins: Instrument;
  percent: number;
};

const MAX_ACTIVE_ALERTS = 20;

function NotificationsScreen({
  navigation,
}: StackScreenProps<NotificationsParamList, 'Notifications'>) {
  // Basic stuffs ...
  const {state, dispatch} = React.useContext(AppContext);
  const {colors, dark} = useTheme();
  const insets = useSafeAreaInsets();
  const gradient = colorToGradient(colors.primary);
  // Get the current status of messaging permissions
  const [
    permissionStatus,
    setPermission,
  ] = React.useState<FirebaseMessagingTypes.AuthorizationStatus>(
    messaging.AuthorizationStatus.NOT_DETERMINED,
  );
  // Instrument selected to create a new alert
  const [instrumentSelected, setInstrumentSelected] = React.useState<
    PositionInfo | undefined
  >(undefined);
  // Scroll View ref to switch from alert list, to instrument search, to alert price definition
  const scrollViewRef = React.createRef<ScrollView>();
  // Instrument search
  const [search, onChangeSearch] = useState('');
  // Alert price
  const [price, onChangePrice] = useState('');
  // Can we create the alert with the selected price ?
  const [canCreate, setCanCreate] = useState(false);

  const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
  // Shared element to animate the list
  const y = new Animated.Value(0);

  // Filter the instrument list with input data
  const filteredInstruments: PositionInfo[] = state.instruments.livelist
    .filter((ins: Instrument) => {
      if (search.length <= 1) {
        return false;
      }
      return (
        ins.na.toLowerCase().indexOf(search.toLowerCase()) > -1 ||
        ins.isin.toLowerCase().indexOf(search.toLowerCase()) > -1 ||
        ins.sy.toLowerCase().indexOf(search.toLowerCase()) > -1
      );
    })
    .map(p => getPositionInfo(p, null))
    .sort((a, b) => a.ins.na.localeCompare(b.ins.na))
    .slice(0, 10);

  // Get alerts
  const alerts: AlertWrapperWrapper[] = state.auth.alerts
    .map(alert => {
      const ins = state.instruments.livelist.find(
        (i: Instrument) => i.isin === alert.data.isin,
      );
      return {
        alert,
        ins,
        percent:
          alert.data.status === ALERT_STATUSES.TRIGGERED
            ? 999999
            : (-(ins.li.last - alert.data.value) / ins.li.last) * 100,
      };
    })
    .sort((a, b) => {
      // les deux alertes sont déclenchées => comparaison timestamp déclenchement
      return a.alert.data.status === ALERT_STATUSES.TRIGGERED &&
        b.alert.data.status === ALERT_STATUSES.TRIGGERED
        ? b.alert.data.triggeredAt - a.alert.data.triggeredAt
        : Math.abs(a.percent) - Math.abs(b.percent);
    });

  // Update last notifications screen view
  useEffect(() => {
    if (state.auth.user) {
      const newConf: UserConf = {
        tAlert: +new Date() / 1000,
      };
      updateUserConf(state.auth.user, newConf, dispatch);
    }
  }, []);

  // Check permission
  useEffect(() => {
    async function getPermission() {
      const authStatus = await messaging().hasPermission();
      setPermission(authStatus);
    }
    getPermission();
  }, []);

  // Can Create the alert ?
  useEffect(() => {
    const priceNumber = parseFloat(price.replace(/,/g, '.') || '0');
    let ccreate: boolean = false;
    if (
      price &&
      instrumentSelected &&
      instrumentSelected.ins.li &&
      instrumentSelected.ins.li.h &&
      instrumentSelected.ins.li.l
    ) {
      ccreate = !(
        priceNumber >= instrumentSelected.ins.li.l &&
        priceNumber <= instrumentSelected.ins.li.h
      );
    }
    setCanCreate(ccreate);
  }, [instrumentSelected, price]);

  // User ask to activate notification
  async function requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    setPermission(authStatus);
  }

  async function removeAlertPressed(alert: AlertWrapper) {
    if (state?.auth?.user?.uid) {
      Haptic.medium();
      await removeAlert(alert, state.auth.user, dispatch);
    }
  }

  function instrumentChoose(instrument: PositionInfo) {
    setInstrumentSelected(instrument);
    scrollViewRef.current?.scrollTo({x: 2 * width, animated: true});
  }

  // Start add alert process, but check the alert limit first !
  async function addAlert() {
    const activeAlertCount = alerts.filter(
      a => a.alert.data.status !== ALERT_STATUSES.TRIGGERED,
    ).length;
    if (activeAlertCount >= MAX_ACTIVE_ALERTS) {
      Haptic.error();
      Alert.alert(
        'Limite atteinte',
        `Vous avez atteint la limite de ${MAX_ACTIVE_ALERTS} alertes actives.\n\nSupprimer des alertes pour en créer de nouvelles.`,
        [{text: 'OK', onPress: () => {}}],
      );
    } else {
      Haptic.light();
      scrollViewRef.current?.scrollTo({x: 1 * width, animated: true});
    }
  }

  // All conditions are OK to create the alert !
  async function createAlert() {
    scrollViewRef.current?.scrollTo({x: 0, animated: true});
    const priceNumber = parseFloat(price.replace(/,/g, '.') || '0');
    if (
      state?.auth?.user?.uid &&
      instrumentSelected?.ins.isin &&
      instrumentSelected.ins?.li?.h
    ) {
      await createNewAlert(
        {
          author_id: state.auth.user.uid,
          createdAt: +new Date() / 1000,
          direction:
            priceNumber > instrumentSelected.ins.li.h
              ? ALERT_DIRECTION.UP
              : ALERT_DIRECTION.DOWN,
          isin: instrumentSelected.ins.isin,
          status: ALERT_STATUSES.CREATED,
          type: 'ALERT',
          value: priceNumber,
          triggeredAt: 0,
        },
        state.auth.user,
        dispatch,
      );
    }
    onChangeSearch('');
    onChangePrice('');
  }

  // Alert object render function to memoize
  const renderItem = ({
    item,
    index,
  }: {
    item: AlertWrapperWrapper;
    index: number;
  }) => {
    const ITEM_SIZE = 80;
    const scale = y.interpolate({
      inputRange: [-1, 0, ITEM_SIZE * index, ITEM_SIZE * (index + 2)],
      outputRange: [1, 1, 1, 0.6],
    });
    const opacity = y.interpolate({
      inputRange: [-1, 0, ITEM_SIZE * index, ITEM_SIZE * (index + 3)],
      outputRange: [1, 1, 1, 0],
    });
    const translateY = y.interpolate({
      inputRange: [-1, 0, ITEM_SIZE * (index + 0.5), ITEM_SIZE * (index + 3)],
      outputRange: [0, 0, 0, ITEM_SIZE * 2],
    });
    const a = item;
    return (
      <Animated.View
        style={{height: ITEM_SIZE, opacity, transform: [{translateY, scale}]}}>
        <View
          key={a.alert.uid}
          style={[styles.alertContainer, {backgroundColor: colors.card}]}>
          <View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TouchableOpacity onPress={() => removeAlertPressed(a.alert)}>
                <Ionicons
                  name={'trash-outline'}
                  size={sml(16, 17, 18)}
                  color={colors.text}
                />
              </TouchableOpacity>
              <Text style={[styles.alertTickerName, {color: colors.text}]}>
                {a.ins.sy}
              </Text>
            </View>
            <Text style={[styles.alertName, {color: colors.text}]}>
              {a.ins.na}
            </Text>
          </View>
          <View>
            <View style={styles.alertActiveStatus}>
              <Text style={[styles.alertValue, {color: colors.text}]}>
                {a.alert.data.value.toLocaleString('fr-FR')}
                {state.auth.currency}
              </Text>
              <Ionicons
                name={
                  a.alert.data.status === ALERT_STATUSES.TRIGGERED
                    ? 'volume-medium-outline'
                    : a.alert.data.direction === ALERT_DIRECTION.UP
                    ? 'trending-up-outline'
                    : 'trending-down-outline'
                }
                size={28}
                style={{
                  opacity:
                    a.alert.data.status === ALERT_STATUSES.TRIGGERED ? 0.4 : 1,
                }}
                color={
                  a.alert.data.status === ALERT_STATUSES.TRIGGERED
                    ? colors.text
                    : a.alert.data.direction === ALERT_DIRECTION.UP
                    ? ColorPalette.Success
                    : ColorPalette.Danger
                }
              />
            </View>
            {a.alert.data.status === ALERT_STATUSES.TRIGGERED ? (
              <Text style={[styles.alertTriggered]}>
                Déclenchée le{' '}
                {`${new Date(
                  a.alert.data.triggeredAt * 1000,
                ).toLocaleDateString('fr-FR')}`}{' '}
                !
              </Text>
            ) : (
              <Text style={[styles.alertDetails, {color: colors.text}]}>
                à {round(a.percent, 1).toLocaleString('fr-FR')}% du cours actuel
                : {round(a.ins.li?.last || 0, a.ins.pd).toLocaleString('fr-FR')}
                {state.auth.currency}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const memoizedRender = useMemo(() => renderItem, [y]);

  // Different display depending on the current Authorization status
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}>
      <StatusBar
        barStyle={dark ? 'light-content' : 'dark-content'}
        animated={true}
        backgroundColor="transparent"
        translucent
      />
      {permissionStatus === messaging.AuthorizationStatus.NOT_DETERMINED ? (
        <View style={styles.noNotifContainer}>
          <Text style={[styles.noNotifLabel, {color: colors.text}]}>
            Les notifications ne sont pas encore actives pour cet appareil !
          </Text>
          <TouchableOpacity onPress={() => requestUserPermission()}>
            <LinearGradient colors={gradient} style={[styles.button]}>
              <Text style={[styles.buttonText]}>Activer les notifications</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.cancel, {color: colors.primary}]}>
              revenir
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {permissionStatus === messaging.AuthorizationStatus.DENIED ? (
        <View style={styles.noNotifContainer}>
          <Text style={[styles.noNotifLabel, {color: colors.text}]}>
            Visiblement, vous avez refusé d'activer les notifications 😢
          </Text>
          <Text
            style={[
              styles.noNotifLabel,
              {color: colors.text, fontSize: 14, opacity: 0.65},
            ]}>
            Pour recevoir des alertes sur vos valeurs préférées, vous pouvez
            toujours les réactiver dans les réglages de l'iPhone.
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.cancel, {color: colors.primary}]}>
              Revenir
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {permissionStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      permissionStatus === messaging.AuthorizationStatus.PROVISIONAL ? (
        <ScrollView
          ref={scrollViewRef}
          pagingEnabled={true}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={{
            width: '100%',
            height: '100%',
          }}>
          <Animated.View style={styles.scrollItem}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}>
              <Text style={[styles.title, {color: colors.text}]}>
                Mes alertes
              </Text>
              <TouchableOpacity onPress={() => addAlert()}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: colors.primary,
                        fontSize: 12,
                        marginRight: 8,
                        textAlign: 'right',
                        lineHeight: 12,
                      },
                    ]}>
                    {'Ajouter\nune alerte'}
                  </Text>
                  <Ionicons
                    name={'add-circle-outline'}
                    size={28}
                    color={colors.primary}
                  />
                </View>
              </TouchableOpacity>
            </View>
            <View style={[styles.alertsContainer]}>
              {!alerts.length ? (
                <View style={styles.noNotifContainer}>
                  <Text style={[styles.noNotifLabel, {color: colors.text}]}>
                    Aucune alerte configurée 🙊
                  </Text>
                  <Text
                    style={[
                      styles.noNotifLabel,
                      {color: colors.text, fontSize: 14, opacity: 0.65},
                    ]}>
                    Ajouter simplement une alerte en définissant un prix de
                    déclenchement sur une de vos valeurs préférées.
                  </Text>
                  <TouchableOpacity onPress={() => addAlert()}>
                    <LinearGradient colors={gradient} style={[styles.button]}>
                      <Text style={[styles.buttonText]}>
                        Ajouter une alerte
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <AnimatedFlatList
                  onScroll={Animated.event(
                    [{nativeEvent: {contentOffset: {y}}}],
                    {useNativeDriver: true},
                  )}
                  overScrollMode="never"
                  scrollEventThrottle={1}
                  data={alerts}
                  contentContainerStyle={{
                    paddingTop: 40,
                  }}
                  style={{
                    marginTop: -15,
                  }}
                  extraData={[alerts]}
                  initialNumToRender={15}
                  showsVerticalScrollIndicator={false}
                  keyExtractor={(a: AlertWrapperWrapper, index) =>
                    a.alert.uid + index
                  }
                  renderItem={memoizedRender}
                />
              )}
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.cancel, {color: colors.primary}]}>
                Fermer
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.scrollItem]}>
            <Text style={[styles.title, {color: colors.text}]}>
              Rechercher la valeur
            </Text>
            <TextInput
              placeholder="Nom, Ticker, ISIN, ..."
              placeholderTextColor={colors.text}
              keyboardType="default"
              onChangeText={onChangeSearch}
              value={search}
              style={[
                styles.searchInput,
                {
                  color: colors.text,
                  borderColor: colors.text,
                },
              ]}
              clearButtonMode={'while-editing'}
              selectionColor={colors.text}
              returnKeyType={'done'}
            />
            <View style={[styles.searchResults]}>
              {filteredInstruments.map(ins => {
                return (
                  <View style={[styles.resultItem]} key={ins.ins.isin}>
                    <Text
                      style={[styles.resultItemText, {color: colors.text}]}
                      ellipsizeMode="tail"
                      numberOfLines={1}>
                      {ins.ins.na}
                    </Text>
                    <TouchableOpacity onPress={() => instrumentChoose(ins)}>
                      <Text style={[styles.cancel, {color: colors.primary}]}>
                        Choisir
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={() => {
                onChangeSearch('');
                scrollViewRef.current?.scrollTo({x: 0, animated: true});
              }}>
              <Text style={[styles.cancel, {color: colors.primary}]}>
                Revenir
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.scrollItem]}>
            {instrumentSelected ? (
              <View style={{flex: 1}}>
                <Text style={[styles.title, {color: colors.text}]}>
                  Prix de déclenchement
                </Text>
                <TextInput
                  placeholder={'12,34' + state.auth.currency}
                  placeholderTextColor={colors.text}
                  keyboardType="numeric"
                  onChangeText={onChangePrice}
                  value={price}
                  style={[
                    styles.priceInput,
                    {
                      color: colors.text,
                      borderColor: colors.text,
                    },
                  ]}
                  clearButtonMode={'while-editing'}
                  selectionColor={colors.text}
                  returnKeyType={'done'}
                />
                <View style={{flex: 1, paddingTop: 50}}>
                  <TouchableOpacity
                    onPress={() => {
                      createAlert();
                    }}
                    disabled={!canCreate}>
                    <LinearGradient
                      colors={gradient}
                      style={[styles.button, {opacity: canCreate ? 1 : 0.4}]}>
                      <Text style={[styles.buttonText]}>
                        Créer une nouvelle alerte
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  {!canCreate && price !== '' ? (
                    <Text
                      style={[
                        styles.noNotifLabel,
                        {
                          color: colors.text,
                          fontSize: 14,
                          opacity: 0.65,
                          marginTop: 50,
                        },
                      ]}>
                      Le prix de déclenchement de l'alerte doit être supérieur
                      au plus haut ({instrumentSelected.ins?.li?.h}
                      {state.auth.currency}) du jour, ou inférieur au plus bas
                      du jour ({instrumentSelected.ins?.li?.l}
                      {state.auth.currency}).
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    onChangePrice('');
                    scrollViewRef.current?.scrollTo({
                      x: 1 * width,
                      animated: true,
                    });
                  }}>
                  <Text style={[styles.cancel, {color: colors.primary}]}>
                    Revenir
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </Animated.View>
        </ScrollView>
      ) : null}
    </View>
  );
}

export default NotificationsScreen;
