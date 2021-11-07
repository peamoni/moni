import React, {useMemo} from 'react';
import {FlatList} from 'react-native';
import Animated from 'react-native-reanimated';
import {Currency, Mode} from '../context/reducers';
import {PositionInfo} from '../utils/PortfolioTools';
import InstrumentElement, {InstrumentDisplay} from './InstrumentElement';

/* Animated flatlist to display instrument list */

interface InstrumentListProps {
  keyPrefix: string;
  itemSelected?: (instrument: PositionInfo) => void;
  instruments: PositionInfo[];
  currentInstDisplay: Animated.SharedValue<InstrumentDisplay>;
  header?: React.ComponentType<any> | React.ReactElement | null;
  footer?: React.ComponentType<any> | React.ReactElement | null;
  y: Animated.Value<number>;
  listRef?: React.RefObject<FlatList<any>>;
  currency: Currency;
  mode: Mode;
}

const InstrumentList = ({
  keyPrefix,
  instruments,
  itemSelected,
  currentInstDisplay,
  header,
  footer,
  y,
  listRef,
  currency,
  mode,
}: InstrumentListProps) => {
  const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
  if (!listRef) {
    listRef = React.createRef<FlatList>();
  }

  const renderItem = ({item, index}: {item: PositionInfo; index: number}) => {
    const ITEM_SIZE = 65;
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
    return (
      <Animated.View
        style={{height: ITEM_SIZE, opacity, transform: [{translateY, scale}]}}>
        <InstrumentElement
          onPress={() => itemSelected && itemSelected(item)}
          instrument={item.ins}
          position={item.pos}
          display={currentInstDisplay}
          currency={currency}
          mode={mode}
        />
      </Animated.View>
    );
  };

  const memoizedRender = useMemo(() => renderItem, [y]);

  return (
    <AnimatedFlatList
      //{...{ onScroll }}
      ref={listRef}
      onScroll={Animated.event([{nativeEvent: {contentOffset: {y}}}], {
        useNativeDriver: true,
      })}
      overScrollMode="never"
      scrollEventThrottle={1}
      data={instruments}
      contentContainerStyle={{
        marginHorizontal: 20,
      }}
      extraData={[instruments]}
      initialNumToRender={30}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      keyExtractor={(item: PositionInfo, index) =>
        keyPrefix + item.ins.isin + index
      }
      renderItem={memoizedRender}
    />
  );
};

export default InstrumentList;
