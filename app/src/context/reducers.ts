import {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {AlertWrapper, UserConf} from '../model/model';
import type {ActionMap} from './context';

export enum Types {
  SignIn = 'SIGN_IN',
  SignOut = 'SIGN_OUT',
  UpdateConf = 'UPDATE_CONF',
  ClearConf = 'CLEAR_CONF',
  UpdateMode = 'UPDATE_MODE',
  UpdateLiveInstruments = 'UPDATE_LIVE_INSTRUMENTS',
  AlertUpdated = 'ALERT_UPDATED',
}

export type Mode = 'pea' | 'crypto';
export type Currency = '€' | '$';

// Auth state definition
export type AuthType = {
  user: FirebaseAuthTypes.User | null;
  conf: UserConf | null;
  isPro: boolean;
  alerts: AlertWrapper[];
  mode: Mode;
  currency: Currency;
};

// Auth state initial value
export const authInitialState: AuthType = {
  user: null,
  conf: null,
  isPro: false,
  alerts: [],
  mode: 'pea',
  currency: '€',
};

// Auth state available dispatch methods
type AuthPayload = {
  [Types.SignIn]: {
    user: FirebaseAuthTypes.User;
    conf: UserConf;
  };
  [Types.SignOut]: {};
  [Types.ClearConf]: {};
  [Types.UpdateConf]: {
    conf: UserConf | null;
  };
  [Types.UpdateMode]: {
    mode: Mode;
  };
  [Types.AlertUpdated]: {
    alerts: AlertWrapper[];
  };
};
export type AuthActions = ActionMap<AuthPayload>[keyof ActionMap<AuthPayload>];

// ... finally, auth reducer !
export const authReducer = (
  state: AuthType,
  action: AuthActions | InstrumentsActions,
): AuthType => {
  switch (action.type) {
    case Types.UpdateConf:
      return Object.assign({}, state, {
        conf: {...state.conf, ...action.payload.conf},
      });
    case Types.UpdateMode:
      return Object.assign({}, state, {
        mode: action.payload.mode,
        currency: action.payload.mode === 'pea' ? '€' : '$',
      });
    case Types.SignIn:
      return Object.assign({}, state, {
        user: action.payload.user,
        conf: action.payload.conf,
      });
    case Types.ClearConf:
      return Object.assign({}, state, {
        conf: null,
      });
    case Types.SignOut:
      return Object.assign({}, state, {
        user: null,
      });
    case Types.AlertUpdated:
      return Object.assign({}, state, {
        alerts: action.payload.alerts,
      });
    default:
      return state;
  }
};

// Instruments state definition
export type InstrumentsType = {
  livelist: any[];
  lastReload: number;
};
// Instruments state initial value
export const instrumentsInitialState: InstrumentsType = {
  livelist: [],
  lastReload: 0,
};
// Instrument action
type InstrumentsPayload = {
  [Types.UpdateLiveInstruments]: {
    instruments: any[];
  };
};
export type InstrumentsActions = ActionMap<InstrumentsPayload>[keyof ActionMap<InstrumentsPayload>];

// ... and Instrument reducer
export const instrumentsReducer = (
  state: InstrumentsType,
  action: AuthActions | InstrumentsActions,
) => {
  switch (action.type) {
    case Types.UpdateLiveInstruments:
      return Object.assign({}, state, {
        livelist: action.payload.instruments,
      });
    default:
      return state;
  }
};
