import {StackNavigationHelpers} from '@react-navigation/stack/lib/typescript/src/types';
import React, {useEffect, useState} from 'react';
import {AppContext} from './context/context';
import {Dimensions, StyleSheet, Text, View} from 'react-native';
import Header from './components/Header';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Path} from 'react-native-svg';
import {mixPath, round, useVector} from 'react-native-redash';
import {getHistoryGraph} from './utils/Data2Graph';
import {getPortfolioDetails} from './utils/PortfolioTools';
import Cursor from './components/Cursor';
import DashboardHeader from './components/DashboardHeader';
import {useTheme} from '@react-navigation/native';
import {InstrumentDisplay} from './components/InstrumentElement';
import Selector from './components/Selector';
import InstrumentList from './components/InstrumentList';
const {width} = Dimensions.get('window');
import Ionicons from 'react-native-vector-icons/Ionicons';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {sml} from './utils/SizeTool';
import Dialog from 'react-native-dialog';
import {updateUserConf} from './dao/firestore';
import Bugsnag from '@bugsnag/react-native';
import {ScreenerSortItem, ScreenerSortOrder} from './model/model';
import Sorter from './components/Sorter';

/* Dashboard is the main screen to check portfolio and interract of instruments */

// Shared configuration with other components
const PERIOD_SELECTOR_WIDTH = 44;
const INST_DISPLAY_SELECTOR_WIDTH = 55;
const GRAPH_HEIGHT = sml(40, 60, 80);
const GRAPH_WIDTH = width;
const PERIODS: [string, number][] = [
  ['1M', 1],
  ['3M', 3],
  ['6M', 6],
  ['1A', 12],
];

const styles = StyleSheet.create({
  portfolioTools: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    marginBottom: 10,
  },
  graphContainer: {
    marginVertical: 10,
    height: GRAPH_HEIGHT,
  },
  tutoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: sml(50, 60, 70),
  },
  tutoTitle: {
    fontSize: sml(14, 15, 16),
    fontFamily: 'Poppins-Regular',
    color: 'white',
  },
  tutoLabel: {
    fontSize: sml(12, 13, 14),
    fontFamily: 'Poppins-Light',
    color: 'white',
    textAlign: 'center',
  },
  portfolioGraphSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioGraphSelectorLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: 'white',
    marginRight: 4,
  },
  portfolioPeriodSelector: {
    flexDirection: 'row',
  },
  labelContainer: {
    padding: 4,
    width: PERIOD_SELECTOR_WIDTH,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: 'white',
    textAlign: 'center',
  },
  backgroundSelection: {
    backgroundColor: '#f3f3f3',
    ...StyleSheet.absoluteFillObject,
    width: PERIOD_SELECTOR_WIDTH,
    borderRadius: 8,
    opacity: 0.21,
  },
  positionTitle: {
    fontSize: sml(16, 18, 20),
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
  },
  instrumentDisplaySelector: {
    flexDirection: 'row',
  },
  labelInstDisplayContainer: {
    padding: 6,
    width: INST_DISPLAY_SELECTOR_WIDTH,
  },
  backgroundSelectionInstDisplay: {
    ...StyleSheet.absoluteFillObject,
    width: INST_DISPLAY_SELECTOR_WIDTH,
    borderRadius: 8,
    opacity: 0.11,
  },
  labelInstDisplay: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  investedAndCash: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    margin: 20,
  },
  investedAndCashElement: {
    alignItems: 'center',
  },
  investedAndCashValue: {
    fontSize: sml(12, 13, 14),
  },
  investedAndCashLabel: {
    fontSize: sml(8, 9, 10),
    opacity: 0.4,
  },
  noPosContainer: {
    paddingLeft: 45,
    paddingRight: 35,
    paddingTop: sml(0, 10, 20),
    paddingBottom: sml(0, 20, 40),
    justifyContent: 'space-around',
    alignItems: 'center',
    flex: 1,
  },
  noPosSubContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPosTitle: {
    fontSize: sml(16, 18, 20),
    fontFamily: 'Poppins-Regular',
  },
  noPosText: {
    fontSize: sml(12, 13, 14),
    fontFamily: 'Poppins-Regular',
    marginHorizontal: sml(20, 17, 15),
    flex: 1,
  },
  noPosTextBold: {
    fontFamily: 'Poppins-Bold',
  },
  scrollToTopContainer: {
    position: 'absolute',
    right: 10,
    top: 10,
    zIndex: 1000,
  },
});

// Available sorts
const sorts: ScreenerSortItem[] = [
  'name',
  'variation',
  'perfpos',
  'stop',
  'value',
  'pv',
];

function DashboardScreen({navigation}: {navigation: StackNavigationHelpers}) {
  const AnimatedPath = Animated.createAnimatedComponent(Path);
  const {state, dispatch} = React.useContext(AppContext);
  const {colors} = useTheme();
  // Get the portfolio details
  const {
    total,
    dailyPerf,
    positions,
    invested,
    cash,
    initial,
  } = getPortfolioDetails(state.auth.conf || {}, state.instruments);
  // Update cash input
  const [cashUpdate, onChangeCashUpdate] = React.useState(
    cash.toFixed(2).toString() || '',
  );
  // Update initial capital input
  const [icUpdate, onChangeICUpdate] = React.useState(
    initial.toFixed(2).toString() || '',
  );
  // ... and their respective modals
  const [displayCashModal, setDisplayCashModal] = useState(false);
  const [displayICModal, setDisplayICModal] = useState(false);

  // Sort tools
  const [sort, setSort] = useState<ScreenerSortItem>('name');
  const [sortOrder, setSortOrder] = useState<ScreenerSortOrder>(1);

  // Sort positions (could be mutualized with screeners maybe ...)
  const sortedPositions = positions.sort((a, b) => {
    if (!sort || sort === 'name') {
      return a.ins.na.localeCompare(b.ins.na) * sortOrder;
    }
    if (sort === 'variation' && a.ins.percent && b.ins.percent) {
      return (a.ins.percent - b.ins.percent) * sortOrder;
    }
    if (sort === 'perfpos' && a.pos?.pruPercent && b.pos?.pruPercent) {
      return (a.pos?.pruPercent - b.pos?.pruPercent) * sortOrder;
    }
    if (
      sort === 'stop' &&
      a.pos &&
      b.pos &&
      a.pos.stopPercent &&
      b.pos.stopPercent
    ) {
      return (a.pos.stopPercent - b.pos.stopPercent) * sortOrder;
    }
    if (
      sort === 'value' &&
      a.pos &&
      b.pos &&
      a.ins.li &&
      a.ins.li.last &&
      b.ins.li &&
      b.ins.li.last
    ) {
      return (
        (a.pos.quantity * a.ins.li.last - b.pos.quantity * b.ins.li.last) *
        sortOrder
      );
    }
    if (sort === 'pv' && a.pos && b.pos && a.pos.pv && b.pos.pv) {
      return (a.pos.pv - b.pos.pv) * sortOrder;
    }
    return 1;
  });

  const updateCash = async () => {
    try {
      setDisplayCashModal(false);
      if (state.auth.user) {
        await updateUserConf(
          state.auth.user,
          {
            cash: parseFloat(cashUpdate.replace(/,/g, '.') || '0'),
          },
          dispatch,
          false,
          state.auth.mode,
        );
      }
    } catch (e) {
      Bugsnag.notify(e);
    }
  };

  const updateIC = async () => {
    try {
      setDisplayICModal(false);
      if (state.auth.user) {
        await updateUserConf(
          state.auth.user,
          {
            initialCapital: parseFloat(icUpdate.replace(/,/g, '.') || '0'),
          },
          dispatch,
          false,
          state.auth.mode,
        );
      }
    } catch (e) {
      Bugsnag.notify(e);
    }
  };

  // Shared element to display custom info when user swipe the graph
  const translation = useVector();
  const isCursorActive = useSharedValue(false);
  const transition = useSharedValue(0);
  const previousPeriod = useSharedValue<number>(0);
  const currentPeriod = useSharedValue<number>(0);

  // Construct graphs
  const graphs = state.auth.conf
    ? getHistoryGraph(
        state.auth.conf,
        state.instruments,
        PERIODS,
        GRAPH_HEIGHT,
        GRAPH_WIDTH,
      )
    : [];

  // And animate svf path while switching periods (reanimated magic !)
  const animatedProps = useAnimatedProps(() => {
    if (!graphs.length) {
      return {d: ''};
    }
    const previousPath = graphs[previousPeriod.value].data.path;
    const currentPath = graphs[currentPeriod.value].data.path;
    return {
      d: mixPath(transition.value, previousPath, currentPath),
    };
  }, [graphs]);

  // Custom selector parameters
  const instrumentDisplays: InstrumentDisplay[] = ['PRU', 'VALUE', 'STOP'];
  const instrumentDisplaysLabels: string[] = ['PRU', 'VALEUR', 'STOP'];
  const currentInstDisplayIndex = useSharedValue<number>(0);
  const currentInstDisplay = useDerivedValue<InstrumentDisplay>(
    () => instrumentDisplays[currentInstDisplayIndex.value],
  );

  // Flat list shared value to animate headers
  const y = new Animated.Value(0);

  // Header animation
  const HEADER_SIZE = 65;
  const translateHeaderY = y.interpolate({
    inputRange: [-1, 0, HEADER_SIZE],
    outputRange: [0, 0, HEADER_SIZE],
  });
  const translateTitleX = y.interpolate({
    inputRange: [-1, 0, HEADER_SIZE],
    outputRange: [0, 0, -200],
  });
  const translateSelectorX = y.interpolate({
    inputRange: [-1, 0, HEADER_SIZE],
    outputRange: [0, 0, 200],
  });
  const opacityHeader = y.interpolate({
    inputRange: [-1, 0, HEADER_SIZE / 1.5],
    outputRange: [1, 1, 0],
  });
  // If not histo available, display a small tutorial
  const tuto =
    state.auth.conf?.history && state.auth.conf?.history?.length <= 2;
  return (
    <>
      <Header navigation={navigation}>
        <DashboardHeader
          translation={translation}
          index={currentPeriod}
          graphs={graphs}
          width={width}
          total={total}
          displayCurrent={isCursorActive}
          dailyPerf={tuto ? null : dailyPerf}
        />
        <View style={styles.graphContainer}>
          {tuto ? (
            <View style={styles.tutoContainer}>
              <Text style={styles.tutoTitle}>Bienvenue à bord !</Text>
              <Text style={styles.tutoLabel}>
                Le graph de suivi des performances s'affichera ici dans 2 jours.
              </Text>
            </View>
          ) : (
            <>
              <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
                <AnimatedPath
                  animatedProps={animatedProps}
                  fill="transparent"
                  stroke="white"
                  strokeWidth={2}
                />
              </Svg>
              <Cursor
                translation={translation}
                index={currentPeriod}
                graphs={graphs}
                isActive={isCursorActive}
                cursorBackground={'rgba(255, 255, 255, 0.2)'}
                dotBackground={'white'}
              />
            </>
          )}
        </View>
        <View style={[styles.portfolioTools, {opacity: tuto ? 0 : 1}]}>
          <View style={styles.portfolioGraphSelector}>
            <Text style={styles.portfolioGraphSelectorLabel}>Portf. total</Text>
            {/* <Ionicons name={'caret-down-outline'} size={18} color={"white"} /> */}
          </View>
          <Selector
            elements={graphs.map(item => item.label)}
            elementWidth={PERIOD_SELECTOR_WIDTH}
            onPress={index => {
              previousPeriod.value = currentPeriod.value;
              currentPeriod.value = index;
              transition.value = 0;
              transition.value = withTiming(1);
            }}
            backgroundSelectionStyle={{
              backgroundColor: '#f3f3f3',
              opacity: 0.21,
            }}
            labelContainerStyle={styles.labelContainer}
            initialValue={currentPeriod.value}
            labelStyle={styles.label}
          />
        </View>
      </Header>
      <View style={{flex: 1, paddingTop: 20}}>
        {sortedPositions.length ? (
          <>
            <Animated.View
              style={[
                styles.scrollToTopContainer,
                {
                  opacity: opacityHeader,
                  transform: [{translateX: translateSelectorX}],
                },
              ]}>
              <Sorter
                index={sorts.indexOf(sort)}
                order={sortOrder}
                items={sorts}
                onSortChanged={(index, order) => {
                  setSort(sorts[index]);
                  setSortOrder(order);
                }}
              />
            </Animated.View>
            <InstrumentList
              keyPrefix={'dashboard'}
              currentInstDisplay={currentInstDisplay}
              currency={state.auth.currency}
              mode={state.auth.mode}
              footer={
                <View style={styles.investedAndCash}>
                  <TouchableOpacity
                    style={styles.investedAndCashElement}
                    onPress={() => setDisplayICModal(true)}>
                    <View style={{flexDirection: 'row'}}>
                      <Text
                        style={[
                          styles.investedAndCashValue,
                          {color: colors.text},
                        ]}>
                        {round(initial, 2).toLocaleString('fr-FR')}
                        {state.auth.currency}
                      </Text>
                      <Ionicons
                        name={'create'}
                        size={sml(12, 13, 14)}
                        color={colors.primary}
                        style={{marginLeft: 6}}
                      />
                    </View>
                    <Text
                      style={[
                        styles.investedAndCashLabel,
                        {color: colors.text},
                      ]}>
                      CAPITAL INITIAL
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.investedAndCashElement}>
                    <Text
                      style={[
                        styles.investedAndCashValue,
                        {color: colors.text},
                      ]}>
                      {round(invested, 2).toLocaleString('fr-FR')}
                      {state.auth.currency}
                    </Text>
                    <Text
                      style={[
                        styles.investedAndCashLabel,
                        {color: colors.text},
                      ]}>
                      INVESTIS
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.investedAndCashElement}
                    onPress={() => setDisplayCashModal(true)}>
                    <View style={{flexDirection: 'row'}}>
                      <Text
                        style={[
                          styles.investedAndCashValue,
                          {color: colors.text},
                        ]}>
                        {round(cash, 2).toLocaleString('fr-FR')}
                        {state.auth.currency}
                      </Text>
                      <Ionicons
                        name={'create'}
                        size={sml(12, 13, 14)}
                        color={colors.primary}
                        style={{marginLeft: 6}}
                      />
                    </View>
                    <Text
                      style={[
                        styles.investedAndCashLabel,
                        {color: colors.text},
                      ]}>
                      CASH DISPO
                    </Text>
                  </TouchableOpacity>
                </View>
              }
              header={
                <Animated.View
                  style={[
                    styles.portfolioTools,
                    {
                      transform: [{translateY: translateHeaderY}],
                      opacity: opacityHeader,
                    },
                  ]}>
                  <Animated.Text
                    style={[
                      styles.positionTitle,
                      {
                        transform: [{translateX: translateTitleX}],
                        opacity: opacityHeader,
                        color: colors.text,
                      },
                    ]}>
                    Positions
                  </Animated.Text>
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
                      labelStyle={{
                        color: colors.text,
                        fontSize: sml(10, 11, 12),
                      }}
                    />
                  </Animated.View>
                </Animated.View>
              }
              instruments={sortedPositions}
              y={y}
            />
          </>
        ) : (
          <View style={styles.noPosContainer}>
            <Text style={[styles.noPosTitle, {color: colors.text}]}>
              Pas de position en cours ?
            </Text>
            <View style={styles.noPosSubContainer}>
              <Ionicons
                name={'wallet-outline'}
                size={sml(28, 36, 44)}
                color={colors.primary}
              />
              <Text style={[styles.noPosText, {color: colors.text}]}>
                Vous pouvez suivre vos positions et les performances de votre
                portefeuille sur{' '}
                <Text style={[styles.noPosTextBold, {color: colors.primary}]}>
                  cet écran
                </Text>
                .
              </Text>
            </View>
            <View style={styles.noPosSubContainer}>
              <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                <Ionicons
                  name={'search-outline'}
                  size={sml(28, 36, 44)}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <Text style={[styles.noPosText, {color: colors.text}]}>
                Vous avez déjà des positions ? Utilisez la{' '}
                <Text style={[styles.noPosTextBold, {color: colors.primary}]}>
                  recherche
                </Text>{' '}
                pour les retrouver.
              </Text>
            </View>
            <View style={styles.noPosSubContainer}>
              <TouchableOpacity onPress={() => navigation.navigate('Screener')}>
                <Ionicons
                  name={'flashlight-outline'}
                  size={sml(28, 36, 44)}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <Text style={[styles.noPosText, {color: colors.text}]}>
                Envie de découvrir de nouvelles valeurs ? Direction les{' '}
                <Text style={[styles.noPosTextBold, {color: colors.primary}]}>
                  screeners.
                </Text>
              </Text>
            </View>
          </View>
        )}
        <Dialog.Container visible={displayCashModal}>
          <Dialog.Title>Cash disponible</Dialog.Title>
          <Dialog.Description>
            Saisissez le cash disponible sur votre portefeuille pour le mettre à
            jour.
          </Dialog.Description>
          <Dialog.Input
            placeholderTextColor={'grey'}
            keyboardType="numeric"
            onChangeText={onChangeCashUpdate}
            value={cashUpdate}
          />
          <Dialog.Button
            label="Annuler"
            onPress={() => setDisplayCashModal(false)}
          />
          <Dialog.Button label="Enregistrer" bold={true} onPress={updateCash} />
        </Dialog.Container>

        <Dialog.Container visible={displayICModal}>
          <Dialog.Title>Capital initial</Dialog.Title>
          <Dialog.Description>
            Saisissez le capital initial de votre portefeuille (somme des
            versements) pour suivre précisement vos performances.
          </Dialog.Description>
          <Dialog.Input
            placeholderTextColor={'grey'}
            keyboardType="numeric"
            onChangeText={onChangeICUpdate}
            value={icUpdate}
          />
          <Dialog.Button
            label="Annuler"
            onPress={() => setDisplayICModal(false)}
          />
          <Dialog.Button label="Enregistrer" bold={true} onPress={updateIC} />
        </Dialog.Container>
      </View>
    </>
  );
}

export default DashboardScreen;
