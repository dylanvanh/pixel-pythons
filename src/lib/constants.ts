import { env } from "@/env";

export const DUST_LIMIT = 546;

export const DEFAULT_FEE_RATE = 1;
export const DEFAULT_POSTAGE = DUST_LIMIT;

export const PARENT_INSCRIPTION_ID = env.NEXT_PUBLIC_PARENT_INSCRIPTION_ID;

export function getOracleTaprootAddress() {
  return env.ORACLE_TAPROOT_ADDRESS;
}
