
export interface Token {
    access_token: string;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
    expires_in?: number;
    createdAt?: number;
}

export interface Status {
    action: string;
    accountNumber: string;
    token: Token;
    botlimit: number;
    indexation?: {
        offset: number
    },
    alertTriggered?: number
}

export interface BoAConfig {
    authURL: string;
    apiURL: string;
    clientID: string;
    clientSecret: string;
    username: string;
    password: string;
    accountNumber?: string;
}

export interface EoDConfig {
    apiURL: string;
    token: string;
}

export interface Instrument {
    id: string;
    na: string;
    sy: string;
    isin: string;
    ty: string;
    mk: string;
    pd: number;
    li?: {
        t: number;
        o?: number;
        c?: number;
        l?: number;
        h?: number;
        v?: number;
        last?: number;
        lt?: number;
    },
    in: IndPos;
}

export interface IndPos {
    t: number;
    p: boolean;
    bd?: number;
    bp?: number;
    st?: number;
    bk?: number;
    av?: number;
    hi?: (number | null)[]; // [-1w, -2w, -4w 1m, -13w 3m, -26w 6m, 52w 1a, 104w 2a, 260w 5a]
    gb?: (Gap | null); // Bottom gap
    gt?: (Gap | null); // Top gap
    m?: (number | null)[]; // [m7, M20, m50, m100, m200]
}

export interface Gap {
    t: number;
    fr: number;
    to: number;
}

export interface IndResult {
    t: number;
    upper: number;
    middle: number;
    lower: number;
}

export interface InstStep {
    instruments: Instrument[];
    next: any;
}


export interface DaOQuotes {
    d: Quote[];
    t: number;
}

export interface Quote {
    o: number;
    c: number;
    l: number;
    h: number;
    v: number;
    t: number;
}

export interface BoAQuotes {
    id?: string;
    o: number;
    c: number;
    l: number;
    h: number;
    v: number;
    last: number;
    lt: number;
}

export interface Position {
    quantity: number;
    stop: number;
    value: number;
    isin: string;
}

export interface PortfolioHistoryItem {
    pos: number;
    cash: number;
    ic: number;
    t: number;
}

export interface UserConfWrapper {
    uid: string;
    data: UserConf;
}

export interface UserConf {
    positions: Position[];
    experience: number;
    view: {
        darkmode: string;
        theme: string;
    }
    initialCapital: number;
    cash: number;
    termsAccepted: boolean;
    history: PortfolioHistoryItem[];
    proEoT: number;
}

export const ALERT_STATUSES = {
    CREATED: 1, // Créée mais non prise en compte
    REGISTERED: 2, // alert ajoutée au processus
    TRIGGERED: 3, // Déclanchée par le processus
    CANCELLED: 99, // Annulée pour x ou y raison
}

export const ALERT_DIRECTION = {
    UP: 1,
    DOWN: 2,
}

export interface Alert {
    isin: string;
    type: 'STOP' | 'ALERT';
    author_id: string;
    value: number;
    direction: number;
    status: number;
    createdAt: number;
    triggeredAt: number;
}

export interface AlertWrapper {
    uid: string;
    data: Alert;
}

export interface InstrumentAlertConf {
    isin: string;
    up: number;
    down: number;
}