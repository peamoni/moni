import { Status, BoAQuotes } from "./model";
import * as eod from "./eodapi";
import * as dao from "./dao";

export async function monitoring(
  status: Status,
  target: dao.Target
): Promise<Status> {
  console.log(`${target} : Start/Continue live monitoring...`);

  let quotes: BoAQuotes[] = [];
  const inst2update = await dao.getInstruments2updateQuotes(120, target);
  const proms: Promise<BoAQuotes[]>[] = [];
  while (inst2update.length) {
    proms.push(eod.getInstrumentQuotes(inst2update.splice(0, 20)));
  }
  console.log(`${target} : ${proms.length} tasks`);
  const results = await dao.allWithLimit(proms, 5);
  results.map((x) => {
    quotes = quotes.concat(x);
  });

  console.log(`Live ${target} monitoring found ${quotes.length}`);

  await dao.updateInstrumentsQuotes(quotes, target);
  return status;
}
