import { Instrument, UserConf } from "./model";
import * as dao from './dao';

export async function processUserConf(data: UserConf, instruments: Instrument[], endOfWeek: number): Promise<UserConf> {
	let totalPos = 0;

	data.positions.forEach(pos => {
		const ins = instruments.find(inst => inst.isin === pos.isin);
		if (ins && ins.li && ins?.li.last) {
			totalPos += pos.quantity * ins?.li?.last;
		}
	})

	if (!data.history) data.history = [];

	data.history.push({
		cash: data.cash,
		pos: totalPos,
		ic: data.initialCapital,
		t: dao.getEpoch()
	});

	// Clean history
	data.history = data.history.filter(h => {
		// 1825:365
		const dStart = new Date();
		dStart.setDate(dStart.getDate() - 365);
		const dLimit = new Date();
		dLimit.setDate(dLimit.getDate() - 1825);
		const dh = new Date(h.t * 1000);
		// Date > -30j et pas un vendredi, sinon, pas plus d'un an.
		return (dh > dStart || dh.getDay() === endOfWeek) && dh > dLimit;
	})

	// Remove NaN in history
	for (const [i, h] of data.history.entries()) {
		if (isNaN(h.cash)) {
			if (data.history[i - 1] && data.history[i - 1].cash) {
				h.cash = data.history[i - 1].cash;
			}
			else {
				h.cash = 0;
			}
		}
	}
	// Remove NaN in cash
	if (isNaN(data.cash) && data.history.length >= 1) {
		data.cash = data.history[data.history.length - 1].cash;
	}

	return data;
}