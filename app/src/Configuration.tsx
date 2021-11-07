import React from 'react';

import {StyleSheet, Text, View} from 'react-native';
import {TextInput, TouchableOpacity} from 'react-native-gesture-handler';
import {AppContext} from './context/context';
import {getLive, updateUserConf} from './dao/firestore';
import {UserConf} from './model/model';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '@react-navigation/native';
import {colorToGradient} from './utils/Themes';
import {sml} from './utils/SizeTool';

/* Simple onboarding screen */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-around',
    paddingVertical: 100,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'Poppins-Regular',
    fontSize: 28,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  inputContainer: {
    alignItems: 'center',
  },
  inputLabel: {
    fontFamily: 'Poppins-Light',
    textAlign: 'center',
    fontSize: 18,
    opacity: 0.8,
    marginBottom: 8,
  },
  input: {
    fontSize: 32,
    fontFamily: 'Poppins-Regular',
    paddingBottom: 4,
    borderBottomWidth: 1,
    textAlign: 'center',
    width: 250,
  },
  subInput: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
  },
  notes: {
    textAlign: 'justify',
    fontFamily: 'Poppins-Light',
    paddingHorizontal: 10,
    fontSize: sml(8, 10, 12),
  },
  button: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontFamily: 'Poppins-Regular',
  },
});

function ConfigurationScreen() {
  const {state, dispatch} = React.useContext(AppContext);
  const [value, onChangeText] = React.useState('');
  const {colors} = useTheme();
  const gradient = colorToGradient(colors.primary);

  const createConf = async () => {
    let ic = parseFloat(value.replace(/,/g, '.') || '15000');
    if (isNaN(ic)) {
      ic = 15000;
    }
    const userConf: UserConf = {
      cash: ic,
      experience: 1,
      history: [],
      initialCapital: ic,
      positions: [],
      proEoT: 0,
      termsAccepted: true,
      view: {
        darkmode: false,
        theme: 'primary',
      },
    };
    if (state.auth.user) {
      await updateUserConf(
        state.auth.user,
        userConf,
        dispatch,
        true,
        state.auth.mode,
      );
      await getLive(dispatch, userConf, state.auth.mode);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, {color: colors.text}]}>
        Avant de démarrer...
      </Text>
      <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, {color: colors.text}]}>
          Indiquer la somme des versements réalisés sur votre{' '}
          {state.auth.mode === 'pea' ? 'PEA' : 'compte crypto (en USD)'} :
        </Text>
        <TextInput
          style={[styles.input, {color: colors.text, borderColor: colors.text}]}
          returnKeyType={'done'}
          keyboardType="numeric"
          placeholder={'15000' + state.auth.currency}
          onChangeText={(text: string) => onChangeText(text)}
          value={value}
        />
      </View>
      <Text style={[styles.notes, {color: colors.text}]}>
        Les informations affichées par moni sont issues d'algorithmes et ne sont
        en aucun cas des recommandations ou des conseils.
        {'\n'}
        Les algorithmes sont potentiellement défaillants et ne doivent pas être
        considérés comme une incitation à l'achat ou à la vente de valeurs
        boursières ou de cryptomonnaies.
        {'\n'}
        Ce site ne pourrait être en aucun cas responsable directement ou
        indirectement de l'utilisation qui est faite du contenu du site ou tout
        élément constituant ce site, mais également de toute perte subie ou de
        toute décision prise sur la base d'éléments de ce site.
        {'\n'}
        {'\n'}
        Il est recommandé à toute personne non avertie de prendre conseil auprès
        de professionnels avant tout investissement.
      </Text>
      <TouchableOpacity onPress={createConf}>
        <LinearGradient colors={gradient} style={[styles.button]}>
          <Text style={[styles.buttonText]}>J'ai compris</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

export default ConfigurationScreen;
