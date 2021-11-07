import * as functions from "firebase-functions";

import * as dao from "./dao";
import * as live from "./live";
import * as indicator from "./indicator";
import * as notifications from "./notifications";
import { Status, UserConf } from "./model";
import { firestore } from "firebase-admin";
import { processUserConf } from "./users";

function ghm(hours: number, minutes: number) {
  return hours * 60 + minutes;
}

function getCurrentAction(hm: number): string {
  if (hm >= ghm(9, 0) && hm < ghm(18, 20)) return "live";
  if (hm >= ghm(18, 20) && hm < ghm(23, 0)) return "indicator";
  if (hm >= ghm(23, 0) && hm < ghm(23, 30)) return "remaining";
  return "";
}

async function forceReset(status: Status) {
  console.log("FORCE RESET OF INDICATOR !!!");
  const instruments = await dao.getInstruments("current");
  for (const ins of instruments) {
    ins.in.t = 0;
  }
  await dao.updateInstrumentsIds(instruments, "current");
  console.log(`FORCE RESET : ${instruments.length} instruments updated`);
  await indicator.process(status, "current");
  console.log(`FORCE RESET : indicator proceed`);
}

export const peamoni = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .region("europe-west1")
  .pubsub.schedule("*/12 9-23 * * 1-5")
  .timeZone("Europe/Paris")
  .onRun(async (context) => {
    //export const peamoni = functions.https.onRequest(async (request, response) => {
    try {
      const h = parseInt(
        new Date()
          .toLocaleString("fr-FR", {
            hour: "2-digit",
            hour12: false,
            timeZone: "Europe/Paris",
          })
          .split(" ")[0]
      );
      const hm: number = ghm(h, new Date().getMinutes());
      let status = await dao.getBoAStatus("current");

      // If we need to force reset indicator
      if (status.action === "forcereset") {
        await forceReset(status);
      }

      // Check hours to change status
      status.action = getCurrentAction(hm);
      console.info(`Start action '${status.action}' at hm ${h}`);

      // What do we do now ?
      // live, indicator, ...
      if (status.action === "live") {
        status = await live.monitoring(status, "current");
        status = await notifications.process(status, "current");
      }
      if (status.action === "indicator") {
        status = await indicator.process(status, "current");
      }

      await dao.saveBoAStatus(status, "current");
      console.info(`Finish action ${status.action}`);
      //response.send(JSON.stringify(status, null, 2));
    } catch (e) {
      console.error(e);
    }
    return null;
  });

export const cryptomoni = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .region("europe-west1")
  .pubsub.schedule("*/20 * * * *")
  //.timeZone('Europe/Paris')
  .onRun(async (context) => {
    //export const peamoni = functions.https.onRequest(async (request, response) => {
    try {
      const h = parseInt(
        new Date()
          .toLocaleString("fr-FR", { hour: "2-digit", hour12: false })
          .split(" ")[0]
      );
      const hm: number = ghm(h, new Date().getMinutes());
      let status = await dao.getBoAStatus("crypto");

      // Check hours to change status
      console.info(`Start crypto process at hm ${h}:${hm}`);

      // What do we do now ?
      // live, indicator, ...
      if (status.action !== "maintenance") {
        status = await live.monitoring(status, "crypto");
        // Process notifications
        status = await notifications.process(status, "crypto");
        if (hm >= ghm(0, 10) && hm < ghm(2, 0)) {
          status = await indicator.process(status, "crypto");
        }
        await dao.saveBoAStatus(status, "crypto");
      }
      console.info(`Finish action ${status.action}`);
    } catch (e) {
      console.error(e);
    }
    return null;
  });

export const userhistory = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .region("europe-west1")
  .pubsub.schedule("45 23 * * 1-5")
  .timeZone("Europe/Paris")
  .onRun(async (context) => {
    const target: dao.ConfTarget = "userconfs";
    //export const users = functions.https.onRequest(async (request, response) => {
    const userconfs: firestore.QueryDocumentSnapshot<firestore.DocumentData>[] =
      await dao.getUserConfs(target);
    const instruments = await dao.getInstruments("current");

    for (const conf of userconfs) {
      try {
        // Process the user conf
        const data = await processUserConf(
          <UserConf>conf.data(),
          instruments,
          5
        );
        // Update the conf
        await dao.updateUserConf({ data: data, uid: conf.id }, target);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

export const usercryptohistory = functions
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .region("europe-west1")
  .pubsub.schedule("15 0 * * *")
  .timeZone("Europe/London")
  .onRun(async (context) => {
    const target: dao.ConfTarget = "usercryptoconfs";
    //export const users = functions.https.onRequest(async (request, response) => {
    const userconfs: firestore.QueryDocumentSnapshot<firestore.DocumentData>[] =
      await dao.getUserConfs(target);
    const instruments = await dao.getInstruments("crypto");

    for (const conf of userconfs) {
      try {
        // Process the user conf
        const data = await processUserConf(
          <UserConf>conf.data(),
          instruments,
          7
        );
        // Update the conf
        await dao.updateUserConf({ data: data, uid: conf.id }, target);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });
