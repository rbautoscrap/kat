"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EXPORT_COUNTRIES,
  estimateExportCost,
  exportCountryById,
  importStatusLabel,
  salvageLabel,
} from "@/lib/export-estimate";
import { formatSalePriceUsd, whatsappLink } from "@/lib/listings";

const STORAGE_KEY = "kat-export-country";

type Props = {
  year: number;
  saleWon: number;
  usdPerKrw: number;
  title: string;
  vin?: string | null;
  whatsappNumber: string;
};

function money(amount: number) {
  return formatSalePriceUsd(amount) || "—";
}

export function ExportEstimatePanel({
  year,
  saleWon,
  usdPerKrw,
  title,
  vin,
  whatsappNumber,
}: Props) {
  const nowYear = new Date().getFullYear();
  const [countryId, setCountryId] = useState(EXPORT_COUNTRIES[0].id);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && EXPORT_COUNTRIES.some((row) => row.id === saved)) {
        setCountryId(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const country = exportCountryById(countryId);
  const estimate = useMemo(
    () =>
      estimateExportCost({
        country,
        saleWon,
        usdPerKrw,
        year,
        nowYear,
        isSalvage: true,
      }),
    [country, saleWon, usdPerKrw, year, nowYear],
  );

  function onCountryChange(id: string) {
    setCountryId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }

  const quoteHref = whatsappLink(
    whatsappNumber,
    [
      `Hello, I want an export estimate to ${country.name} (${country.port}).`,
      title,
      vin ? `VIN ${vin}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  const statusTone = !estimate.importOk
    ? "is-blocked"
    : country.importStatus === "restricted" || !estimate.salvageOk
      ? "is-warn"
      : "is-ok";

  return (
    <section className="export-estimate">
      <header className="export-estimate-head">
        <div>
          <p className="export-estimate-kicker">Destination</p>
          <h2>Landed-cost estimate</h2>
        </div>
        <label className="export-estimate-select">
          <span>Country</span>
          <select
            value={countryId}
            onChange={(e) => onCountryChange(e.target.value)}
          >
            {EXPORT_COUNTRIES.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <p className={`export-estimate-status ${statusTone}`}>
        {estimate.importOk
          ? `${importStatusLabel(country.importStatus)} · salvage ${salvageLabel(country.salvage).toLowerCase()}`
          : country.importStatus === "generally_closed"
            ? "Used passenger cars are generally not importable"
            : !estimate.ageOk
              ? `This year is usually over the ${country.maxAgeYears}-year limit`
              : "Salvage units are usually not accepted"}
      </p>

      {saleWon > 0 && usdPerKrw > 0 && country.importStatus !== "generally_closed" ? (
        <dl className="export-estimate-rows">
          <div>
            <dt>Vehicle</dt>
            <dd>{money(estimate.vehicleUsd)}</dd>
          </div>
          <div>
            <dt>Korea inland + export papers</dt>
            <dd>{money(estimate.koreaLocalUsd)}</dd>
          </div>
          <div>
            <dt>Ocean freight to {country.port}</dt>
            <dd>{money(estimate.oceanUsd)}</dd>
          </div>
          <div>
            <dt>Duty / extra</dt>
            <dd>{money(estimate.dutyUsd + estimate.extraUsd)}</dd>
          </div>
          <div>
            <dt>VAT</dt>
            <dd>{money(estimate.vatUsd)}</dd>
          </div>
          <div className="is-total">
            <dt>Estimated total</dt>
            <dd>{money(estimate.landedUsd)}</dd>
          </div>
        </dl>
      ) : (
        <p className="export-estimate-empty">
          {country.importStatus === "generally_closed"
            ? country.notes
            : "Add or ask the asking price to see a dollar range for this country."}
        </p>
      )}

      <p className="export-estimate-note">{country.notes}</p>
      <p className="export-estimate-disclaimer">
        Estimate only. Not a booking, customs entry, or sailing schedule. Final
        quote on WhatsApp after we confirm the unit and the vessel.
      </p>

      {quoteHref ? (
        <a className="export-estimate-wa" href={quoteHref}>
          Ask WhatsApp for {country.name}
        </a>
      ) : null}
    </section>
  );
}
