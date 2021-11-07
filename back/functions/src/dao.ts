import * as functions from 'firebase-functions';
import { Status, Instrument, BoAQuotes, Quote, DaOQuotes, UserConf, UserConfWrapper, InstrumentAlertConf, Alert, ALERT_STATUSES, AlertWrapper, ALERT_DIRECTION } from './model';
import { firestore } from 'firebase-admin';
const puppeteer = require('puppeteer');

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

export type Target = 'current' | 'crypto';
export type ConfTarget = 'userconfs' | 'usercryptoconfs';

export function getEpoch(): number {
    return Math.floor(+(new Date()) / 1000)
}

export async function allWithLimit(taskList: Promise<any>[], limit = 5) {
    const iterator = taskList.entries();
    const results = new Array(taskList.length);
    const workerThreads = new Array(limit).fill(0).map(() =>
        new Promise(async (resolve, reject) => {
            try {
                let entry = iterator.next();
                while (!entry.done) {
                    const [index, promise] = entry.value;
                    try {
                        results[index] = await promise;
                        entry = iterator.next();
                    }
                    catch (err) {
                        results[index] = err;
                    }
                }
                // No more work to do
                resolve(true);
            }
            catch (err) {
                // This worker is dead
                reject(err);
            }
        }));

    await Promise.all(workerThreads);
    return results;
};

export async function getBoAStatus(target: Target): Promise<Status> {
    return new Promise((resolve, reject) => {
        admin.firestore().collection('status')
            .doc(target).get()
            .then(async (snapshot: firestore.QueryDocumentSnapshot) => {
                let status: Status = <Status>snapshot.data();
                if (!status) {
                    status = {
                        action: 'indexing',
                        accountNumber: "",
                        token: { access_token: "" },
                        botlimit: 0,
                    };
                    await createBoAStatus(status, target);
                }
                resolve(status);
            })
    });
}

async function createBoAStatus(status: Status, target: Target) {
    return new Promise((resolve, reject) => {
        admin.firestore().collection('status')
            .doc(target).create(status)
            .then(() => {
                resolve(status);
            })
    });
}

export async function saveBoAStatus(status: Status, target: Target) {
    return new Promise((resolve, reject) => {
        admin.firestore().collection('status')
            .doc(target).update(status)
            .then(() => {
                resolve(true);
            })
    });
}

export async function getInstruments(target: Target): Promise<Instrument[]> {
    return new Promise((resolve, reject) => {
        admin.firestore().collection('instruments')
            .doc(target).get()
            .then(async (snapshot: firestore.QueryDocumentSnapshot) => {
                let inst: Instrument[] = [];
                if (!snapshot.data()) {
                    await createInstruments(target);
                }
                else inst = <Instrument[]>snapshot.data().d;

                resolve(inst);
            })
    });
}

async function createInstruments(target: Target) {
    return new Promise((resolve, reject) => {
        admin.firestore().collection('instruments')
            .doc(target).create({ d: [] })
            .then(() => {
                resolve([]);
            })
    });
}


export async function getAlertConfs(target: Target): Promise<InstrumentAlertConf[]> {
    return new Promise((resolve, reject) => {
        admin.firestore().collection('alertconfs')
            .doc(target).get()
            .then(async (snapshot: firestore.QueryDocumentSnapshot) => {
                let inst: InstrumentAlertConf[] = [];
                if (!snapshot.data()) {
                    await createAlertConfs(target);
                }
                else inst = <InstrumentAlertConf[]>snapshot.data().d;

                resolve(inst);
            })
    });
}

async function createAlertConfs(target: Target) {
    return new Promise((resolve, reject) => {
        admin.firestore().collection('alertconfs')
            .doc(target).create({ d: [] })
            .then(() => {
                resolve([]);
            })
    });
}

export async function updateAlertConfs(alertConfs: InstrumentAlertConf[], target: Target) {
    await firestore().collection('alertconfs').doc(target).update({ d: alertConfs });
}

function getAlertCollection(target: Target): string {
    if (target === 'crypto') return 'alertscrypto';
    if (target === 'current') return 'alerts';
    return 'NA';
}

export async function getNewAlerts(target: Target): Promise<AlertWrapper[]> {
    return new Promise((resolve, reject) => {
        admin.firestore()
            .collection(getAlertCollection(target))
            .where('status', '==', ALERT_STATUSES.CREATED)
            .get()
            .then(async (snapshot: firestore.QuerySnapshot) => {
                if (snapshot.empty) {
                    resolve([])
                }
                resolve(snapshot.docs.map(d => {
                    return {
                        uid: d.id,
                        data: <Alert>d.data()
                    }
                }));
            })
    });
}

export async function getTriggeredAlerts(instrument: Instrument, target: Target): Promise<AlertWrapper[]> {
    let alerts: AlertWrapper[] = [];

    if (!instrument || !instrument.li || !instrument.li.h || !instrument.li.l) {
        return [];
    }

    const up: firestore.QuerySnapshot = await firestore()
        .collection(getAlertCollection(target))
        .where('isin', '==', instrument.isin)
        .where('status', '==', ALERT_STATUSES.REGISTERED)
        .where('direction', '==', ALERT_DIRECTION.UP)
        .where('value', '<=', instrument.li.h)
        .get();
    const down: firestore.QuerySnapshot = await firestore()
        .collection(getAlertCollection(target))
        .where('isin', '==', instrument.isin)
        .where('status', '==', ALERT_STATUSES.REGISTERED)
        .where('direction', '==', ALERT_DIRECTION.DOWN)
        .where('value', '>=', instrument.li.l)
        .get();

    if (!up.empty) {
        alerts = alerts.concat(up.docs.map(d => ({ uid: d.id, data: <Alert>d.data() })))
    }
    if (!down.empty) {
        alerts = alerts.concat(down.docs.map(d => ({ uid: d.id, data: <Alert>d.data() })))
    }
    return alerts;
}

export async function getUserFCMToken(uid: string): Promise<string[]> {
    let tokens: string[] = [];
    const result: firestore.DocumentSnapshot = await firestore().collection('fcmtokens').doc(uid).get()

    const data = result.data();
    if (result.exists && data) {
        tokens = <string[]>data.d;
    }
    return tokens;
}

export async function getAlertConfUpDown(conf: InstrumentAlertConf, target: Target): Promise<{ up: number, down: number, empty: boolean }> {
    const updown = { up: 999999, down: 0, empty: true };

    const up: firestore.QuerySnapshot = await firestore()
        .collection(getAlertCollection(target))
        .where('isin', '==', conf.isin)
        .where('status', '==', ALERT_STATUSES.REGISTERED)
        .where('direction', '==', ALERT_DIRECTION.UP)
        .orderBy('value')
        .limit(1).get();

    const down: firestore.QuerySnapshot = await firestore()
        .collection(getAlertCollection(target))
        .where('isin', '==', conf.isin)
        .where('status', '==', ALERT_STATUSES.REGISTERED)
        .where('direction', '==', ALERT_DIRECTION.DOWN)
        .orderBy('value', 'desc')
        .limit(1).get();

    if (!up.empty) {
        updown.up = (<Alert>up.docs[0].data()).value;
        updown.empty = false;
    }
    if (!down.empty) {
        updown.down = (<Alert>down.docs[0].data()).value;
        updown.empty = false;
    }

    return updown;
}

export async function updateAlert(alert: AlertWrapper, target: Target): Promise<boolean> {
    await admin.firestore()
        .collection(getAlertCollection(target))
        .doc(alert.uid)
        .update(alert.data);
    return true;
}

export async function updateAlerts(alerts: AlertWrapper[], target: Target): Promise<boolean> {
    for (const conf of alerts) {
        await admin.firestore()
            .collection(getAlertCollection(target))
            .doc(conf.uid)
            .update(conf.data);
    }
    return true;
}


// Users configuration
export async function getUserConf(userId: String, target: ConfTarget): Promise<UserConf> {
    return new Promise((resolve, reject) => {
        admin.firestore().collection(target)
            .doc(userId).get()
            .then(async (snapshot: firestore.QueryDocumentSnapshot) => {
                if (snapshot.data()) {
                    resolve(<UserConf>snapshot.data());
                } else {
                    reject();
                }
            })
    });
}

export async function getUserConfs(target: ConfTarget): Promise<firestore.QueryDocumentSnapshot<firestore.DocumentData>[]> {
    return new Promise((resolve, reject) => {
        admin.firestore().collection(target)
            .get()
            .then((snapshot: firestore.QuerySnapshot) => {
                if (snapshot.empty) {
                    resolve([])
                }
                resolve(snapshot.docs);
            })
    });
}

export async function updateUserConf(userconf: UserConfWrapper, target: ConfTarget): Promise<boolean> {
    await admin.firestore()
        .collection(target)
        .doc(userconf.uid)
        .update(userconf.data);
    return true;
}

export async function updateInstrumentsIds(instruments: Instrument[], target: Target) {
    const instrumentsSaved = await getInstruments(target);
    for (const i of instruments) {
        const index = instrumentsSaved.findIndex(is => is.isin === i.isin);
        if (index === -1) instrumentsSaved.push({
            ...i,
            li: {
                t: 0
            },
            in: {
                t: 0,
                p: false
            }
        });
        else {
            instrumentsSaved[index] = {
                ...instrumentsSaved[index],
                ...i
            };
        }
    }
    return new Promise((resolve, reject) => {
        admin.firestore().collection('instruments')
            .doc(target).update({ d: instrumentsSaved })
            .then(() => {
                resolve(true);
            })
    });
}

export async function removeCryptoInst() {
    await admin.firestore().collection('instruments')
        .doc('crypto')
        .delete()
}

export async function saveInstruments() {
    const instrumentsSaved = await getInstruments("current");
    return new Promise((resolve, reject) => {
        admin.firestore().collection('instruments')
            .doc('save-' + getEpoch())
            .create({ d: instrumentsSaved })
            .then(() => {
                resolve([]);
            })
    });
}

export async function replace() {
    admin.firestore().collection('instruments')
        .doc('save-1631304491').get()
        .then(async (snapshot: firestore.QueryDocumentSnapshot) => {
            const data = snapshot.data();
            admin.firestore().collection('instruments')
                .doc('current')
                .update(data)
        })
}

export async function getInstruments2updateQuotes(lastUpdateLimit: number, target: Target): Promise<Instrument[]> {
    const instrumentsSaved = await getInstruments(target);
    const t = getEpoch();

    return instrumentsSaved
        .sort((a, b) => a.li && b.li ? a.li.t - b.li.t : 0)
        .filter(a => !a.li || t - a.li.t > lastUpdateLimit)
        .filter(a => a.ty !== 'investmentFund')
        .filter(a => a.id !== 'EURONEXTFUND');
}

export async function getRemainingInstruments2updateQuotes(lastUpdateLimit: number): Promise<Instrument[]> {
    const instrumentsSaved = await getInstruments("current");
    const t = getEpoch();

    return instrumentsSaved
        .filter(a => a.ty === 'investmentFund')
        .filter(a => !a.li || t - a.li.t > lastUpdateLimit)
        .sort((a, b) => a.li && b.li ? a.li.t - b.li.t : 0);
}


export async function getInstruments2updateSpec(lastUpdateLimit: number): Promise<Instrument[]> {
    const instrumentsSaved = await getInstruments("current");
    const t = getEpoch();

    return instrumentsSaved
        .sort((a, b) => a.li && b.li ? a.li.t - b.li.t : 0)
        .filter(a => !a.li || t - a.li.t > lastUpdateLimit)
        .filter(a => a.ty !== 'investmentFund')
        .filter(a => a.id === 'EURONEXTFUND');
}

export async function updateInstrumentsQuotes(quotes: BoAQuotes[], target: Target): Promise<Instrument[]> {
    const instrumentsSaved: Instrument[] = await getInstruments(target);
    for (const q of quotes) {
        const index = instrumentsSaved.findIndex(is => is.id === q.id);
        if (index === -1) console.log('wtf?');
        else {
            delete q.id;
            const ins = instrumentsSaved[index];

            if (!q.c && ins.li && ins.li.c) q.c = ins.li.c;
            ins.li = Object.assign({ t: getEpoch() }, q);
        }
    }
    await updateInstrumentsIds(instrumentsSaved, target);
    return instrumentsSaved;
}

export async function getInstruments2updateIndicator(limit: number, target: Target) {
    const instrumentsSaved = await getInstruments(target);
    return instrumentsSaved
        .sort((a, b) => a.in && b.in ? a.in.t - b.in.t : 0)
        .filter(a => !a.li || !a.in || a.li.t > a.in.t)
        .filter(a => a.id !== 'EURONEXTFUND')
        .slice(0, limit);
}

export async function getQuotes(instrument: Instrument, period: string): Promise<Quote[]> {
    return new Promise((resolve, reject) => {
        admin.firestore().collection(period)
            .doc(instrument.isin).get()
            .then(async (snapshot: firestore.QueryDocumentSnapshot) => {
                let quotes: Quote[] = [];
                if (!snapshot.data()) {
                    await createQuoteWrapper(instrument, period);
                }
                else quotes = <Quote[]>snapshot.data().d;
                resolve(quotes);
            })
    });
}

async function createQuoteWrapper(instrument: Instrument, period: string) {
    return new Promise((resolve, reject) => {
        admin.firestore().collection(period)
            .doc(instrument.isin).create(<DaOQuotes>{
                d: [],
                t: +(new Date('2015-01-01T00:00:00Z'))
            })
            .then(() => {
                resolve([]);
            })
    });
}

export function getLastHistoQuoteTime(currentQuotes: Quote[], weekly: boolean): number {
    if (!currentQuotes.length) {
        if (weekly) return +(new Date('2015-01-01T00:00:00Z')) / 1000;
        const date = new Date();
        date.setFullYear(date.getFullYear() - 2);
        return +(date) / 1000;
    }
    return currentQuotes.sort((a, b) => b.t - a.t)[0].t;
}

export async function updateInstrumentsHistory(
    instrument: Instrument,
    quotes: Quote[],
    weekly: boolean): Promise<Quote[]> {
    return new Promise((resolve, reject) => {
        if (!instrument.isin) {
            console.log('Instrument without ISIN', instrument)
            resolve([]);
            return;
        }
        if (quotes.length == 0) {
            console.log('No quotes !!', instrument.sy, instrument.isin)
            resolve([]);
            return;
        }

        admin.firestore().collection(weekly ? 'weekly' : 'daily')
            .doc(instrument.isin).set({ d: quotes, t: getEpoch() }, { merge: true })
            .then(() => {
                resolve(quotes);
            })
    });
}

export async function fallbackEuronext(code: String): Promise<BoAQuotes> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://live.euronext.com/fr/product/equities/" + code, { waitUntil: 'networkidle0' });
    const last = await page.$eval('#header-instrument-price', (el: any) => el.textContent);
    const open = await page.$eval('#detailed-quote tr:nth-child(0n+4) td:nth-child(0n+2)', (el: any) => el.textContent);
    const high = await page.$eval('#detailed-quote tr:nth-child(0n+5) td:nth-child(0n+2)', (el: any) => el.textContent);
    const low = await page.$eval('#detailed-quote tr:nth-child(0n+6) td:nth-child(0n+2)', (el: any) => el.textContent);
    const close = await page.$eval('#detailed-quote tr:nth-child(0n+8) td:nth-child(0n+2)', (el: any) => el.textContent);
    const vol = await page.$eval('#detailed-quote tr:nth-child(0n+1) td:nth-child(0n+2)', (el: any) => el.textContent);
    const t = await page.$eval('#detailed-quote tr:nth-child(0n+1) td:nth-child(0n+3)', (el: any) => el.textContent);

    const clean = (x: String) => parseFloat(x.replace(/\s/g, '').replace(/€/g, '').replace(/,/g, '.'))
    const parts = t.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
    const tt = Date.UTC(+parts[3], parts[2] - 1, +parts[1], +parts[4], +parts[5]);

    await browser.close();
    return {
        "o": clean(open),
        "c": clean(close),
        "l": clean(low),
        "h": clean(high),
        "v": clean(vol),
        "last": clean(last),
        "lt": (+tt) / 1000
    }
}


export async function fallbackFundEuronext(name: String): Promise<BoAQuotes> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://funds360.euronext.com/opcvm/fiche/" + name, { waitUntil: 'networkidle0' });
    const last = await page.$eval('#lastVL', (el: any) => el.textContent);
    const t = await page.$eval('#lastUpdate > strong', (el: any) => el.textContent);

    const clean = (x: String) => parseFloat(x.replace(/\s/g, '').replace(/€/g, '').replace(/EUR/g, '').replace(/,/g, '.'))
    const parts = t.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const tt = Date.UTC(+parts[3], parts[2] - 1, +parts[1]);
    await browser.close();

    return {
        "o": clean(last),
        "c": clean(last),
        "l": clean(last),
        "h": clean(last),
        "v": clean(last),
        "last": clean(last),
        "lt": (+tt) / 1000
    }
}

export async function fallbackFundEuronext2(name: String): Promise<BoAQuotes> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://live.euronext.com/fr/product/equities/" + name, { waitUntil: 'networkidle0' });
    const last = await page.$eval('#lastVL', (el: any) => el.textContent);
    const t = await page.$eval('#lastUpdate > strong', (el: any) => el.textContent);

    const clean = (x: String) => parseFloat(x.replace(/\s/g, '').replace(/€/g, '').replace(/EUR/g, '').replace(/,/g, '.'))
    const parts = t.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const tt = Date.UTC(+parts[3], parts[2] - 1, +parts[1]);
    await browser.close();

    return {
        "o": clean(last),
        "c": clean(last),
        "l": clean(last),
        "h": clean(last),
        "v": clean(last),
        "last": clean(last),
        "lt": (+tt) / 1000
    }
}