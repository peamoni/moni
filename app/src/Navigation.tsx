import React, {useCallback, useEffect, useRef, useState} from 'react';
import {NavigationContainer, Theme} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {AppContext} from './context/context';
import auth from '@react-native-firebase/auth';
import WelcomeScreen from './Welcome';
import {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {getAlerts, getLive, getUserConf} from './dao/firestore';
import LoggedScreen from './Logged';
import ConfigurationScreen from './Configuration';
import {Alert, AppState, AppStateStatus, useColorScheme} from 'react-native';
import {getTheme} from './utils/Themes';
import LoaderScreen from './Loader';
import Bugsnag from '@bugsnag/react-native';
import messaging from '@react-native-firebase/messaging';
import {updateFCMToken} from './dao/firestore';
import {Mode, Types} from './context/reducers';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createStackNavigator();

/* Navigation screen handling the switch from Onboarding to loader to dashboard screens */
function Navigation() {
  const appState = useRef(AppState.currentState);
  const {state, dispatch} = React.useContext(AppContext);
  const scheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(
    getTheme(scheme, state.auth.conf?.view?.theme),
  );
  const [initDone, setInitDone] = useState(false);
  const [reloadConf, setReloadConf] = useState(false);

  // When app state change or user being authenticated, reload content
  const reloadConfAndInstruments = async (
    user: FirebaseAuthTypes.User,
    mode: Mode,
  ) => {
    const conf = await getUserConf(user, dispatch, true, mode);
    if (conf) {
      // User need to create a conf !
      await getLive(dispatch, conf, mode);
      await getAlerts(user, dispatch);
    }
  };

  useEffect(() => {
    const u = auth().currentUser;
    if (u && reloadConf) {
      console.log('Reload instruments, conf and alerts!', state.auth.mode);
      reloadConfAndInstruments(u, state.auth.mode);
    }
    setReloadConf(false);
  }, [reloadConf]);

  // Subscribe to the app state changes at startup, and reload data when app is being push foreground
  useEffect(() => {
    const _handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const u = auth().currentUser;
      if (appState.current === 'background' && nextAppState === 'active' && u) {
        setReloadConf(true);
      }
      appState.current = nextAppState;
    };
    AppState.addEventListener('change', _handleAppStateChange);
    return () => {
      AppState.removeEventListener('change', _handleAppStateChange);
    };
  }, []);

  useEffect(() => {
    async function changeModeContent() {
      // Store mode for further use
      if (!state.auth.user) return;

      await AsyncStorage.setItem('@mode', state.auth.mode);

      setInitDone(false);

      setTimeout(async () => {
        if (state.auth.user) {
          const conf = await getUserConf(
            state.auth.user,
            dispatch,
            true,
            state.auth.mode,
          );
          if (conf) {
            // User need to create a conf !
            await getLive(dispatch, conf, state.auth.mode);
            await getAlerts(state.auth.user, dispatch);
          }
        }
        setInitDone(true);
      }, 2000);
    }
    changeModeContent();
  }, [state.auth.mode]);

  // Subscribe to in app notification and display in a simple alert
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      const u = auth().currentUser;
      if (u) {
        await reloadConfAndInstruments(u, state.auth.mode);
      }
      if (
        remoteMessage.notification?.title &&
        remoteMessage.notification?.body
      ) {
        Alert.alert(
          remoteMessage.notification?.title,
          remoteMessage.notification?.body,
        );
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to user auth state changes to switch screen and load data
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async u => {
      try {
        const user = u as FirebaseAuthTypes.User;
        if (user) {
          let mode = state.auth.mode;
          const previousMode = await AsyncStorage.getItem('@mode');
          if (previousMode === 'pea' || previousMode === 'crypto') {
            // value previously stored
            dispatch({
              type: Types.UpdateMode,
              payload: {mode: previousMode},
            });
            mode = previousMode;
          }
          setInitDone(false);
          await reloadConfAndInstruments(user, mode);
          setInitDone(true);
          Bugsnag.setUser(user.uid);

          // Check tokens
          const token = await messaging().getToken();
          await updateFCMToken(user.uid, token);
        } else {
          setTimeout(() => {
            setInitDone(true);
          }, 2000);
        }
      } catch (e) {
        console.log(e);
      }
    });
    return () => unsubscribe();
  }, []);

  // Switch theme if needed
  useEffect(() => {
    setTheme(
      getTheme(
        state.auth.conf?.view?.darkmode ? 'dark' : 'light',
        state.auth.conf?.view?.theme,
      ),
    );
  }, [state.auth.conf?.view?.darkmode, state.auth.conf?.view?.theme]);

  // Basic authentification, configuration and instruments data help us display the right screen or the loader
  const isAuthenticated: boolean = !!state.auth.user;
  const isConfigured: boolean = !!state.auth.conf;
  const isInstrumentsloaded: boolean = !!state.instruments.livelist.length;

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: ({current: {progress}}) => ({
            cardStyle: {
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          }),
        }}>
        {initDone ? (
          isAuthenticated ? (
            isConfigured ? (
              isInstrumentsloaded ? (
                <Stack.Screen name="Logged" component={LoggedScreen} />
              ) : (
                <Stack.Screen name="Loader" component={LoaderScreen} />
              )
            ) : (
              <Stack.Screen
                name="Configuration"
                component={ConfigurationScreen}
              />
            )
          ) : (
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
          )
        ) : (
          <Stack.Screen name="Loader" component={LoaderScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default Navigation;
