import { bonusMult, DamageType, MeleeAttack, SpecialAttack, Swing, Target, Weapon } from "chivalry2-weapons";
import { Range } from "./types";

type GenerateMetricValue = (w: Weapon, t: Target, numTargets: number, horsebackDamageMult: number) => number;

export class NewMetric {
  id: string;
  label: string;
  unit: Unit;
  generate: GenerateMetricValue;

  constructor(id: string, label: string, unit: Unit, generate: GenerateMetricValue) {
    this.id = id;
    this.label = label;
    this.unit = unit;
    this.generate = generate;
  }

  getMinMax(weapons: Weapon[], t: Target, numTargets: number, horsebackDamageMult: number): Range {
    let values = weapons.map(w => this.generate(w, t, numTargets, horsebackDamageMult));
    let min = Math.min(...values);
    let max = Math.max(...values);
    return {min: min, max: max};
  }
}

function generateCommonMetricsForAttack(idPrefix: string, label: string, cleave: (w: Weapon) => boolean, getAttack: (w: Weapon) => MeleeAttack | SpecialAttack): NewMetric[] {

  return [
    new NewMetric(idPrefix + "d", `${label} - Damage`, Unit.DAMAGE, (w, t, numTargets, horsebackDamageMult) => horsebackDamageMult * bonusMult(numTargets, t, w.damageType, cleave(w)) * getAttack(w).damage),
    new NewMetric(idPrefix + "w", `${label} - Windup`, Unit.INVERSE_SPEED, (w) => getAttack(w).windup),
    new NewMetric(idPrefix + "rl", `${label} - Release`, Unit.SPEED, (w) => getAttack(w).release),
    new NewMetric(idPrefix + "rc",`${label} - Recovery`, Unit.INVERSE_SPEED, (w) => getAttack(w).recovery),
    new NewMetric(idPrefix + "c", `${label} - Combo`, Unit.INVERSE_SPEED, (w) => getAttack(w).combo),
    new NewMetric(idPrefix + "h", `${label} - Holding`, Unit.INVERSE_SPEED, (w) => getAttack(w).holding),
  ];
}

function generateRangeMetrics(idPrefix: string, label: string, getSwing: (w: Weapon) => Swing) {
  return [
    new NewMetric(idPrefix + "r", `${label} - Range`, Unit.RANGE, w => getSwing(w).range),
    new NewMetric(idPrefix + "ar", `${label} - AltRange`, Unit.RANGE, w => getSwing(w).altRange),
  ];
}

function damageTypeLightCleave(dt: DamageType) {
  return dt == DamageType.CHOP || dt == DamageType.CUT;
}

export const METRICS: NewMetric[] = [
  ...generateCommonMetricsForAttack("al", "Average (Light)", w => w.attacks.average.light.cleaveOverride || damageTypeLightCleave(w.damageType), w => w.attacks.average.light),
  ...generateCommonMetricsForAttack("ah", "Average (Heavy)", w => w.attacks.average.heavy.cleaveOverride || true, w => w.attacks.average.heavy),
  ...generateRangeMetrics("a", "Average", w => w.attacks.average),

  ...generateCommonMetricsForAttack("sl", "Slash (Light)", w => w.attacks.slash.light.cleaveOverride || damageTypeLightCleave(w.damageType), w => w.attacks.slash.light),
  ...generateCommonMetricsForAttack("sh", "Slash (Heavy)", w => w.attacks.slash.heavy.cleaveOverride || true, w => w.attacks.slash.heavy),
  ...generateRangeMetrics("s", "Slash", w => w.attacks.slash),

  ...generateCommonMetricsForAttack("ol", "Overhead (Light)", w => w.attacks.overhead.light.cleaveOverride || damageTypeLightCleave(w.damageType), w => w.attacks.overhead.light),
  ...generateCommonMetricsForAttack("oh", "Overhead (Heavy)", w => w.attacks.overhead.heavy.cleaveOverride || true, w => w.attacks.overhead.heavy),
  ...generateRangeMetrics("o", "Overhead", w => w.attacks.overhead),

  ...generateCommonMetricsForAttack("stl", "Stab (Light)", w => w.attacks.stab.light.cleaveOverride || damageTypeLightCleave(w.damageType), w => w.attacks.stab.light),
  ...generateCommonMetricsForAttack("sth", "Stab (Heavy)", w => w.attacks.stab.heavy.cleaveOverride || true, w => w.attacks.stab.heavy),
  ...generateRangeMetrics("st", "Stab", w => w.attacks.stab),

  ...generateCommonMetricsForAttack("sp", "Special", _ => false, w => w.attacks.special),
  ...generateCommonMetricsForAttack("la", "Leaping Strike", _ => false, w => w.attacks.sprintAttack),
  ...generateCommonMetricsForAttack("sc", "Sprint Charge", _ => false, w => w.attacks.sprintCharge),
  ...generateCommonMetricsForAttack("t", "Throw", _ => false, w => w.attacks.throw),
];

export const METRIC_MAP = new Map<string, NewMetric>();
METRICS.forEach(m => METRIC_MAP.set(m.id, m));

let acc: string[] = []
METRICS.map(m => m.id).forEach((cur) => {
  if(acc.indexOf(cur) == -1) {
    acc.push(cur);
  } else {
    throw new Error(`Duplicate metric id: ${cur}`);
  }
})

// Metric Groups share the same units (damage/hitpoints, milliseconds, etc.)
// and are used to determine consistent min/max scales for normalization across categories
export enum Unit {
  INDEX = "Index",
  SPEED = "Milliseconds",
  INVERSE_SPEED = "-Milliseconds",
  RANGE = "Jeoffreys",
  DAMAGE = "Hitpoints",
  RANK = "Rank"
}