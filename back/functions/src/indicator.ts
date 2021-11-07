import { Status, Quote, IndPos, Instrument, Gap } from "./model";
import * as eod from './eodapi';
import * as dao from './dao';
import tfind from './indicators/tfind002';

function sma(period: number, quotes: Quote[]): number | null {
    if (quotes.length < period) return null;
    return quotes
        .slice(quotes.length - period)
        .map(q => q.c)
        .reduce((a: number, b: number) => a + b);
}

function playIndicator(instrument: Instrument, quotes: Quote[], dailyQuotes: Quote[], indpos: IndPos): IndPos {
    // Continue indicator from last timestamp
    let i = quotes.findIndex(q => q.t >= indpos.t);
    //console.log(indpos.t, 'starts from', i, 'on', quotes.length);
    //if( i === -1 ) return indpos;
    for (; i < quotes.length; i++) {
        const q = quotes[i];
        const quotesToUse = quotes.slice(0, i + 1);
        const ind = tfind.getIndications(quotesToUse, indpos);

        if (!ind) continue;

        if (q.c >= ind.upper && !indpos.p) {
            const buyPrice = q.o > ind.upper ? q.o : ind.upper;
            indpos.p = true;
            indpos.bd = q.t;
            indpos.bp = buyPrice;
            indpos.st = Math.max(buyPrice * .85, q.l * 0.95);
            indpos.bk = -1;
        } else if (q.l < ind.lower && indpos.p) {
            const sellPrice = q.o < ind.lower ? q.o : ind.lower;
            indpos.p = false;
            indpos.bd = q.t;
            indpos.bp = sellPrice;
            indpos.st = ind.lower;
            indpos.bk = ind.upper;
        } else if (indpos.p) {
            indpos.st = ind.lower;
        } else if (!indpos.p) {
            indpos.bk = ind.upper;
        }
    }
    if (quotes.length >= 2) {
        // Add generic informations
        indpos.av = quotes[quotes.length - 2].v / 5;
        indpos.hi = [
            // -1w 
            quotes[quotes.length - (1 + 1)].c,
            // -2w 
            quotes.length > 2 ? quotes[quotes.length - (2 + 1)].c : null,
            // -4w 1m 
            quotes.length > 4 ? quotes[quotes.length - (4 + 1)].c : null,
            // -13w 3m 
            quotes.length > 13 ? quotes[quotes.length - (13 + 1)].c : null,
            // -26w 6m 
            quotes.length > 26 ? quotes[quotes.length - (26 + 1)].c : null,
            // 52w 1a 
            quotes.length > 52 ? quotes[quotes.length - (52 + 1)].c : null,
            // 104w 2a 
            quotes.length > 104 ? quotes[quotes.length - (104 + 1)].c : null,
            // 260w 5a 
            quotes.length > 260 ? quotes[quotes.length - (260 + 1)].c : null,
            // Current Week Open 
            quotes[quotes.length - 1].o
        ]
    }

    // Add gaps
    if (instrument && instrument.li && instrument.li.last) {
        const last = instrument.li.last;
        const gaps: Gap[] = [];
        let min = 99999999;
        let max = 0;
        // TOHLCV
        const rqts = dailyQuotes.slice().reverse();
        rqts.forEach((q, iii) => {
            if (iii) {
                const n = rqts[iii - 1];
                // la valeur précédente à un cmax < nmin et cmax < min
                if (q.h < n.l && q.h < min) { gaps.push({ t: q.t, fr: q.h, to: min }) }
                // Ou la valeur précédente à un cmin > nmax et cmin > max
                if (q.l > n.h && q.l > max) { gaps.push({ t: q.t, fr: q.l, to: max }) }
            }
            max = Math.max(max, q.h)
            min = Math.min(min, q.l)
        })

        indpos.gb = gaps
            .filter(g => g.to < last)
            .sort((a, b) => last - a.to)
            .shift() || null;
        indpos.gt = gaps
            .filter(g => g.to > last)
            .sort((a, b) => a.to - last)
            .shift() || null;
    }

    // Add moving average
    indpos.m = [
        sma(6, dailyQuotes),
        sma(19, dailyQuotes),
        sma(49, dailyQuotes),
        sma(99, dailyQuotes),
        sma(199, dailyQuotes),
    ]

    return indpos;
}

async function updateDailyQuotes(instrument: Instrument): Promise<Quote[]> {
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 2);

    const quotes: Quote[] = await eod.getInstrumentHistory(
        instrument,
        fromDate.toISOString(),
        'oneDay'
    );
    // Update data
    const allQuotes = await dao.updateInstrumentsHistory(
        instrument,
        quotes.sort((a, b) => a.t - b.t),
        false
    );
    return allQuotes;
}

async function updateWeeklyQuotes(instrument: Instrument): Promise<Quote[]> {
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 5);

    const quotes: Quote[] = await eod.getInstrumentHistory(
        instrument,
        fromDate.toISOString(),
        'oneWeek'
    );
    // Update data
    const allQuotes = await dao.updateInstrumentsHistory(
        instrument,
        quotes.sort((a, b) => a.t - b.t),
        true
    );
    return allQuotes;
}

async function updateInstrumentQuoteAndIndicator(instrument: Instrument): Promise<Instrument> {
    const dailyQuotes = await updateDailyQuotes(instrument);
    const weeklyQuotes = await updateWeeklyQuotes(instrument);
    // Indicator code goes here :p
    if (instrument.in) {
        const t = dao.getEpoch();
        if (weeklyQuotes.length && dailyQuotes.length) {
            instrument.in = playIndicator(instrument, weeklyQuotes, dailyQuotes, instrument.in)
        }
        instrument.in.t = t;
    } else {
        instrument.in = { t: 0, p: false }
    }
    return instrument;
}

export function playInd(instrument: Instrument, quotes: Quote[], dailyQuotes: Quote[], indpos: IndPos): IndPos {
    return playIndicator(instrument, quotes, dailyQuotes, indpos);
}

export async function process(status: Status, target: dao.Target): Promise<Status> {
    console.log(`${target} : Start/Continue refresh Indicator...`)
    const apiCallLimit = 400;
    const begin = dao.getEpoch();

    const inst2update = await dao.getInstruments2updateIndicator(apiCallLimit, target);
    console.log(`${target} : ${inst2update.length} elements to update`);
    if (!inst2update.length) return status;

    // let proms:Promise<Instrument>[] = [];
    const inss: Instrument[] = [];
    for (const ins of inst2update) {
        const ins2 = await updateInstrumentQuoteAndIndicator(ins)
        inss.push(ins2);
        // proms.push(updateInstrumentQuoteAndIndicator(ins));
    }
    // console.log(`${(proms.length)} tasks`)
    // const results = await dao.allWithLimit(proms, 1)
    //console.log(inss.length);
    await dao.updateInstrumentsIds(inss, target);

    const end = dao.getEpoch();
    console.log(`${target} : Done in ${(end - begin)} seconds`)

    return status;
}