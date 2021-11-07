import {getPositionInfo, PositionInfo} from '../../utils/PortfolioTools';
import {
  Instrument,
  Screener,
  ScreenerSortItem,
  ScreenerSortOrder,
} from '../model';

class YoungTrendScreener implements Screener {
  name: string = 'Jeunes tendances';
  defaultSortItem: ScreenerSortItem = 'perf';
  defaultSortOrder: ScreenerSortOrder = -1;

  filter = (instruments: Instrument[]): PositionInfo[] => {
    return instruments
      .map(p => getPositionInfo(p, null))
      .filter(p => {
        if (
          p.ins.li &&
          p.ins.li.last &&
          p.ins.in.bd &&
          p.ins.in.bp &&
          p.ins.in.bk
        ) {
          return (
            p.ins.in.p &&
            +new Date() / 1000 - p.ins.in.bd < 3600 * 24 * 7 &&
            p.ins.trendSpeed &&
            p.ins.trendSpeed >= 0
          );
        }
        return false;
      });
  };
}

export default YoungTrendScreener;
