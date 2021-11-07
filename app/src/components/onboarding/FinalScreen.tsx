import React, {useState} from 'react';
import {
  Linking,
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Bugsnag from '@bugsnag/react-native';
import auth from '@react-native-firebase/auth';
import {sml} from '../../utils/SizeTool';
import Dialog from 'react-native-dialog';
import {
  GOOGLE_AUTH_KEY,
  TWITTER_AUTH_KEY,
  TWITTER_AUTH_SECRET,
} from '../../conf/Configuration';
import {appleAuth} from '@invertase/react-native-apple-authentication';

const {RNTwitterSignIn} = NativeModules;
RNTwitterSignIn.init(TWITTER_AUTH_KEY, TWITTER_AUTH_SECRET)
  .then(() => console.log('Twitter SDK initialized'))
  .catch((error: any) => {
    console.log(error);
  });

import {GoogleSignin} from '@react-native-community/google-signin';
import {
  TouchableHighlight,
  TouchableOpacity,
} from 'react-native-gesture-handler';
import {useTheme} from '@react-navigation/native';
import Selector from '../Selector';
import {Types} from '../../context/reducers';
import {AppContext} from '../../context/context';
GoogleSignin.configure({
  webClientId: GOOGLE_AUTH_KEY,
});

const TWITTER_COLOR = '#00ACEE';
const GMAIL_COLOR = '#dd4b39';
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingTop: sml(0, 30, 60),
  },
  titleContainer: {
    paddingHorizontal: 30,
  },
  title: {
    fontFamily: 'Poppins-Regular',
    fontSize: 28,
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Poppins-Light',
    fontSize: 18,
    opacity: 0.8,
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: sml(20, 30, 40),
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
    width: 240,
    height: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 6,
    marginLeft: 12,
  },
  buttonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  conditionContainer: {
    marginBottom: sml(20, 30, 40),
    alignItems: 'center',
  },
  condition: {
    fontFamily: 'Poppins-Light',
  },
  conditionLink: {
    fontFamily: 'Poppins-Medium',
    textDecorationLine: 'underline',
  },
});

function WelcomeScreen() {
  const {colors} = useTheme();
  const {dispatch} = React.useContext(AppContext);

  const [displayAnonymousModal, setDisplayAnonymousModal] = useState(false);

  const signWithTwitter = async () => {
    try {
      auth().currentUser && (await auth().signOut());
      // Perform the login request
      const {authToken, authTokenSecret} = await RNTwitterSignIn.logIn();
      // Create a Twitter credential with the tokens
      const twitterCredential = auth.TwitterAuthProvider.credential(
        authToken,
        authTokenSecret,
      );
      // Sign-in the user with the credential
      await auth().signInWithCredential(twitterCredential);
    } catch (e) {
      Bugsnag.notify(e);
    }
  };

  const signWithGmail = async () => {
    try {
      auth().currentUser && (await auth().signOut());
      // Get the users ID token
      const {idToken} = await GoogleSignin.signIn();
      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      // Sign-in the user with the credential
      await auth().signInWithCredential(googleCredential);
    } catch (e) {
      Bugsnag.notify(e);
    }
  };

  const signWithApple = async () => {
    try {
      auth().currentUser && (await auth().signOut());
      // Start the sign-in request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      // Ensure Apple returned a user identityToken
      if (!appleAuthRequestResponse.identityToken) {
        throw 'Apple Sign-In failed - no identify token returned';
      }
      // Create a Firebase credential from the response
      const {identityToken, nonce} = appleAuthRequestResponse;
      const appleCredential = auth.AppleAuthProvider.credential(
        identityToken,
        nonce,
      );
      // Sign the user in with the credential
      await auth().signInWithCredential(appleCredential);
    } catch (e) {
      Bugsnag.notify(e);
    }
  };

  const signAnonymously = async () => {
    try {
      auth().currentUser && (await auth().signOut());
      auth()
        .signInAnonymously()
        .then(() => {
          console.log('User signed in anonymously');
        })
        .catch(error => {
          if (error.code === 'auth/operation-not-allowed') {
            console.log('Enable anonymous in your firebase console.');
          }
          console.error(error);
        });
    } catch (e) {
      Bugsnag.notify(e);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}>
      {/* <StatusBar
                barStyle={dark ? 'light-content' : 'dark-content'}
                animated={true}
                backgroundColor="transparent"
                translucent></StatusBar> */}
      <View style={[styles.titleContainer]}>
        <Text style={[styles.title, {color: colors.text}]}>
          Il ne reste plus qu'à se connecter !
        </Text>
        <Text style={[styles.subtitle, {color: colors.text}]}>
          Vous pourrez renseigner et suivre les positions de votre portefeille,
          et découvrir les outils intégrés à l'application.
        </Text>
      </View>
      <View style={[styles.titleContainer, {alignItems: 'center'}]}>
        <Text style={[styles.subtitle, {color: colors.text, marginBottom: 8}]}>
          Commencer avec un portefeuille
        </Text>
        <Selector
          elements={['PEA', 'CRYPTO']}
          elementWidth={100}
          onPress={index => {
            dispatch({
              type: Types.UpdateMode,
              payload: {mode: ['pea', 'crypto'][index]},
            });
          }}
          backgroundSelectionStyle={{
            backgroundColor: colors.text,
            opacity: 0.11,
          }}
          labelContainerStyle={{
            padding: 4,
            width: 100,
          }}
          initialValue={0}
          labelStyle={{
            color: colors.primary,
            fontSize: sml(10, 11, 12),
          }}
        />
      </View>
      <View style={styles.buttonsContainer}>
        {Platform.OS === 'ios' ? (
          <TouchableHighlight
            style={[styles.button, {backgroundColor: 'black'}]}
            onPress={() => signWithApple()}>
            <>
              <Ionicons
                style={styles.buttonIcon}
                name={'logo-apple'}
                size={20}
                color={'white'}
              />
              <Text style={[styles.buttonText]}>Connexion avec Apple</Text>
            </>
          </TouchableHighlight>
        ) : null}
        <TouchableHighlight
          style={[styles.button, {backgroundColor: TWITTER_COLOR}]}
          onPress={() => signWithTwitter()}>
          <>
            <Ionicons
              style={styles.buttonIcon}
              name={'logo-twitter'}
              size={20}
              color={'white'}
            />
            <Text style={[styles.buttonText]}>Connexion avec Twitter</Text>
          </>
        </TouchableHighlight>

        <TouchableHighlight
          style={[styles.button, {backgroundColor: GMAIL_COLOR}]}
          onPress={() => signWithGmail()}>
          <>
            <Ionicons
              style={styles.buttonIcon}
              name={'logo-google'}
              size={20}
              color={'white'}
            />
            <Text style={[styles.buttonText]}>Connexion avec Google</Text>
          </>
        </TouchableHighlight>

        <TouchableHighlight
          style={[styles.button, {backgroundColor: colors.primary}]}
          onPress={() => setDisplayAnonymousModal(true)}>
          <>
            <Ionicons
              style={styles.buttonIcon}
              name={'glasses-outline'}
              size={26}
              color={'white'}
            />
            <Text style={[styles.buttonText]}>Connexion anonyme</Text>
          </>
        </TouchableHighlight>
      </View>

      <View style={styles.conditionContainer}>
        <Text style={[styles.condition, {color: colors.text}]}>
          En poursuivant, vous acceptez les
        </Text>
        <TouchableOpacity
          onPress={() => Linking.openURL('https://www.peamoni.fr/#/terms')}>
          <Text style={[styles.conditionLink, {color: colors.primary}]}>
            conditions générales d'utilisation
          </Text>
        </TouchableOpacity>
      </View>

      <Dialog.Container visible={displayAnonymousModal}>
        <Dialog.Title>Connexion anonyme</Dialog.Title>
        <Dialog.Description>
          Vous ne pourrez pas consulter votre compte depuis le site web, ni
          récupérer vos données si vous changez de téléphone ou réinstallez
          l'application.
        </Dialog.Description>
        <Dialog.Button
          label="Annuler"
          onPress={() => setDisplayAnonymousModal(false)}
        />
        <Dialog.Button
          label="Continuer"
          bold={true}
          onPress={signAnonymously}
        />
      </Dialog.Container>
    </View>
  );
}

export default WelcomeScreen;
