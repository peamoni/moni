const request = require("request");
import * as model from "./model";

const config: model.EoDConfig = {
  apiURL: "https://eodhistoricaldata.com/api",
  token: "set your eod token here",
};

const mapSymbol = (i: model.Instrument): String => {
  if (i.id.indexOf(".") !== -1) return i.id;
  const eodCode =
    i.ty === "index"
      ? "INDX"
      : i.mk === "ETFP"
      ? "PA"
      : i.mk === "MTAA"
      ? "MI"
      : i.mk === "TNLB"
      ? "PA"
      : i.mk === "XAIM"
      ? "MI"
      : i.mk === "XAMS"
      ? "AS"
      : i.mk === "XBRU"
      ? "BR"
      : i.mk === "XDUB"
      ? "IR"
      : i.mk === "XETR"
      ? "XETRA"
      : i.mk === "XHEL"
      ? "HE"
      : i.mk === "XLIS"
      ? "LS"
      : i.mk === "XLON"
      ? "LSE"
      : i.mk === "XLUX"
      ? "LU"
      : i.mk === "XMAD"
      ? "MC"
      : i.mk === "XPAR"
      ? "PA"
      : i.mk === "XWBO"
      ? "VI"
      : "NA";
  return i.sy + "." + eodCode;
};

export async function getInstrumentQuotes(
  instruments: model.Instrument[]
): Promise<model.BoAQuotes[]> {
  return new Promise((resolve, reject) => {
    const ids = instruments.map((x) => mapSymbol(x));
    const firstId = ids.shift();
    const params: any = {
      api_token: config.token,
      fmt: "json",
    };
    if (ids.length) {
      params.s = ids.join(",");
    }
    const options = {
      method: "GET",
      url: `${config.apiURL}/real-time/${firstId}`,
      qs: params,
      headers: {
        "Content-Type": "application/json",
      },
    };

    request(options, function (error: any, response: any, body: string) {
      if (error) reject(error);
      let result = null;
      try {
        result = JSON.parse(body);
      } catch (error) {
        console.log(error, body);
        resolve([]);
      }
      // For unique quote request
      if (!Array.isArray(result) && instruments.length === 1) result = [result];
      if (result && result.length) {
        resolve(
          result
            .filter(
              (q: any) => q.previousClose !== "NA" && q.previousClose !== 0
            )
            .map((q: any) => {
              const symbol = q.code.split(".")[0];
              const ins = instruments.find(
                (i) => i.id === q.code || i.sy === symbol
              );

              return {
                id: ins?.id,
                o: q.open,
                c: q.previousClose,
                l: q.low,
                h: q.high,
                v: q.volume,
                last: q.close !== "NA" ? q.close : q.previousClose,
                lt: q.timestamp !== "NA" ? q.timestamp : 0,
              };
            })
        );
      } else {
        console.error("Error while fetching quotes", result);
        resolve([]);
      }
    });
  });
}

export async function getAllCrypto(): Promise<model.Instrument[]> {
  return new Promise((resolve, reject) => {
    const params: any = {
      api_token: config.token,
      fmt: "json",
    };
    const options = {
      method: "GET",
      url: `${config.apiURL}/exchange-symbol-list/CC`,
      qs: params,
      headers: {
        "Content-Type": "application/json",
      },
    };

    request(options, function (error: any, response: any, body: string) {
      if (error) reject(error);
      const result = JSON.parse(body);
      if (result && result.length) {
        resolve(
          result.map((q: any) => {
            const symbol = q.Code.split("-")[0];
            return {
              id: q.Code + ".CC",
              isin: symbol,
              sy: symbol,
              na: q.Name,
              in: { t: 0, p: false },
              mk: "CC",
              pd: 8,
              ty: "Crypto",
              li: { t: 0 },
            } as model.Instrument;
          })
        );
      } else {
        console.error("Error while fetching quotes", result);
        resolve([]);
      }
    });
  });
}

export async function searchInstrument(word: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const params: any = {
      api_token: config.token,
      fmt: "json",
    };
    const options = {
      method: "GET",
      url: `${config.apiURL}/search/${word}`,
      qs: params,
      headers: {
        "Content-Type": "application/json",
      },
    };

    request(options, function (error: any, response: any, body: string) {
      if (error) reject(error);
      const result = JSON.parse(body);
      if (result && result.length) {
        resolve(result[0].Code + "." + result[0].Exchange);
      } else {
        console.error("Error while fetching quotes", result);
        resolve("");
      }
    });
  });
}

export async function getInstrumentHistory(
  ins: model.Instrument,
  fromDate: string,
  interval: string
): Promise<model.Quote[]> {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      url: `${config.apiURL}/eod/${mapSymbol(ins)}`,
      qs: {
        from: fromDate,
        period: interval === "oneDay" ? "d" : "w",
        api_token: config.token,
        fmt: "json",
      },
      headers: {
        "Content-Type": "application/json",
      },
    };

    request(options, function (error: any, response: any, body: string) {
      if (error) reject(error);

      let result = null;
      try {
        result = JSON.parse(body);
      } catch (error) {
        console.log("histo fail on ", ins.sy, ins.na);
        resolve([]);
        return;
      }
      if (result && result.length) {
        resolve(
          result.map((h: any) => {
            if (h.close !== h.adjusted_close) {
              return {
                t: +new Date(h.date) / 1000,
                o:
                  Math.round(((h.open * h.adjusted_close) / h.close) * 1e4) /
                  1e4,
                c: h.adjusted_close,
                h:
                  Math.round(((h.high * h.adjusted_close) / h.close) * 1e4) /
                  1e4,
                l:
                  Math.round(((h.low * h.adjusted_close) / h.close) * 1e4) /
                  1e4,
                v: h.volume,
              };
            }
            return {
              t: +new Date(h.date) / 1000,
              o: h.open,
              c: h.close,
              h: h.high,
              l: h.low,
              v: h.volume,
            };
          })
        );
      } else {
        console.error(`Error while fetching quotes for id ${ins.id}`, result);
        resolve([]);
      }
    });
  });
}

export async function getintraday(
  ticker: string,
  from: number,
  to: number,
  interval: string = "1h"
): Promise<model.Quote[]> {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      url: `${config.apiURL}/intraday/${ticker}`,
      qs: {
        from,
        to,
        interval,
        api_token: config.token,
        fmt: "json",
      },
      headers: {
        "Content-Type": "application/json",
      },
    };

    request(options, function (error: any, response: any, body: string) {
      if (error) reject(error);

      let result = null;
      try {
        result = JSON.parse(body);
      } catch (error) {
        console.log("intraday fail on ", ticker);
        resolve([]);
        return;
      }
      if (result && result.length) {
        resolve(
          result.map((h: any) => {
            return {
              t: +new Date(h.date) / 1000,
              o: h.open,
              c: h.close,
              h: h.high,
              l: h.low,
              v: h.volume,
            };
          })
        );
      } else {
        console.error(`Error while fetching quotes for id ${ticker}`, result);
        resolve([]);
      }
    });
  });
}
