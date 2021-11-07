import {useTheme} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  Alert,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {AppContext} from '../context/context';
import {ColorPalette, colorToGradient} from '../utils/Themes';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {sml} from '../utils/SizeTool';
import MaskedView from '@react-native-community/masked-view';
import {DrawerNavigationHelpers} from '@react-navigation/drawer/lib/typescript/src/types';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useEffect} from 'react';
import {Platform} from 'react-native';
import {Mode, Types} from '../context/reducers';
const {width} = Dimensions.get('window');
import * as Haptic from '../utils/Haptic';

/* App header, opens profil or notification page, and animate the "New notification" icon */

const styles = StyleSheet.create({
  headerContainer: {
    borderBottomRightRadius: sml(40, 45, 50),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 0,
  },
  userPhoto: {
    width: 40,
    height: 40,
    borderColor: 'white',
    borderWidth: 2,
    borderRadius: 20,
  },
  newAlerts: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    textAlign: 'center',
  },
  newAlertsContainer: {
    position: 'absolute',
    backgroundColor: ColorPalette.Danger,
    right: Platform.OS === 'ios' ? -3 : 0,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  rightItemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeModeButton: {
    marginTop: 4,
    paddingRight: 10,
  },
  changeModeContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    opacity: 0.9,
  },
  modeText: {
    color: 'white',
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
  },
});

const RADIUS = sml(40, 45, 50);

function Header({
  children,
  navigation,
}: {
  children: any;
  navigation: DrawerNavigationHelpers;
}) {
  const [headerHeight, setHeaderHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const gradient = colorToGradient(colors.primary);
  const {state, dispatch} = React.useContext(AppContext);

  const newAlerts = state.auth.alerts.filter(
    a =>
      state.auth.conf?.tAlert && a.data.triggeredAt > state.auth.conf?.tAlert,
  ).length;

  const openDrawer = useCallback(() => {
    Haptic.medium();
    navigation.openDrawer();
  }, []);

  const switchMode = useCallback(async () => {
    Haptic.medium();
    let newMode: Mode = 'pea';
    if (state.auth.mode === 'pea') {
      newMode = 'crypto';
    }
    dispatch({
      type: Types.UpdateMode,
      payload: {mode: newMode},
    });
  }, [state.auth.mode]);

  const rotation = useSharedValue(0);
  useEffect(() => {
    if (newAlerts >= 1) {
      rotation.value = withRepeat(
        withSequence(
          withTiming(15, {duration: 200}),
          withTiming(-15, {duration: 200}),
          withSpring(0),
        ),
        4,
        true,
      );
    }
  }, [newAlerts]);
  const notifStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.value}deg`}],
  }));

  const openNotifications = useCallback(() => {
    Haptic.medium();
    if (state.auth.mode === 'pea') {
      navigation.navigate('Notifications');
    } else {
      Alert.alert(
        'Patience...',
        'Les notifications seront bientôt disponibles pour le mode crypto !',
      );
    }
  }, []);

  return (
    <View
      style={[styles.headerContainer, {paddingTop: insets.top}]}
      onLayout={event => {
        setHeaderHeight(event.nativeEvent.layout.height);
      }}>
      <View style={StyleSheet.absoluteFill}>
        <MaskedView
          style={{width, height: headerHeight + RADIUS}}
          maskElement={
            <View>
              <View
                style={{
                  width,
                  height: headerHeight,
                  backgroundColor: 'black',
                  borderBottomRightRadius: RADIUS,
                }}
              />
              <View
                style={{
                  width: RADIUS,
                  height: RADIUS,
                  backgroundColor: 'black',
                }}
              />
            </View>
          }>
          <View style={{width, height: headerHeight + RADIUS}}>
            <LinearGradient
              colors={gradient}
              style={[StyleSheet.absoluteFill]}
            />
          </View>
        </MaskedView>
        <View
          style={{
            borderTopLeftRadius: RADIUS,
            width: RADIUS * 2,
            height: RADIUS * 2,
            marginTop: -RADIUS,
            backgroundColor: colors.background,
          }}
        />
      </View>
      <StatusBar
        barStyle={'light-content'}
        animated={true}
        backgroundColor="transparent"
        translucent
      />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={openNotifications}>
          <>
            <Animated.View style={[notifStyle]}>
              <Ionicons
                name={'notifications-outline'}
                size={30}
                color={'white'}
              />
            </Animated.View>
            {newAlerts > 0 ? (
              <View style={[styles.newAlertsContainer]}>
                <Text style={styles.newAlerts}>{newAlerts}</Text>
              </View>
            ) : null}
          </>
        </TouchableOpacity>
        <View style={[styles.rightItemsContainer]}>
          <TouchableOpacity
            onPress={switchMode}
            style={[styles.changeModeButton]}>
            <View style={[styles.changeModeContainer]}>
              <Ionicons
                name={state.auth.mode === 'pea' ? 'logo-euro' : 'logo-bitcoin'}
                size={20}
                color={'white'}
              />
              <Text style={[styles.modeText]}>mode {state.auth.mode}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={openDrawer}>
            {state.auth.user && state.auth.user.photoURL ? (
              <Image
                source={{
                  uri: state.auth.user.photoURL,
                }}
                style={styles.userPhoto}
              />
            ) : (
              <Ionicons
                name={'person-circle-outline'}
                size={36}
                color={'white'}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
      {children}
    </View>
  );
}

export default Header;
