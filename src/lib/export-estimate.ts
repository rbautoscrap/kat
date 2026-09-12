/** Phase-1 destination estimates. Not live customs or carrier quotes. */

export type ImportStatus = "open" | "restricted" | "generally_closed";
export type SalvageRule = "usually" | "limited" | "no";

export type ExportCountry = {
  id: string;
  name: string;
  port: string;
  importStatus: ImportStatus;
  /** Null = no typical age ban in this first-pass table. */
  maxAgeYears: number | null;
  salvage: SalvageRule;
  dutyRate: number;
  vatRate: number;
  extraRate: number;
  freightUsd: number;
  inlandExportUsd: number;
  notes: string;
};

/** Lowest typical barrier first. Georgia = Gruzia. */
export const EXPORT_COUNTRIES: readonly ExportCountry[] = [
  {
    id: "ge",
    name: "Georgia",
    port: "Poti",
    importStatus: "open",
    maxAgeYears: null,
    salvage: "usually",
    dutyRate: 0,
    vatRate: 0.18,
    extraRate: 0.08,
    freightUsd: 1400,
    inlandExportUsd: 450,
    notes:
      "Common first market for Korean used and salvage cars. Extra line is a simplified excise estimate.",
  },
  {
    id: "kg",
    name: "Kyrgyzstan",
    port: "Bishkek via Caspian / Poti",
    importStatus: "open",
    maxAgeYears: null,
    salvage: "usually",
    dutyRate: 0.1,
    vatRate: 0.12,
    extraRate: 0.04,
    freightUsd: 1650,
    inlandExportUsd: 450,
    notes:
      "Often used as a regional hub. EAEU routing and recycling fees can change the final number.",
  },
  {
    id: "ae",
    name: "United Arab Emirates",
    port: "Jebel Ali",
    importStatus: "open",
    maxAgeYears: 10,
    salvage: "limited",
    dutyRate: 0.05,
    vatRate: 0.05,
    extraRate: 0,
    freightUsd: 1150,
    inlandExportUsd: 450,
    notes:
      "Duty is relatively low. Age and condition checks are the usual blocker, especially for salvage.",
  },
  {
    id: "jo",
    name: "Jordan",
    port: "Aqaba",
    importStatus: "restricted",
    maxAgeYears: 5,
    salvage: "limited",
    dutyRate: 0.15,
    vatRate: 0.16,
    extraRate: 0.05,
    freightUsd: 1300,
    inlandExportUsd: 450,
    notes:
      "Age limits are tighter than Georgia or Kyrgyzstan. Confirm engine and salvage rules before booking.",
  },
  {
    id: "pk",
    name: "Pakistan",
    port: "Karachi",
    importStatus: "restricted",
    maxAgeYears: 3,
    salvage: "no",
    dutyRate: 0.5,
    vatRate: 0.18,
    extraRate: 0.1,
    freightUsd: 1250,
    inlandExportUsd: 450,
    notes:
      "Commercial used-car import is tightly controlled. Personal schemes and regulatory duty often apply.",
  },
  {
    id: "ng",
    name: "Nigeria",
    port: "Lagos",
    importStatus: "restricted",
    maxAgeYears: 8,
    salvage: "limited",
    dutyRate: 0.35,
    vatRate: 0.075,
    extraRate: 0.15,
    freightUsd: 1850,
    inlandExportUsd: 450,
    notes:
      "Duty plus levy is high. Age policy has changed before — treat this as a planning range only.",
  },
  {
    id: "sy",
    name: "Syria",
    port: "Latakia",
    importStatus: "restricted",
    maxAgeYears: 10,
    salvage: "limited",
    dutyRate: 0.2,
    vatRate: 0,
    extraRate: 0,
    freightUsd: 1700,
    inlandExportUsd: 450,
    notes:
      "Insurance, banking, and routing are often harder than the tariff. Ask WhatsApp before planning a vessel.",
  },
  {
    id: "cl",
    name: "Chile",
    port: "San Antonio / Valparaíso",
    importStatus: "generally_closed",
    maxAgeYears: 0,
    salvage: "no",
    dutyRate: 0,
    vatRate: 0.19,
    extraRate: 0,
    freightUsd: 2200,
    inlandExportUsd: 450,
    notes:
      "Used passenger cars are generally not importable except narrow exemptions. We show the rule, not a buy path.",
  },
];

export function exportCountryById(id: string) {
  return EXPORT_COUNTRIES.find((row) => row.id === id) ?? EXPORT_COUNTRIES[0];
}

export function vehicleAgeYears(year: number, nowYear: number) {
  if (!year || year < 1980) return null;
  return Math.max(0, nowYear - year);
}

export type ExportEstimate = {
  country: ExportCountry;
  ageYears: number | null;
  ageOk: boolean;
  salvageOk: boolean;
  importOk: boolean;
  vehicleUsd: number;
  koreaLocalUsd: number;
  oceanUsd: number;
  cifUsd: number;
  dutyUsd: number;
  extraUsd: number;
  vatUsd: number;
  landedUsd: number;
};

export function estimateExportCost(input: {
  country: ExportCountry;
  saleWon: number;
  usdPerKrw: number;
  year: number;
  nowYear: number;
  isSalvage?: boolean;
}): ExportEstimate {
  const ageYears = vehicleAgeYears(input.year, input.nowYear);
  const ageOk =
    input.country.maxAgeYears == null ||
    (ageYears != null && ageYears <= input.country.maxAgeYears);
  const salvageOk =
    !input.isSalvage ||
    input.country.salvage === "usually" ||
    input.country.salvage === "limited";
  const importOk =
    input.country.importStatus !== "generally_closed" && ageOk && salvageOk;

  const vehicleUsd =
    input.saleWon > 0 && input.usdPerKrw > 0
      ? input.saleWon * input.usdPerKrw
      : 0;
  const koreaLocalUsd = input.country.inlandExportUsd;
  const oceanUsd = input.country.freightUsd;
  const cifUsd = vehicleUsd > 0 ? vehicleUsd + koreaLocalUsd + oceanUsd : 0;
  const dutyUsd = cifUsd * input.country.dutyRate;
  const extraUsd = cifUsd * input.country.extraRate;
  const vatUsd = (cifUsd + dutyUsd + extraUsd) * input.country.vatRate;
  const landedUsd = cifUsd + dutyUsd + extraUsd + vatUsd;

  return {
    country: input.country,
    ageYears,
    ageOk,
    salvageOk,
    importOk,
    vehicleUsd,
    koreaLocalUsd,
    oceanUsd,
    cifUsd,
    dutyUsd,
    extraUsd,
    vatUsd,
    landedUsd,
  };
}

export function salvageLabel(rule: SalvageRule) {
  if (rule === "usually") return "Usually accepted";
  if (rule === "limited") return "Case by case";
  return "Usually not accepted";
}

export function importStatusLabel(status: ImportStatus) {
  if (status === "open") return "Lower barrier";
  if (status === "restricted") return "Restricted";
  return "Generally closed";
}
