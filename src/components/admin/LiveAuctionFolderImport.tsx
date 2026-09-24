"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModalShell } from "@/components/AuthModalShell";
import { compressImagesForUpload } from "@/lib/browser-compress-image";
import { DEFAULT_LISTING_WHATSAPP } from "@/lib/contact";
import {
  AUCTION_TODAY_PRESETS,
  AUCTION_TOMORROW_PRESETS,
  auctionPresetWallTime,
  defaultAuctionEndsLocal,
  formatAuctionEndsSummary,
  type AuctionPreset,
} from "@/lib/auction-clock";
import { koreaTodayYyyymmdd } from "@/lib/format-korea-time";
import {
  groupAuctionFolderFiles,
  MAX_LIVE_AUCTION_FOLDER_UNITS,
  type AuctionFolderUnit,
} from "@/lib/live-auction-folder";

export function LiveAuctionFolderImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [endsAt, setEndsAt] = useState(() => defaultAuctionEndsLocal());
  const [units, setUnits] = useState<AuctionFolderUnit[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [doneNote, setDoneNote] = useState("");

  const photoTotal = useMemo(
    () => units.reduce((n, u) => n + u.files.length, 0),
    [units],
  );

  function pickPreset(preset: AuctionPreset) {
    setEndsAt(auctionPresetWallTime(preset));
  }

  function onFolder(files: FileList | null) {
    setError("");
    setDoneNote("");
    setUnits(groupAuctionFolderFiles(files ? Array.from(files) : []));
  }

  async function submit() {
    if (units.length === 0 || busy) return;
    if (!endsAt) {
      setError("마감 시간을 선택해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    setDoneNote("");
    let ok = 0;
    try {
      for (let i = 0; i < units.length; i++) {
        const unit = units[i]!;
        setProgress(`사진 최적화 ${i + 1}/${units.length}…`);
        const compressed = await compressImagesForUpload(unit.files);
        const cover = compressed[0];
        if (!cover) continue;
        const data = new FormData();
        data.set("category", "LIVE_AUCTION");
        data.set("year", String(unit.year));
        data.set("make", unit.make);
        data.set("model", unit.model);
        data.set("transmission", "Other");
        data.set("fuelType", "Other");
        data.set("whatsappNumber", DEFAULT_LISTING_WHATSAPP);
        data.set("inboundDate", koreaTodayYyyymmdd());
        data.set("auctionEndsAt", endsAt);
        data.set("displayedImageGroup", "1");
        data.set("coverImage1", cover);
        for (const file of compressed.slice(1)) {
          data.append("images1", file);
        }
        setProgress(`등록 ${i + 1}/${units.length} · ${unit.folder}`);
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 300_000);
        const res = await fetch("/api/listings", {
          method: "POST",
          body: data,
          credentials: "include",
          signal: controller.signal,
        });
        window.clearTimeout(timeout);
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          throw new Error(json.error || `${unit.folder} 등록 실패`);
        }
        ok += 1;
      }
      setDoneNote(`${ok}대 Live Auction 등록`);
      setUnits([]);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? `${ok}대 등록 후 중단 · ${e.message}`
          : `${ok}대 등록 후 중단`,
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setEndsAt(defaultAuctionEndsLocal());
          setError("");
          setDoneNote("");
        }}
        className="inline-flex h-9 shrink-0 items-center rounded-md border border-neutral-300 bg-white px-3 text-[13px] font-medium text-neutral-800 hover:bg-neutral-50"
      >
        폴더 대량
      </button>
      <AuthModalShell
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title="Live Auction 폴더 등록"
        maxWidthClass="max-w-xl"
        closeLabel="닫기"
        closeOnBackdrop={!busy}
      >
        <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
          Live Auction 폴더 등록
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">
          차마다 폴더 하나. 폴더명{" "}
          <span className="font-medium text-neutral-700">
            2020 Tesla Model 3
          </span>
          . 첫 장이 대표. 한 번에 {MAX_LIVE_AUCTION_FOLDER_UNITS}대.
        </p>

        <div className="mt-4">
          <p className="text-[12px] font-medium text-neutral-600">마감</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {AUCTION_TODAY_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={busy}
                onClick={() => pickPreset(p)}
                className="h-8 rounded-md border border-neutral-200 px-2.5 text-[12px] text-neutral-800 hover:bg-neutral-50"
              >
                {p.dayLabel} {p.timeLabel}
              </button>
            ))}
            {AUCTION_TOMORROW_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={busy}
                onClick={() => pickPreset(p)}
                className="h-8 rounded-md border border-neutral-200 px-2.5 text-[12px] text-neutral-800 hover:bg-neutral-50"
              >
                {p.dayLabel} {p.timeLabel}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-neutral-500">
            {formatAuctionEndsSummary(endsAt) || endsAt}
          </p>
        </div>

        <label className="mt-4 block">
          <span className="text-[12px] font-medium text-neutral-600">
            사진 폴더
          </span>
          <input
            type="file"
            className="mt-1.5 block w-full text-[13px] file:mr-2 file:h-8 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:text-[12.5px] file:font-medium file:text-white"
            disabled={busy}
            multiple
            ref={(el) => {
              if (!el) return;
              el.setAttribute("webkitdirectory", "");
              el.setAttribute("directory", "");
            }}
            onChange={(e) => onFolder(e.target.files)}
          />
        </label>

        {units.length > 0 ? (
          <ul className="mt-3 max-h-48 overflow-y-auto border border-[var(--line)] text-[12.5px]">
            {units.map((u) => (
              <li
                key={u.folder}
                className="flex justify-between gap-3 border-b border-[var(--line)] px-2.5 py-1.5 last:border-0"
              >
                <span className="min-w-0 truncate font-medium text-neutral-800">
                  {u.year} {u.make} {u.model}
                </span>
                <span className="shrink-0 tabular-nums text-neutral-500">
                  {u.files.length}장
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {progress ? (
          <p className="mt-3 text-[12.5px] text-sky-800">{progress}</p>
        ) : null}
        {error ? (
          <p className="mt-3 text-[12.5px] text-red-700">{error}</p>
        ) : null}
        {doneNote ? (
          <p className="mt-3 text-[12.5px] text-emerald-800">{doneNote}</p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[12px] text-neutral-500">
            {units.length > 0
              ? `${units.length}대 · ${photoTotal}장`
              : "폴더를 고르면 미리보기가 나옵니다."}
          </p>
          <button
            type="button"
            disabled={busy || units.length === 0}
            onClick={() => void submit()}
            className="inline-flex h-9 items-center rounded-md bg-neutral-800 px-3.5 text-[13px] font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            {busy ? "등록 중…" : `${units.length}대 등록`}
          </button>
        </div>
      </AuthModalShell>
    </>
  );
}
