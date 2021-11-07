import Bugsnag from '@bugsnag/react-native';
import {FirebaseAuthTypes} from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {Dispatch} from 'react';
import {
  AuthActions,
  InstrumentsActions,
  Mode,
  Types,
} from '../context/reducers';
import {
  Instrument,
  UserConf,
  Quote,
  Position,
  Alert,
  AlertWrapper,
} from '../model/model';
import {AugmentedInstrument} from '../utils/PortfolioTools';

/* dao methods to directly interract with firestore */

function getConfCollectionName(mode: Mode): string {
  if (mode === 'crypto') {
    return 'usercryptoconfs';
  }
  if (mode === 'pea') {
    return 'userconfs';
  }
  return 'oups';
}

function getInstrumentsCollectionName(mode: Mode): string {
  if (mode === 'crypto') {
    return 'crypto';
  }
  if (mode === 'pea') {
    return 'current';
  }
  return 'oups';
}

// User conf methods
export async function getUserConf(
  user: FirebaseAuthTypes.User,
  dispatch: Dispatch<AuthActions | InstrumentsActions>,
  dispatchInfo: boolean = true,
  mode: Mode,
): Promise<UserConf> {
  const userConf = await firestore()
    .collection(getConfCollectionName(mode))
    .doc(user.uid)
    .get();
  const conf = userConf.data() as UserConf;
  if (dispatchInfo) {
    dispatch({
      type: Types.SignIn,
      payload: {user, conf},
    });
  }
  return conf;
}
export async function createUserConf(
  user: FirebaseAuthTypes.User,
  conf: UserConf,
  mode: Mode,
) {
  return firestore()
    .collection(getConfCollectionName(mode))
    .doc(user.uid)
    .set(conf);
}
export async function updateUserConf(
  user: FirebaseAuthTypes.User,
  conf: UserConf,
  dispatch: Dispatch<AuthActions | InstrumentsActions>,
  checkConfExists: boolean = true,
  mode: Mode,
) {
  if (checkConfExists && !(await getUserConf(user, dispatch, false, mode))) {
    await createUserConf(user, conf, mode);
  } else {
    delete (conf as any).conf;
    try {
      await firestore().runTransaction(async t => {
        const ref = firestore()
          .collection(getConfCollectionName(mode))
          .doc(user.uid);
        await t.update(ref, conf);
      });
    } catch (e) {
      Bugsnag.notify('Transaction failure');
    }
  }
  dispatch({
    type: Types.UpdateConf,
    payload: {
      conf,
    },
  });
}

// Positions methods
export async function updatePosition(
  user: FirebaseAuthTypes.User,
  conf: UserConf,
  dispatch: Dispatch<AuthActions | InstrumentsActions>,
  position: Position,
  addCash: number,
  mode: Mode,
) {
  let positions = conf.positions;
  if (!positions) {
    positions = [];
  }
  // Si c'est une suppression
  if (position.quantity === 0) {
    positions = positions.filter(p => p.isin != position.isin);
  } else {
    const index = positions.findIndex(p => p.isin === position.isin);
    if (index != -1) {
      positions[index] = position;
    } else {
      positions.push(position);
    }
  }
  const newconf: UserConf = {
    positions,
    cash: (conf.cash || 0) + addCash,
  };
  await updateUserConf(user, newconf, dispatch, false, mode);
}

// Live data methods
export async function getLive(
  dispatch: Dispatch<AuthActions | InstrumentsActions>,
  conf: UserConf,
  mode: Mode,
) {
  const instData = await firestore()
    .collection('instruments')
    .doc(getInstrumentsCollectionName(mode))
    .get();

  const document = instData.data();
  if (!document) {
    return [];
  }

  const t = +new Date() / 1000;
  const instruments = document.d
    .filter((i: Instrument) => {
      if (i.ty === 'Crypto') {
        return true;
      }

      // Pas d'affichage des index -> todo, mettre dans une autre liste
      if (i.ty === 'index') {
        return false;
      }

      // déjà en portefeuille, pas de filtrage
      if (conf.positions && conf.positions.find(p => p.isin === i.isin)) {
        return true;
      }

      // filtre Tracker
      if (!conf.displayETF && i.ty === 'tracker') {
        return false;
      }
      // filtre fonds
      if (!conf.displayFund && i.ty === 'investmentFund') {
        return false;
      }
      if (i.li && i.li.lt && i.in && i.in.av && i.li.last && i.in.bk) {
        // filtre action
        if (!conf.displayNoQuotes && t - i.li.lt > 7 * 24 * 3600) {
          return false;
        }
        // filtre volume min
        if (
          conf.minimumVolume &&
          i.li &&
          i.in &&
          i.in.av * i.li.last < conf.minimumVolume
        ) {
          return false;
        }
        // filtre volume max
        if (
          conf.maximumVolume &&
          i.li &&
          i.in &&
          i.in.av * i.li.last > conf.maximumVolume
        ) {
          return false;
        }
        // filtre value min
        if (conf.minimumValue && i.li && i.li.last < conf.minimumValue) {
          return false;
        }
        // filtre value max
        if (conf.maximumValue && i.li && i.li.last > conf.maximumValue) {
          return false;
        }
        // filtre sur les valeurs bearish
        if (conf.hideBearish && i.in && !i.in.p) {
          if (((i.li.last - i.in.bk) / i.in.bk) * 100 < -5) {
            return false;
          }
        }
      }

      return true;
    })
    .sort((a: Instrument, b: Instrument) => a.na.localeCompare(b.na));
  dispatch({
    type: Types.UpdateLiveInstruments,
    payload: {instruments},
  });
}

// Daily and weekly Quotes
export async function getQuoteDailyHistory(instrument: AugmentedInstrument) {
  const snapshot = await firestore()
    .collection('daily')
    .doc(instrument.isin)
    .get();
  const document = snapshot.data();

  if (!document || !instrument.li?.t) {
    return [];
  }

  const quotes: Quote[] = document.d.sort((a: Quote, b: Quote) => a.t - b.t);

  // Add current value to graph
  let lastQuote = quotes[quotes.length - 1];
  // Si on est le même jour
  const lastQuoteDate = new Date(lastQuote.t);
  const currentQuoteDate = new Date(instrument.li.t * 1000);
  const isSameDay =
    lastQuoteDate.getDate() === currentQuoteDate.getDate() &&
    lastQuoteDate.getMonth() === currentQuoteDate.getMonth() &&
    lastQuoteDate.getFullYear() === currentQuoteDate.getFullYear();

  if (
    !isSameDay &&
    instrument.li.o &&
    instrument.li.c &&
    instrument.li.h &&
    instrument.li.l &&
    instrument.li.v
  ) {
    quotes.push({
      c: instrument.li.c,
      h: instrument.li.h,
      l: instrument.li.l,
      o: instrument.li.o,
      t: instrument.li.t,
      v: instrument.li.v,
    });
  } else if (
    instrument.ty === 'Crypto' &&
    instrument.li.h &&
    instrument.li.l &&
    instrument.li.v &&
    instrument.li.last
  ) {
    quotes[quotes.length - 1] = {
      t: instrument.li.t * 1000,
      o: lastQuote.o,
      h: lastQuote.h > instrument.li.h ? lastQuote.h : instrument.li.h,
      l: lastQuote.l < instrument.li.l ? lastQuote.l : instrument.li.l,
      c: instrument.li.last,
      v: lastQuote.v + instrument.li.v,
    };
  }
  return quotes;
}

// FCM Tokens updates
interface UserTokens {
  d: string[];
}
export async function updateFCMToken(uid: string, token: string) {
  const dbUserTokens = await firestore().collection('fcmtokens').doc(uid).get();
  if (!dbUserTokens.exists) {
    await firestore()
      .collection('fcmtokens')
      .doc(uid)
      .set({
        d: [token],
      } as UserTokens);
  } else {
    const tokens = dbUserTokens.data() as UserTokens;
    if (tokens.d.indexOf(token) === -1) {
      // On update que si le token est absent
      tokens.d.push(token);
      await firestore().collection('fcmtokens').doc(uid).update(tokens);
    }
  }
}

// Alert methods
export async function createNewAlert(
  alert: Alert,
  user: FirebaseAuthTypes.User,
  dispatch: Dispatch<AuthActions | InstrumentsActions>,
) {
  await firestore().collection('alerts').add(alert);
  await getAlerts(user, dispatch);
}

export async function removeAlert(
  alert: AlertWrapper,
  user: FirebaseAuthTypes.User,
  dispatch: Dispatch<AuthActions | InstrumentsActions>,
) {
  await firestore().collection('alerts').doc(alert.uid).delete();
  await getAlerts(user, dispatch);
}

export async function getAlerts(
  user: FirebaseAuthTypes.User,
  dispatch: Dispatch<AuthActions | InstrumentsActions>,
) {
  const dbAlerts = await firestore()
    .collection('alerts')
    .where('author_id', '==', user.uid)
    .get();
  let alerts: AlertWrapper[] = [];
  if (!dbAlerts.empty) {
    alerts = dbAlerts.docs.map(d => ({uid: d.id, data: <Alert>d.data()}));
  }
  dispatch({
    type: Types.AlertUpdated,
    payload: {alerts},
  });
}
