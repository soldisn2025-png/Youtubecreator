import { PgBoss } from "pg-boss";
import { requiredEnv } from "@/lib/config";

let boss: PgBoss | undefined;
let started = false;

export function getBoss() {
  boss ??= new PgBoss({ connectionString: requiredEnv("DATABASE_URL") });
  return boss;
}

export async function ensureBossStarted() {
  const instance = getBoss();
  if (!started) {
    await instance.start();
    started = true;
  }
  return instance;
}
