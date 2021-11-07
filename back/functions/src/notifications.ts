import { Status, ALERT_DIRECTION, ALERT_STATUSES, AlertWrapper, Instrument } from "./model";
import * as dao from './dao';
import { messaging } from 'firebase-admin';

async function notify(alert: AlertWrapper, instrument: Instrument) {
    const tokens = await dao.getUserFCMToken(alert.data.author_id);

    const payload: messaging.MessagingPayload = {
        data: {
            isin: instrument.isin,
            uid: alert.uid,
            type: 'ALERT'
        },
        notification: {
            title: `🔔 ${instrument.sy} : alerte à ${alert.data.value}€ 🔔`,
            body: `L'alerte positionnée sur ${instrument.na} a été déclenchée.`
        }
    }

    await messaging().sendToDevice(tokens, payload);
}

export async function process(status: Status, target: dao.Target): Promise<Status> {
    // Init Status si besoin 
    if (!status.alertTriggered) status.alertTriggered = 0;

    const instruments = await dao.getInstruments(target);
    const alertConfs = await dao.getAlertConfs(target);

    // On récupère toutes les dernières alertes (VS timestamp)
    const newAlerts = await dao.getNewAlerts(target);
    console.info(`${target} : ${newAlerts.length} news alerts to register`)

    // On parcours la liste et update min et max
    for (const na of newAlerts) {
        // On recherche dans la conf
        let conf = alertConfs.find(a => a.isin === na.data.isin);
        // Si conf pas présente, on l'ajoute
        if (!conf) {
            conf = { down: 0, up: 99999, isin: na.data.isin }
            alertConfs.push(conf);
        }
        // On update le min/max
        if (na.data.direction === ALERT_DIRECTION.DOWN && na.data.value > conf.down) {
            conf.down = na.data.value;
        }
        if (na.data.direction === ALERT_DIRECTION.UP && na.data.value < conf.up) {
            conf.up = na.data.value;
        }
        // On met à jour l'alerte pour ne pas la traiter deux fois
        na.data.status = ALERT_STATUSES.REGISTERED;
        await dao.updateAlert(na, target);
    }

    const confToRemove: string[] = [];

    // Pour la liste des confs 
    for (const conf of alertConfs) {
        // Récupération de l'instrument
        const instrument = instruments.find(ins => ins.isin === conf.isin);
        let trigger = false;
        if (instrument && instrument.li && instrument.li.h && instrument.li.l) {
            // Vérification s'il y a déclenchement
            trigger = instrument.li.h >= conf.up || instrument.li.l <= conf.down;
        }
        // Si pas de déclenchement, on passe à la conf suivante
        if (!trigger || !instrument) continue;

        // On récupère les valeurs concernées
        const triggeredAlerts = await dao.getTriggeredAlerts(instrument, target);

        for (const alertToSend of triggeredAlerts) {
            // On incremente nos stats
            status.alertTriggered = status.alertTriggered + 1;

            // Envoie des notifications
            await notify(alertToSend, instrument);
            console.info('Notify', alertToSend.data.author_id, alertToSend.data.isin, instrument.na)

            // Mise à jour des alertes
            alertToSend.data.status = ALERT_STATUSES.TRIGGERED;
            alertToSend.data.triggeredAt = (+(new Date()) / 1000);
            await dao.updateAlert(alertToSend, target);
        }

        // Recalcule pour l'instrument concerné
        const { up, down, empty } = await dao.getAlertConfUpDown(conf, target);
        if (empty) {
            // Supprimer si plus aucune valeur lui est rattachée
            confToRemove.push(conf.isin)
        } else {
            // Update de la conf
            conf.up = up;
            conf.down = down;
        }
    }

    // Nettoyage des conf inutilisées
    const filteredConf = alertConfs.filter(a => confToRemove.findIndex(c => c === a.isin) === -1);

    // Mise à jour en DB
    await dao.updateAlertConfs(filteredConf, target)
    console.info(`${target} : Notification process done ! ${status.alertTriggered} alerts sent.`)
    return status;
}