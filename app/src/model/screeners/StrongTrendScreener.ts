import {getPositionInfo, PositionInfo} from '../../utils/PortfolioTools';
import {
  Instrument,
  Screener,
  ScreenerSortItem,
  ScreenerSortOrder,
} from '../model';

class StrongTrendScreener implements Screener {
  name: string = 'Longues tendances';
  defaultSortItem: ScreenerSortItem = 'duration';
  defaultSortOrder: ScreenerSortOrder = 1;

  filter = (instruments: Instrument[]): PositionInfo[] => {
    return instruments
      .map(p => getPositionInfo(p, null))
      .filter(p => {
        if (p.ins.li && p.ins.li.last && p.ins.in.bd && p.ins.in.bp) {
          return (
            p.ins.in.p &&
            p.ins.in.bd &&
            +new Date() / 1000 - p.ins.in.bd > 3600 * 24 * 30 &&
            p.ins.trendSpeed &&
            p.ins.trendSpeed > 20
          );
        }
        return false;
      });
  };
}

export default StrongTrendScreener;
