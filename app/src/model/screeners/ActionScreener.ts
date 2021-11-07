import {getPositionInfo, PositionInfo} from '../../utils/PortfolioTools';
import {
  Instrument,
  Screener,
  ScreenerSortItem,
  ScreenerSortOrder,
} from '../model';

class ActionScreener implements Screener {
  name: string = 'Volumes importants';
  defaultSortItem: ScreenerSortItem = 'volevol';
  defaultSortOrder: ScreenerSortOrder = -1;

  filter = (instruments: Instrument[]): PositionInfo[] => {
    return instruments
      .map(p => getPositionInfo(p, null))
      .filter(p => {
        if (
          p.ins.li &&
          p.ins.li.last &&
          p.ins.li.v &&
          p.ins.in.av &&
          p.ins.in.bp &&
          p.ins.in.bk
        ) {
          return (
            p.ins.li.v > p.ins.in.av * 3 && p.ins.in.av * p.ins.li.last > 20000
          );
        }
        return false;
      });
  };
}

export default ActionScreener;
