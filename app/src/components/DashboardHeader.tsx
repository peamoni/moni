import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedProps,
  useDerivedValue,
} from 'react-native-reanimated';
import {Vector, round} from 'react-native-redash';
import {GraphDataWrapper} from '../utils/Data2Graph';
import {sml} from '../utils/SizeTool';
import AnimateableText from 'react-native-animateable-text';
import Bugsnag from '@bugsnag/react-native';
import {AppContext} from '../context/context';

/* Custom dashboard header, displays the global performances or portfolio value at a specific day*/

const styles = StyleSheet.create({
  portfolioTitle: {
    opacity: 0.46,
    fontSize: 16,
    marginLeft: 20,
    marginTop: sml(14, 17, 20),
    color: 'white',
    fontFamily: 'Poppins-Regular',
  },
  portfolioValue: {
    fontSize: sml(24, 32, 36),
    marginLeft: 20,
    marginTop: sml(-10, -10, -10),
    color: 'white',
    fontFamily: 'Poppins-Regular',
  },
  portfolioPerf: {
    marginLeft: 24,
    fontSize: sml(10, 12, 14),
    marginTop: sml(-6, -7, -8),
    color: 'white',
    fontFamily: 'Poppins-Light',
  },
});

interface DashboardHeaderProps {
  translation: Vector<Animated.SharedValue<number>>;
  index: Animated.SharedValue<number>;
  graphs: GraphDataWrapper[];
  width: number;
  displayCurrent: Animated.SharedValue<boolean>;
  total: number;
  dailyPerf: number | null;
}

interface PerfInfo {
  total: number;
  date: string;
}

const DashboardHeader = ({
  translation,
  index,
  graphs,
  width,
  displayCurrent,
  total,
  dailyPerf,
}: DashboardHeaderProps) => {
  const {state} = React.useContext(AppContext);
  const perfInfo = useDerivedValue<PerfInfo>(() => {
    try {
      if (!graphs[index.value]) return {total: 0, date: ''};
      const histo = graphs[index.value].histo;
      if (!displayCurrent.value && dailyPerf !== null) {
        return {
          total: total,
          date: `${dailyPerf >= 0 ? '+' : ''}${round(
            dailyPerf,
            2,
          )}% Aujourd'hui`,
        };
      }
      const p = interpolate(
        translation.x.value,
        [0, width],
        [histo[0][1], histo[histo.length - 1][1]],
      );
      const histoIndex = histo.findIndex(h => h[1] >= p);
      return {
        total: histo[histoIndex][0],
        date: `le ${new Date(histo[histoIndex][1] * 1000).toLocaleDateString(
          'fr-FR',
        )}`,
      };
    } catch (e) {
      Bugsnag.notify(e);
    }
    return {total: 0, date: ''};
  });

  const totalTextProps = useAnimatedProps(() => ({
    text: `${round(perfInfo.value.total, 2).toLocaleString('fr-FR')}${
      state.auth.currency
    }`,
  }));
  const perfTextProps = useAnimatedProps(() => ({text: perfInfo.value.date}));

  return (
    <View style={{marginTop: -15, marginRight: 50}}>
      <Text style={styles.portfolioTitle}>PORTEFEUILLE</Text>
      <AnimateableText
        animatedProps={totalTextProps}
        style={styles.portfolioValue}
      />
      <AnimateableText
        animatedProps={perfTextProps}
        style={[styles.portfolioPerf, {opacity: dailyPerf !== null ? 1 : 0}]}
      />
    </View>
  );
};

export default DashboardHeader;
