import Bugsnag from '@bugsnag/react-native';
import {useTheme} from '@react-navigation/native';
import {StackNavigationHelpers} from '@react-navigation/stack/lib/typescript/src/types';
import React, {useState} from 'react';

import {StyleSheet, Text, View} from 'react-native';
import {TextInput, TouchableOpacity} from 'react-native-gesture-handler';
import Animated, {
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import Header from './components/Header';
import {InstrumentDisplay} from './components/InstrumentElement';
import InstrumentList from './components/InstrumentList';
import Selector from './components/Selector';
import {AppContext} from './context/context';
import {updateUserConf} from './dao/firestore';
import {Instrument, UserConf} from './model/model';
import {getPositionInfo, PositionInfo} from './utils/PortfolioTools';
import {sml} from './utils/SizeTool';

/* Search screen, a simple user input to search instruments with different criterias */
const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 22,
  },
  searchInput: {
    color: 'white',
    borderColor: 'white',
    fontSize: 22,
    fontFamily: 'Poppins-Regular',
    paddingBottom: 4,
    borderBottomWidth: 1,
    textAlign: 'center',
    minWidth: 250,
  },
  clearContainer: {
    marginRight: 2,
  },
  clearIcon: {
    opacity: 0.8,
  },
  container: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: 10,
  },
  screenerTools: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    opacity: 0.6,
  },
  lastSearchContainer: {
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 15,
    marginTop: sml(8, 10, 12),
  },
  lastSearch: {
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
});

const INST_DISPLAY_SELECTOR_WIDTH = 80;
const instrumentDisplays: InstrumentDisplay[] = ['TREND', 'VOLUMES', 'SPEED'];
const instrumentDisplaysLabels: string[] = ['Tendance', 'Volumes', 'Vitesse'];

function SearchScreen({navigation}: {navigation: StackNavigationHelpers}) {
  const [search, onChangeSearch] = useState('');
  const {colors} = useTheme();
  const {state, dispatch} = React.useContext(AppContext);

  // Filter search based on user input
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
    .slice(0, 50);

  // Display the last searchs
  const previousSearch: PositionInfo[] =
    state.auth.conf?.search
      ?.map(s => {
        return state.instruments.livelist.find(ins => ins.isin == s);
      })
      .filter((ins: Instrument) => !!ins)
      .map(p => getPositionInfo(p, null)) || [];

  // Shared reference to animate the list
  const y = new Animated.Value(0);
  // Shared current display for the list
  const currentInstDisplayIndex = useSharedValue<number>(0);
  const currentInstDisplay = useDerivedValue<InstrumentDisplay>(
    () => instrumentDisplays[currentInstDisplayIndex.value],
  );

  // Header info and animations
  const HEADER_SIZE = 65;
  const translateHeaderY = y.interpolate({
    inputRange: [-1, 0, HEADER_SIZE],
    outputRange: [0, 0, HEADER_SIZE],
  });
  const translateSelectorX = y.interpolate({
    inputRange: [-1, 0, HEADER_SIZE],
    outputRange: [0, 0, 200],
  });

  // Once a element has been clicked, save it as a "previous search"
  const saveLastSearch = async (instrument: PositionInfo) => {
    try {
      if (state.auth.user) {
        let search: string[] = state.auth.conf?.search || [];
        search = search.filter(s => s !== instrument.ins.isin);
        search.unshift(instrument.ins.isin);
        search = search.slice(0, 5);
        const newConf: UserConf = {search};
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
    <>
      <Header navigation={navigation}>
        <View style={styles.headerContainer}>
          <TextInput
            placeholder="Nom, Ticker, ..."
            placeholderTextColor={'rgba(255,255,255,.5)'}
            keyboardType="default"
            onChangeText={onChangeSearch}
            value={search}
            style={[styles.searchInput]}
            clearButtonMode={'while-editing'}
            selectionColor={'white'}
            returnKeyType={'done'}
          />
        </View>
      </Header>
      <View style={styles.container}>
        {filteredInstruments.length ? (
          <InstrumentList
            keyPrefix={'screener'}
            currentInstDisplay={currentInstDisplay}
            currency={state.auth.currency}
            mode={state.auth.mode}
            footer={null}
            itemSelected={instrument => {
              saveLastSearch(instrument);
            }}
            header={
              <Animated.View
                style={[
                  styles.screenerTools,
                  {
                    justifyContent: 'center',
                    transform: [{translateY: translateHeaderY}],
                  },
                ]}>
                <Animated.View
                  style={{transform: [{translateX: translateSelectorX}]}}>
                  <Selector
                    elements={instrumentDisplaysLabels}
                    elementWidth={INST_DISPLAY_SELECTOR_WIDTH}
                    onPress={index => {
                      currentInstDisplayIndex.value = index;
                    }}
                    backgroundSelectionStyle={{
                      backgroundColor: colors.text,
                      opacity: 0.11,
                    }}
                    labelContainerStyle={{padding: 6}}
                    initialValue={currentInstDisplayIndex.value}
                    labelStyle={{color: colors.text, fontSize: 12}}
                  />
                </Animated.View>
              </Animated.View>
            }
            instruments={filteredInstruments}
            y={y}
          />
        ) : (
          <View style={styles.emptyContainer}>
            {previousSearch.length ? (
              <>
                <Text style={[styles.emptyText, {color: colors.text}]}>
                  {previousSearch.length === 1
                    ? 'Dernière recherche'
                    : 'Dernières recherches'}
                </Text>
                {previousSearch.map((instrument, i) => {
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        navigation.navigate('Instrument', {
                          instrument: instrument.ins,
                          position: instrument.pos,
                        });
                      }}
                      key={instrument.ins.isin + i}
                      style={[
                        styles.lastSearchContainer,
                        {
                          backgroundColor: colors.card,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.lastSearch,
                          {
                            color: colors.text,
                          },
                        ]}>
                        {instrument.ins.na}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              <Text style={[styles.emptyText, {color: colors.text}]}>
                {search.length > 1
                  ? 'Aucun résultat trouvé pour cette recherche.'
                  : 'Remplissez le champ de recherche pour trouver une valeur.'}
              </Text>
            )}
          </View>
        )}
      </View>
    </>
  );
}

export default SearchScreen;
