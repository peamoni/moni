import {InstrumentsType} from '../context/reducers';
import {UserConf, Position, Instrument} from '../model/model';

type PorfolioDetails = {
  initial: number;
  total: number;
  cash: number;
  invested: number;
  dailyPreviousTotal: number;
  dailyPerf: number;
  positions: PositionInfo[];
};

export interface PositionInfo {
  pos: AugmentedPosition | null;
  ins: AugmentedInstrument;
}

export interface AugmentedPosition extends Position {
  pruPercent: number | null;
  pv: number | null;
  totalValue: number | null;
  percentCapital: number | null;
  loss: number | null;
  percentLoss: number | null;
  stopPercent: number | null;
}

export interface AugmentedInstrument extends Instrument {
  percent: number | null;
  trendPerformance: number | null;
  trendSpeed: number | null;
  ave: number | null;
  volEvol: number | null;
  reversePercent: number | null;
}

export const getPositionInfo = (
  instrument: Instrument,
  position: Position | null,
  portfolioTotal: number = 1,
): PositionInfo => {
  return {
    pos: position
      ? addPositionData(instrument, position, portfolioTotal)
      : null,
    ins: addInstrumentData(instrument),
  };
};

export const addPositionData = (
  instrument: Instrument,
  position: Position,
  portfolioTotal: number,
): AugmentedPosition => {
  let pruPercent: number | null = null;
  if (instrument.li && instrument.li.last && position != null) {
    pruPercent = ((instrument.li.last - position.value) / position.value) * 100;
  }

  let pv: number | null = null;
  let totalValue: number | null = null;
  let percentCapital: number | null = null;
  let loss: number | null = null;
  let percentLoss: number | null = null;
  let stopPercent: number | null = null;
  if (instrument.li && instrument.li.last && position != null) {
    pv = (instrument.li.last - position.value) * position.quantity;
    totalValue = instrument.li.last * position.quantity;
    percentCapital =
      ((position.quantity * instrument.li.last) / portfolioTotal) * 100;
    loss = (position.stop - position.value) * position.quantity;
    percentLoss = 100 - (100 * position.stop) / position.value;
    stopPercent =
      ((instrument.li.last - position.stop) / instrument.li.last) * 100;
  }
  return {
    ...position,
    pv,
    totalValue,
    pruPercent,
    percentCapital,
    loss,
    percentLoss,
    stopPercent,
  };
};

export const addInstrumentsData = (
  instruments: Instrument[],
): AugmentedInstrument[] => {
  return instruments.map(i => addInstrumentData(i));
};

export const addInstrumentData = (
  instrument: Instrument,
): AugmentedInstrument => {
  let percent: number | null = null;
  if (instrument.li && instrument.li.last && instrument.li.c) {
    percent = ((instrument.li.last - instrument.li.c) / instrument.li.c) * 100;
  }

  let trendPerformance: number | null = null;
  let trendSpeed: number | null = null;
  if (
    instrument &&
    instrument.li &&
    instrument.in.bd &&
    instrument.li.last &&
    instrument.in.bp
  ) {
    const trendDuration =
      (+new Date() / 1000 - instrument.in.bd) / 3600 / 24 / 30;
    trendPerformance =
      ((instrument.li.last - instrument.in.bp) / instrument.in.bp) * 100;
    trendSpeed = trendPerformance / trendDuration;
  }

  let reversePercent: number | null = null;
  if (instrument && instrument.li?.last && instrument.in.bk) {
    reversePercent =
      ((instrument.li.last - instrument.in.bk) / instrument.in.bk) * 100;
  }

  let ave: number | null = null;
  let volEvol: number | null = null;
  if (
    instrument &&
    instrument.li &&
    instrument.li.last &&
    instrument.li.v &&
    instrument.in.av
  ) {
    ave = (instrument.li.v * instrument.li.last) / 1000;
    volEvol = instrument.li.v / instrument.in.av;
  }
  return {
    ...instrument,
    ave,
    volEvol,
    trendPerformance,
    trendSpeed,
    percent,
    reversePercent,
  };
};

export const getPortfolioDetails = (
  conf: UserConf,
  instruments: InstrumentsType,
): PorfolioDetails => {
  const result = {
    initial: parseFloat(conf.initialCapital) || 0,
    total: 0,
    cash: isNaN(conf.cash) ? 0 : parseFloat(conf.cash) || 0,
    invested: -1,
    dailyPreviousTotal: 0,
    dailyPerf: 0,
    positions: [] as PositionInfo[],
  };
  if (conf.positions && conf.cash !== null && conf.history) {
    result.invested = conf.positions
      .map(p => {
        return {
          ...p,
          info: instruments.livelist.find(ins => ins.isin == p.isin),
        };
      })
      .filter(p => !!p.info)
      .reduce((p, c) => p + c.info.li.last * c.quantity, 0);
    result.total = result.invested + result.cash;
    if (conf.history.length) {
      const pp = conf.history[conf.history.length - 1];
      result.dailyPreviousTotal =
        parseFloat(pp.cash) + parseFloat(pp.pos) + (result.initial - pp.ic);
    }
    result.dailyPerf =
      ((result.total - result.dailyPreviousTotal) / result.dailyPreviousTotal) *
      100;
    result.positions = conf.positions
      .filter(p => instruments.livelist.find(ins => ins.isin == p.isin))
      .map(p => {
        return getPositionInfo(
          instruments.livelist.find(ins => ins.isin == p.isin),
          p,
          result.total,
        );
      })
      .sort((a: PositionInfo, b: PositionInfo) =>
        a.ins.na.localeCompare(b.ins.na),
      );
  }
  return result;
};
