import { IndPos, Quote, IndResult } from "../model";

function sma(period: number, prices: number[]) {
    return getLastItems(prices, period).reduce((a:number,b:number) => a + b) / period
  }
  
function getLastItems(array:any[], number: number) {
    return array.slice(array.length-number);
}

export default {
    getIndications: (rawQuotes: Quote[], position: IndPos) : IndResult | undefined => {
        const maPeriod = 33;
        const buyMASlope = 0;
        const usedPeriod = maPeriod;
    
        if(rawQuotes.length < usedPeriod) return undefined;
    
        // Build simple indicators from X latest quotes
        const quotes = getLastItems(rawQuotes, usedPeriod);
    
        // TOHLCV
        const highs = quotes.map(d => d.h);
        const lows = quotes.map(d => d.l);
        const closes = quotes.map(d => d.c);
        // MA
        const lma = sma(maPeriod, closes);
        const highs20 = getLastItems(highs, 10)
        const lows20 = getLastItems(lows, 10)
        // LMA
        const middle = sma(Math.round(maPeriod/2), closes);

        // High / Low
        const highest = Math.max.apply(Math, highs20);
        const lowest = Math.min.apply(Math, lows20);

        const sumCloses = closes.slice(1).reduce((a,b) => a+b);

        const buylma = lma*buyMASlope/100 + lma;
        const buyPrice = (buylma * maPeriod) - sumCloses;
    
        // no position
        let upper = Math.max(highest, buyPrice);
        if( position.bk) upper = Math.min(position.bk, upper);
        let lower = lowest;
        
        // in position
        if( position.p && position.st !== undefined) {
            upper = highest;
            lower = Math.max(position.st * 1.005, lowest*0.85);
        }

        return {
            t: quotes[quotes.length-1][0], 
            upper,
            middle, 
            lower
        };
    }
}
    