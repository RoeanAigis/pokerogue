import BattleScene from "../battle-scene";
import { Species } from "./enums/species";
import { getPokemonSpecies, speciesStarters } from "./pokemon-species";
import { EggTier } from "./enums/egg-type";
import i18next from "../plugins/i18n";
import { getCookie, setCookie } from "#app/utils.js";

export const EGG_SEED = 1073741824;

export enum GachaType {
  MOVE,
  LEGENDARY,
  SHINY
}

export class Egg {
  public id: integer;
  public tier: EggTier;
  public gachaType: GachaType;
  public hatchWaves: integer;
  public timestamp: integer;

  constructor(id: integer, gachaType: GachaType, hatchWaves: integer, timestamp: integer) {
    this.id = id;
    this.tier = Math.floor(id / EGG_SEED);
    this.gachaType = gachaType;
    this.hatchWaves = hatchWaves;
    this.timestamp = timestamp;
  }

  isManaphyEgg(): boolean {
    return this.tier === EggTier.COMMON && !(this.id % 255);
  }

  getKey(): string {
    if (this.isManaphyEgg()) {
      return "manaphy";
    }
    return this.tier.toString();
  }
}

export function getEggTierDefaultHatchWaves(tier: EggTier): integer {
  switch (tier) { // REDUCED EGG HATCH CYCLES BY 50/60/70/80% OF TOTAL EGG CYCLES
  case EggTier.COMMON:
    return 5; //prev: 10
  case EggTier.GREAT:
    return 10; //prev: 25
  case EggTier.ULTRA:
    return 15; //prev: 50
  }
  return 20; //prev: 100
}

export function getEggDescriptor(egg: Egg): string {
  if (egg.isManaphyEgg()) {
    return "Manaphy";
  }
  switch (egg.tier) {
  case EggTier.GREAT:
    return i18next.t("egg:greatTier");
  case EggTier.ULTRA:
    return i18next.t("egg:ultraTier");
  case EggTier.MASTER:
    return i18next.t("egg:masterTier");
  default:
    return i18next.t("egg:defaultTier");
  }
}

export function getEggHatchWavesMessage(hatchWaves: integer): string {
  if (hatchWaves <= 5) {
    return i18next.t("egg:hatchWavesMessageSoon");
  }
  if (hatchWaves <= 15) {
    return i18next.t("egg:hatchWavesMessageClose");
  }
  if (hatchWaves <= 50) {
    return i18next.t("egg:hatchWavesMessageNotClose");
  }
  return i18next.t("egg:hatchWavesMessageLongTime");
}

export function getEggGachaTypeDescriptor(scene: BattleScene, egg: Egg): string {
  switch (egg.gachaType) {
  case GachaType.LEGENDARY:
    return `${i18next.t("egg:gachaTypeLegendary")} (${getPokemonSpecies(getLegendaryGachaSpeciesForTimestamp(scene, egg.timestamp)).getName()})`;
  case GachaType.MOVE:
    return i18next.t("egg:gachaTypeMove");
  case GachaType.SHINY:
    return i18next.t("egg:gachaTypeShiny");
  }
}

function getLegendaryGachaSpeciesForTimestampInternal(scene: BattleScene, timestamp: integer): Species {
  const legendarySpecies = Object.entries(speciesStarters)
    .filter(s => s[1] >= 8 && s[1] <= 9)
    .map(s => parseInt(s[0]))
    .filter(s => getPokemonSpecies(s).isObtainable());

  let ret: Species;

  // 86400000 is the number of miliseconds in one day
  const timeDate = new Date(timestamp);
  const dayTimestamp = timeDate.getTime(); // Timestamp of current week
  const offset = Math.floor(Math.floor(dayTimestamp / 86400000) / legendarySpecies.length); // Cycle number
  const index = Math.floor(dayTimestamp / 86400000) % legendarySpecies.length; // Index within cycle

  scene.executeWithSeedOffset(() => {
    ret = Phaser.Math.RND.shuffle(legendarySpecies)[index];
  }, offset, EGG_SEED.toString());

  // Only set the cookie if its not already defined.
  if(getCookie("legendaryGachaSpecies") === "" || getCookie("lastDay") !== timeDate.getDate().toString()) {
    setCookie("legendaryGachaSpecies", ret.toString());
    setCookie("lastDay", timeDate.getDate().toString());
  }

  return ret;  
}

// Roean: Allow for legendary override for challenges etc.
export function getLegendaryGachaSpeciesForTimestamp(scene: BattleScene, timestamp: integer): Species {
  
  // Initial Cache.
  getLegendaryGachaSpeciesForTimestampInternal(scene, timestamp);

  if(getCookie("legendaryGachaSpecies") !== getLegendaryGachaSpeciesForTimestampInternal(scene, timestamp).toString()) {
    return parseInt(getCookie("legendaryGachaSpecies"));
  }
  
  return getLegendaryGachaSpeciesForTimestampInternal(scene, timestamp);

}
