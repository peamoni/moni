import * as React from 'react';
import {
  Animated,
  Dimensions,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Linking,
} from 'react-native';
import Svg, {Polygon} from 'react-native-svg';
import MaskedView from '@react-native-community/masked-view';
import {useIsDrawerOpen} from '@react-navigation/drawer';
import {
  DrawerContentComponentProps,
  DrawerContentOptions,
} from '@react-navigation/drawer/lib/typescript/src/types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colorToTheme, getTheme, themes, themeToGradient} from './utils/Themes';
import LinearGradient from 'react-native-linear-gradient';
import {useSharedValue} from 'react-native-reanimated';
import {AppContext} from './context/context';
import {updateUserConf} from './dao/firestore';
import {UserConf} from './model/model';
import Selector from './components/Selector';
import Dialog from 'react-native-dialog';
import auth from '@react-native-firebase/auth';
import {Types} from './context/reducers';
import Bugsnag from '@bugsnag/react-native';
import {sml} from './utils/SizeTool';

/* Custom drawer to change theme and darkmode, need optimizations on older devices (reanimated2?) */

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
const AnimatedMaskedView = Animated.createAnimatedComponent(MaskedView);

const {width, height} = Dimensions.get('window');
const fromCoords = {x: 0, y: height};
const toCoords = {x: width, y: 0};

const COLOR_BUTTON_SIZE = sml(26, 32, 38);
const DARKMODE_SELECTOR_WIDTH = width / 4;
const DARKMODE_STATES = ['INACTIF', 'ACTIF'];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 30,
  },
  maskedContainer: {
    flex: 1,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'Poppins-Light',
    fontSize: sml(24, 28, 32),
  },
  colorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  colorButton: {
    width: COLOR_BUTTON_SIZE,
    height: COLOR_BUTTON_SIZE,
    borderRadius: COLOR_BUTTON_SIZE / 2,
    borderWidth: 2,
  },

  darkModeSelectorContainer: {
    marginTop: 8,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  darkModeContainer: {
    padding: 12,
    width: DARKMODE_SELECTOR_WIDTH,
  },
  darkModeLabel: {
    fontSize: sml(14, 15, 16),
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
  },
  link: {
    fontSize: sml(14, 15, 16),
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
  },
  textLink: {
    opacity: 0.2,
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  conditionLink: {
    opacity: 0.4,
    marginTop: 30,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});

export default function Drawer({
  navigation,
}: DrawerContentComponentProps<DrawerContentOptions>) {
  const isDrawerOpened = useIsDrawerOpen();
  const {state, dispatch} = React.useContext(AppContext);

  const gradients = themes.map(t => themeToGradient(t));
  const darkModeState = useSharedValue<number>(
    state.auth.conf?.view?.darkmode ? 1 : 0,
  );
  const [darkmode, setDarkmode] = React.useState(
    state.auth.conf?.view?.darkmode,
  );
  const [color, setColor] = React.useState(state.auth.conf?.view?.theme);
  const theme = getTheme(darkmode ? 'dark' : 'light', color);
  const insets = useSafeAreaInsets();
  const colors = theme.colors;
  const currentTheme = colorToTheme(colors.primary);
  const [logoutModal, setLogoutModal] = React.useState(false);

  const polygonRef = React.useRef();
  const animatedWidth = React.useRef(new Animated.Value(0)).current;
  const animation = React.useRef(new Animated.ValueXY(fromCoords)).current;
  const animate = (toValue: number) => {
    const animations = [
      Animated.spring(animation, {
        toValue: toValue === 1 ? toCoords : fromCoords,
        useNativeDriver: true,
        bounciness: 2,
        speed: 5,
      }),
      Animated.timing(animatedWidth, {
        toValue: toValue === 1 ? width : 0,
        duration: 0,
        useNativeDriver: false,
      }),
    ];

    return Animated.sequence(toValue === 1 ? animations.reverse() : animations);
  };

  React.useEffect(() => {
    const listener = animation.addListener(v => {
      if (polygonRef && polygonRef.current) {
        polygonRef.current.setNativeProps({
          points: `0,0 ${v.x}, ${v.y} ${width}, ${height} 0, ${height}`,
        });
      }
    });

    return () => {
      animation.removeListener(listener);
    };
  }, []);

  React.useEffect(() => {
    animate(isDrawerOpened ? 1 : 0).start();
  }, [isDrawerOpened]);

  const opacity = animation.x.interpolate({
    inputRange: [0, width],
    outputRange: [0, 1],
  });

  const translateX = animation.x.interpolate({
    inputRange: [0, width],
    outputRange: [-50, 0],
  });

  const onCloseDrawer = React.useCallback(route => {
    navigation.closeDrawer();
  }, []);

  const selectedThemeStyle: ViewStyle = {
    transform: [{scale: 1.5}],
  };

  const logout = async () => {
    if (auth().currentUser) {
      auth().signOut();
    }
    dispatch({
      type: Types.SignOut,
      payload: {},
    });
  };

  const changeTheme = async (theme: string) => {
    try {
      setColor(theme);
      if (state.auth.user) {
        const newConf: UserConf = {
          view: {
            ...state.auth.conf?.view,
            theme,
          },
        };
        await updateUserConf(
          state.auth.user,
          newConf,
          dispatch,
          false,
          state.auth.mode,
        );
      }
    } catch (e) {
      Bugsnag.notify(e);
    }
  };

  const updateDarkMode = async (darkmode: boolean) => {
    try {
      setDarkmode(darkmode);
      if (state.auth.user) {
        const newConf: UserConf = {
          view: {
            ...state.auth.conf?.view,
            darkmode,
          },
        };
        await updateUserConf(
          state.auth.user,
          newConf,
          dispatch,
          false,
          state.auth.mode,
        );
      }
    } catch (e) {
      Bugsnag.notify(e);
    }
  };

  return (
    <AnimatedMaskedView
      style={[styles.maskedContainer, {width: animatedWidth}]}
      maskElement={
        <Svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{backgroundColor: 'transparent'}}>
          <AnimatedPolygon
            ref={polygonRef}
            points={`0,0 ${fromCoords.x}, ${fromCoords.y} ${width}, ${height} 0, ${height}`}
            fill="blue"
          />
        </Svg>
      }>
      <View
        style={[
          styles.menuContainer,
          {
            backgroundColor: theme.colors.card,
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom,
          },
        ]}>
        <Ionicons
          onPress={onCloseDrawer}
          name={'close-outline'}
          size={42}
          color={colors.text}
          style={{alignSelf: 'flex-end'}}
        />
        <Animated.View
          style={[styles.container, {opacity, transform: [{translateX}]}]}>
          <View>
            <Text style={[styles.title, {color: colors.text}]}>Theme</Text>
            <View style={styles.colorContainer}>
              {themes.map((t, i) => {
                return (
                  <TouchableOpacity
                    key={`color-choose-${i}`}
                    onPress={() => changeTheme(t)}>
                    <LinearGradient
                      colors={gradients[i]}
                      style={[
                        styles.colorButton,
                        {borderColor: colors.text},
                        currentTheme === t ? selectedThemeStyle : null,
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.title, {color: colors.text}]}>
              Mode Sombre
            </Text>
            <View style={styles.darkModeSelectorContainer}>
              <Selector
                elements={DARKMODE_STATES}
                elementWidth={DARKMODE_SELECTOR_WIDTH}
                onPress={index => {
                  darkModeState.value = index;
                  updateDarkMode(index !== 0);
                }}
                backgroundSelectionStyle={{
                  backgroundColor: colors.primary,
                  opacity: 1,
                }}
                labelContainerStyle={styles.darkModeContainer}
                labelStyle={[styles.darkModeLabel, {color: colors.text}]}
                initialValue={darkModeState.value}
              />
            </View>
          </View>
          <View>
            <TouchableOpacity onPress={() => setLogoutModal(true)}>
              <Text style={[styles.link, {color: colors.primary}]}>
                Se déconnecter
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.peamoni.fr/#/terms')}>
              <Text style={[styles.conditionLink, {color: colors.text}]}>
                conditions générales d'utilisation
              </Text>
            </TouchableOpacity>
            <Text style={[styles.textLink, {color: colors.text}]}>
              ID COMPTE : {state.auth.user?.uid.slice(0, 5)}
            </Text>
          </View>
        </Animated.View>
      </View>

      <Dialog.Container visible={logoutModal}>
        <Dialog.Title>Deconnexion</Dialog.Title>
        <Dialog.Description>
          Souhaitez-vous vous déconnecter ?
        </Dialog.Description>
        <Dialog.Button label="Annuler" onPress={() => setLogoutModal(false)} />
        <Dialog.Button label="Confirmer" bold={true} onPress={logout} />
      </Dialog.Container>
    </AnimatedMaskedView>
  );
}
