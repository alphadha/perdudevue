import type { CaseDef, Ctx } from "./types";
import { runP01 } from "./cases/p01";
import { runP02 } from "./cases/p02";
import { runP03 } from "./cases/p03";
import { runP04 } from "./cases/p04";
import { runP05 } from "./cases/p05";
import { runP06 } from "./cases/p06";
import { runP07 } from "./cases/p07";
import { runP08 } from "./cases/p08";
import { runP09 } from "./cases/p09";
import { runP10 } from "./cases/p10";
import { runP11 } from "./cases/p11";
import { runP12 } from "./cases/p12";
import { runP13 } from "./cases/p13";
import { runP14 } from "./cases/p14";

const runners: Record<string, (c: CaseDef, ctx: Ctx) => Promise<void>> = {
  P01: runP01,
  P02: runP02,
  P03: runP03,
  P04: runP04,
  P05: runP05,
  P06: runP06,
  P07: runP07,
  P08: runP08,
  P09: runP09,
  P10: runP10,
  P11: runP11,
  P12: runP12,
  P13: runP13,
  P14: runP14,
};

export async function executeCase(c: CaseDef, ctx: Ctx): Promise<void> {
  const prefix = c.id.slice(0, 3); // P01
  const runner = runners[prefix];
  if (!runner) {
    throw new Error(`Pas de runner Playwright pour ${c.id} (${c.parcours})`);
  }
  await runner(c, ctx);
}
