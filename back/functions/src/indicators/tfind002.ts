import { IndPos, Quote, IndResult } from "../model";

function sma(period: number, prices: number[]): number {
    return getLastItems(prices, period).reduce((a:number,b:number) => a + b) / period
}
  
function getLastItems(array:any[], number: number) {
    return array.slice(array.length-number);
}

export default {
    getIndications: (rawQuotes: Quote[], position: IndPos) : IndResult | undefined => {
        const maPeriod = 30;
        const breakoutPeriod = 8;
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
        const lastHighs = getLastItems(highs, breakoutPeriod)
        const lastLows = getLastItems(lows, breakoutPeriod)
        // LMA
        const middle = sma(Math.round(maPeriod/2), closes);

        // High / Low
        const highest = Math.max.apply(Math, lastHighs);
        const lowest = Math.min.apply(Math, lastLows);

        // Determine the reverse price with ma
        const sumCloses = closes.slice(1).reduce((a,b) => a+b);
        const buylma = lma*buyMASlope/100 + lma;
        const buyPrice = (buylma * maPeriod) - sumCloses;
    
        // No position
        let upper = Math.max(highest, buyPrice);
        if( position.bk) upper = Math.min(position.bk*0.997, upper);
        let lower = lowest;
        
        // In position
        if( position.p && position.st !== undefined) {
            upper = highest;
            // Increase stop on fridays only
            const stopFactor = new Date(quotes[quotes.length-1][0]*1000).getDay() === 5 ? 1.004 : 1;
            lower = Math.max(position.st * stopFactor, lowest*0.85);
        }

        return {
            t: quotes[quotes.length-1][0], 
            upper,
            middle, 
            lower
        };
    }
}
    