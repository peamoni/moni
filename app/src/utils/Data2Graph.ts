import * as shape from 'd3-shape';
import {scaleLinear} from 'd3-scale';
import {parse, Path} from 'react-native-redash';
import {UserConf, PortfolioHistoryItem} from '../model/model';
import {InstrumentsType} from '../context/reducers';
import {AugmentedInstrument, getPortfolioDetails} from './PortfolioTools';
import {getQuoteDailyHistory} from '../dao/firestore';

/* Util module to convert a list of history point to SVG path */

// Local types
type DataPoints = [number, number][];

type Point = {
  price: number;
  date: number;
  x: number;
};

type GraphData = {
  min: Point;
  max: Point;
  path: Path;
};
export interface GraphDataWrapper {
  label: string;
  data: GraphData;
  histo: DataPoints;
}

const GRAPH_POINTS = 150;

// Get user history from conf, regarding the period (daily/weekly)
const getUserHistory = (
  conf: UserConf,
  instruments: InstrumentsType,
  period: [string, number],
): PortfolioHistoryItem[] => {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - period[1] * 30);
  const toDate = new Date();
  var t = new Date();
  const {invested} = getPortfolioDetails(conf || {}, instruments);
  const toToday =
    toDate.getDate() == t.getDate() &&
    toDate.getMonth() == t.getMonth() &&
    toDate.getFullYear() == t.getFullYear();

  // Filtrage par date
  let filterHisto =
    conf.history?.filter(h => {
      const dh = new Date(h.t * 1000);
      return dh > fromDate && dh < toDate;
    }) || [];

  // On ajoute la perf du jour !
  if (t.getDay() != 6 && t.getDay() != 0 && toToday) {
    filterHisto.push({
      t: +new Date() / 1000,
      cash: conf.cash || -1,
      ic: conf.initialCapital || -1,
      pos: invested,
    });
  }
  // Si les données sont > GRAPH POINTS, on passe en hebdo
  if (filterHisto.length > GRAPH_POINTS) {
    filterHisto = filterHisto.filter(h => {
      const dh = new Date(h.t * 1000);
      return dh.getDay() == 5;
    });
  }

  filterHisto = filterHisto.filter(h => {
    return !isNaN(h.cash) && !isNaN(h.pos) && !isNaN(h.ic);
  });

  return filterHisto;
};

// Get the history graph raw data
export const getHistoryGraph = (
  conf: UserConf,
  instruments: InstrumentsType,
  periods: [string, number][],
  height: number,
  width: number,
): GraphDataWrapper[] => {
  const graphs: GraphDataWrapper[] = [];
  let previousLength: number = -1;
  periods.forEach(p => {
    const label = p[0];
    const months = p[1];
    const histo: DataPoints = getUserHistory(conf, instruments, [
      label,
      months,
    ]).map(h => {
      // Portfolio value
      return [h.pos + h.cash, h.t - (h.t % (24 * 60 * 60))];
    });
    if (
      (histo.length && histo.length !== previousLength) ||
      histo.length == GRAPH_POINTS
    ) {
      previousLength = histo.length;
      while (histo.length < GRAPH_POINTS) {
        histo.push(histo[histo.length - 1]);
      }
      graphs.push({
        label: label,
        data: buildGraph(histo, height, width),
        histo,
      });
    }
  });
  return graphs;
};

// Get the instrument graph raw data
export const getInstrumentGraph = async (
  instrument: AugmentedInstrument,
  periods: [string, number][],
  height: number,
  width: number,
): Promise<GraphDataWrapper[]> => {
  const graphs: GraphDataWrapper[] = [];
  const fullHisto: DataPoints = (await getQuoteDailyHistory(instrument)).map(
    h => {
      return [h.c, h.t /*- h.t % (24 * 60 * 60)*/];
    },
  );
  let previousLength: number = -1;
  periods.forEach(p => {
    const label = p[0];
    const months = p[1];
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - months * 30);
    let histo =
      fullHisto.filter(h => {
        const dh = new Date(h[1] * 1000);
        return dh > fromDate;
      }) || [];
    // Si les données sont > GRAPH POINTS, on passe en hebdo
    if (histo.length > GRAPH_POINTS) {
      histo = histo.filter((h, i) => {
        const dh = new Date(h[1] * 1000);
        return dh.getDay() == 5 || i == histo.length - 1;
      });
    }
    if (histo.length !== previousLength || histo.length == GRAPH_POINTS) {
      previousLength = histo.length;
      while (histo.length < GRAPH_POINTS) {
        histo.push(histo[histo.length - 1]);
      }
      graphs.push({
        label: label,
        data: buildGraph(histo, height, width),
        histo,
      });
    }
  });
  return graphs;
};

// Convert a list of datapoints to a SVG path
export const buildGraph = (
  datapoints: DataPoints,
  graphHeight: number,
  graphWidth: number,
): GraphData => {
  datapoints = datapoints.filter(d => !isNaN(d[0]) && !isNaN(d[1]));
  const prices = datapoints.map(value => value[0]);
  const dates = datapoints.map(value => value[1]);
  const scaleX = scaleLinear()
    .domain([Math.min(...dates), Math.max(...dates)])
    .range([0, graphWidth]);
  const minPrice = Math.min(...prices);
  const minDate = dates[prices.findIndex(p => p === minPrice)];
  const maxPrice = Math.max(...prices);
  const maxDate = dates[prices.findIndex(p => p === maxPrice)];
  const scaleY = scaleLinear()
    .domain([minPrice, maxPrice])
    .range([graphHeight, 0]);
  return {
    min: {
      price: minPrice,
      date: minDate,
      x: scaleX(minDate) as number,
    },
    max: {
      price: maxPrice,
      date: maxDate,
      x: scaleX(maxDate) as number,
    },
    path: parse(
      shape
        .line()
        .x(([, x]) => scaleX(x) as number)
        .y(([y]) => scaleY(y) as number)
        .curve(shape.curveLinear)(datapoints) as string,
    ),
  };
};
