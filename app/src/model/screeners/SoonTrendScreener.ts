import {getPositionInfo, PositionInfo} from '../../utils/PortfolioTools';
import {
  Instrument,
  Screener,
  ScreenerSortItem,
  ScreenerSortOrder,
} from '../model';

class SoonTrendScreener implements Screener {
  name: string = 'Retournement proche';
  defaultSortItem: ScreenerSortItem = 'proximity';
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
            !p.ins.in.p &&
            p.ins.reversePercent &&
            p.ins.reversePercent > -3 &&
            p.ins.li.last < p.ins.in.bk
          );
        }
        return false;
      });
  };
}

export default SoonTrendScreener;
