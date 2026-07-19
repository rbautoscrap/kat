"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Listing, ListingImage, ListingCategory } from "@prisma/client";
import { ADMIN_CATEGORY_LABELS } from "@/lib/admin-labels";

type Props = {
  listing?: Listing & {
    images: ListingImage[];
    vin?: string | null;
    storageLocation?: string | null;
    damagesEn?: string | null;
  };
};

const categories = (
  Object.entries(ADMIN_CATEGORY_LABELS) as [ListingCategory, string][]
).map(([value, label]) => ({ value, label }));

const textFieldsBeforeTransmission = [
  { name: "engineMark", label: "엔진 형식" },
] as const;


function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatOdometer(value: string) {
  const digits = digitsOnly(value);
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

const TRANSMISSION_TYPES = [
  "Automatic",
  "Manual",
  "CVT",
  "DCT",
  "Semi-automatic",
  "Other",
] as const;

const TRANSMISSION_LEGACY: Record<string, (typeof TRANSMISSION_TYPES)[number]> =
  {
    자동: "Automatic",
    수동: "Manual",
    세미오토: "Semi-automatic",
    기타: "Other",
  };

function resolveTransmission(value?: string | null) {
  if (!value) return "";
  if ((TRANSMISSION_TYPES as readonly string[]).includes(value)) return value;
  return TRANSMISSION_LEGACY[value] ?? "";
}

const FUEL_TYPES = [
  "Gasoline",
  "Diesel",
  "LPG",
  "Electric",
  "Hydrogen",
  "Other",
] as const;

const STORAGE_LOCATIONS = ["진천사업소", "충주사업소"] as const;

const FUEL_LEGACY: Record<string, (typeof FUEL_TYPES)[number]> = {
  가솔린: "Gasoline",
  디젤: "Diesel",
  전기: "Electric",
  수소: "Hydrogen",
  기타: "Other",
};

function resolveFuelType(value?: string | null) {
  if (!value) return "";
  if ((FUEL_TYPES as readonly string[]).includes(value)) return value;
  return FUEL_LEGACY[value] ?? "";
}

const selectClass =
  "h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400 focus:bg-white";

export function ListingForm({ listing }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [coverName, setCoverName] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [keptCover, setKeptCover] = useState<ListingImage | null>(
    () => listing?.images?.[0] ?? null,
  );
  const [keptGallery, setKeptGallery] = useState<ListingImage[]>(
    () => listing?.images?.slice(1) ?? [],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget;
    const data = new FormData(form);

    // Drop empty file fields so the API does not treat them as uploads
    const coverEntry = data.get("coverImage");
    if (coverEntry instanceof File && coverEntry.size === 0) {
      data.delete("coverImage");
    }
    const galleryFiles = data
      .getAll("images")
      .filter((f): f is File => f instanceof File && f.size > 0);
    data.delete("images");
    for (const file of galleryFiles) {
      data.append("images", file);
    }

    if (!listing) {
      const cover = data.get("coverImage");
      if (!(cover instanceof File) || cover.size === 0) {
        setError("대표(메인) 사진을 등록해 주세요.");
        setPending(false);
        return;
      }
    } else {
      const cover = data.get("coverImage");
      const hasNewCover = cover instanceof File && cover.size > 0;
      const hasNewGallery = galleryFiles.length > 0;
      if (
        !hasNewCover &&
        !keptCover &&
        keptGallery.length === 0 &&
        !hasNewGallery
      ) {
        setError("사진은 최소 1장 이상 남겨 주세요.");
        setPending(false);
        return;
      }
    }

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 120_000);
      const res = await fetch(
        listing ? `/api/listings/${listing.id}` : "/api/listings",
        {
          method: listing ? "PUT" : "POST",
          body: data,
          signal: controller.signal,
        },
      );
      window.clearTimeout(timeout);
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "매물 저장에 실패했습니다.");
        return;
      }
      if (!json.id) {
        setError("매물 저장에 실패했습니다.");
        return;
      }
      router.push(`/listings/${json.id}`);
      router.refresh();
    } catch (err) {
      const aborted =
        err instanceof DOMException && err.name === "AbortError";
      setError(
        aborted
          ? "저장 시간이 초과되었습니다. 새 사진 수를 줄이거나 다시 시도해 주세요."
          : "네트워크 오류가 발생했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5"
      encType="multipart/form-data"
      lang="ko"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
            카테고리
          </span>
          <select
            name="category"
            required
            defaultValue={listing?.category ?? "CAR_LISTINGS"}
            className={selectClass}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="연식"
          name="year"
          type="number"
          required
          defaultValue={listing?.year?.toString()}
        />
        <Field
          label="제조사"
          name="make"
          required
          defaultValue={listing?.make}
        />
        <Field
          label="모델"
          name="model"
          required
          defaultValue={listing?.model}
        />
        <VinField defaultValue={listing?.vin ?? undefined} />
        {textFieldsBeforeTransmission.map((f) => (
          <Field
            key={f.name}
            label={f.label}
            name={f.name}
            defaultValue={listing?.[f.name] ?? undefined}
          />
        ))}
        <label className="block text-sm">
          <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
            변속기
          </span>
          <select
            name="transmission"
            required
            defaultValue={resolveTransmission(listing?.transmission)}
            className={selectClass}
          >
            <option value="" disabled>
              선택
            </option>
            {TRANSMISSION_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <OdometerField defaultValue={listing?.odometer ?? undefined} />
        <NotesField
          defaultValue={listing?.damages ?? undefined}
          translatedEn={listing?.damagesEn ?? undefined}
        />
        <label className="block text-sm">
          <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
            연료
          </span>
          <select
            name="fuelType"
            required
            defaultValue={resolveFuelType(listing?.fuelType)}
            className={selectClass}
          >
            <option value="" disabled>
              선택
            </option>
            {FUEL_TYPES.map((fuel) => (
              <option key={fuel} value={fuel}>
                {fuel}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="유튜브 URL"
          name="youtubeUrl"
          defaultValue={listing?.youtubeUrl ?? undefined}
        />
        <Field
          label="WhatsApp 번호"
          name="whatsappNumber"
          required
          defaultValue={
            listing?.whatsappNumber ??
            process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT ??
            ""
          }
        />
      </div>

      <div className="rounded-md border border-[var(--line)] bg-neutral-50/40 px-4 py-4">
        <div className="mb-3">
          <p className="text-[13px] font-medium tracking-wide text-neutral-700">
            내부 참고 정보
          </p>
          <p className="mt-1 text-[12px] leading-relaxed tracking-wide text-neutral-400">
            외부에 공개되지 않으며, 관리자만 확인할 수 있습니다.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="차량번호"
            name="vehicleNumber"
            defaultValue={listing?.vehicleNumber ?? undefined}
          />
          <label className="block text-sm">
            <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
              보관장소
            </span>
            <select
              name="storageLocation"
              defaultValue={
                listing?.storageLocation &&
                (STORAGE_LOCATIONS as readonly string[]).includes(
                  listing.storageLocation,
                )
                  ? listing.storageLocation
                  : ""
              }
              className={selectClass}
            >
              <option value="">선택</option>
              {STORAGE_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </label>
          <InboundDateFields
            inboundDate={listing?.inboundDate ?? undefined}
          />
          <InternalCostFields
            auctionPrice={listing?.auctionPrice ?? undefined}
            incidentalCost={listing?.incidentalCost ?? undefined}
          />
        </div>
      </div>

      {listing ? <input type="hidden" name="manageImages" value="1" /> : null}
      {keptCover ? (
        <input type="hidden" name="keepImageIds" value={keptCover.id} />
      ) : null}
      {keptGallery.map((img) => (
        <input key={img.id} type="hidden" name="keepImageIds" value={img.id} />
      ))}

      <div className="space-y-5 text-sm">
        <div>
          <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
            대표(메인) 사진
            {listing ? (
              <span className="font-normal text-neutral-400">
                {" "}
                (삭제 후 새 사진을 올리거나, 추가 사진이 대표로 승격됩니다)
              </span>
            ) : (
              <span className="font-normal text-neutral-400">
                {" "}
                · 목록·카드에 표시됩니다
              </span>
            )}
          </span>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-neutral-300 bg-neutral-50/60 px-4 py-6 transition hover:border-neutral-400 hover:bg-neutral-50 focus-within:border-neutral-400 focus-within:bg-white">
            {(coverPreview || keptCover?.url) && (
              <span className="relative inline-block w-full max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreview ?? keptCover!.url}
                  alt="대표 사진 미리보기"
                  className="h-36 w-full rounded-sm border border-neutral-200 object-cover"
                />
                {listing && !coverPreview && keptCover ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setKeptCover(null);
                    }}
                    className="absolute right-2 top-2 inline-flex h-7 items-center rounded-md bg-black/70 px-2 text-[12px] font-medium text-white hover:bg-black/85"
                  >
                    삭제
                  </button>
                ) : null}
              </span>
            )}
            <span className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-[13px] font-medium tracking-wide text-neutral-800 shadow-sm">
              대표 사진 선택
            </span>
            <span className="text-center text-[12.5px] leading-relaxed tracking-wide text-neutral-500">
              {coverName
                ? coverName
                : "JPG, PNG, WEBP, GIF · 1장 · 자동 압축 저장"}
            </span>
            <input
              type="file"
              name="coverImage"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setCoverName(file?.name ?? null);
                if (coverPreview) URL.revokeObjectURL(coverPreview);
                setCoverPreview(file ? URL.createObjectURL(file) : null);
                if (file) setKeptCover(null);
              }}
            />
          </label>
        </div>

        <div>
          <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
            추가 사진
            <span className="font-normal text-neutral-400">
              {" "}
              · 대표 사진 포함 최대 100장
              {listing ? " · 썸네일 × 로 개별 삭제" : ""}
            </span>
          </span>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-neutral-50/60 px-4 py-7 transition hover:border-neutral-400 hover:bg-neutral-50 focus-within:border-neutral-400 focus-within:bg-white">
            <span className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-[13px] font-medium tracking-wide text-neutral-800 shadow-sm">
              추가 사진 선택
            </span>
            <span className="text-center text-[12.5px] leading-relaxed tracking-wide text-neutral-500">
              {photoCount > 0
                ? `${photoCount}장 선택됨 (최대 99장)`
                : "JPG, PNG · 최대 99장 · 자동 압축 저장"}
            </span>
            <input
              type="file"
              name="images"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              onChange={(e) => {
                const count = e.target.files?.length ?? 0;
                if (count > 99) {
                  setError(
                    "추가 사진은 최대 99장까지 선택할 수 있습니다. (대표 사진 포함 100장)",
                  );
                  e.target.value = "";
                  setPhotoCount(0);
                  return;
                }
                setError(null);
                setPhotoCount(count);
              }}
            />
          </label>

          {keptGallery.length > 0 ? (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {keptGallery.map((img) => (
                <div key={img.id} className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    className="h-full w-full rounded-sm border border-neutral-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setKeptGallery((prev) =>
                        prev.filter((item) => item.id !== img.id),
                      )
                    }
                    className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-[14px] leading-none text-white hover:bg-black/90"
                    aria-label="사진 삭제"
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {listing && keptGallery.length === 0 ? (
            <p className="mt-2 text-[12px] tracking-wide text-neutral-400">
              보관 중인 추가 사진이 없습니다. 위에서 새로 추가할 수 있습니다.
            </p>
          ) : null}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-800 px-5 py-2.5 text-[13.5px] font-medium tracking-wide text-white transition hover:bg-neutral-700 disabled:opacity-60"
      >
        {pending ? "저장 중…" : listing ? "매물 수정" : "매물 등록"}
      </button>
    </form>
  );
}

function normalizeVin(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function VinField({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(() => normalizeVin(defaultValue ?? ""));

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
        차대번호
      </span>
      <input
        name="vin"
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="영문 대문자·숫자만"
        value={value}
        onChange={(e) => setValue(normalizeVin(e.target.value))}
        className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 text-[13.5px] tracking-wide uppercase outline-none focus:border-neutral-400 focus:bg-white"
      />
    </label>
  );
}

function NotesField({
  defaultValue,
  translatedEn,
}: {
  defaultValue?: string;
  translatedEn?: string;
}) {
  return (
    <label className="block text-sm sm:col-span-2">
      <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
        특이 사항
      </span>
      <textarea
        name="damages"
        rows={3}
        defaultValue={defaultValue}
        placeholder="한글로 입력하면 공개 페이지에 영문으로 자동 번역됩니다"
        className="w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 py-2 text-[13.5px] leading-relaxed tracking-wide outline-none focus:border-neutral-400 focus:bg-white"
      />
      <span className="mt-1.5 block text-[12px] leading-relaxed tracking-wide text-neutral-400">
        저장 시 영문으로 번역되어 사이트에 노출됩니다.
        {translatedEn ? (
          <>
            {" "}
            현재 공개 문구:{" "}
            <span className="text-neutral-600">{translatedEn}</span>
          </>
        ) : null}
      </span>
    </label>
  );
}

function OdometerField({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(() => formatOdometer(defaultValue ?? ""));

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
        주행거리
      </span>
      <div className="relative">
        <input
          name="odometer"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="예: 100,000"
          value={value}
          onChange={(e) => setValue(formatOdometer(e.target.value))}
          className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 py-1 pl-3 pr-11 text-[13.5px] tracking-wide outline-none focus:border-neutral-400 focus:bg-white"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12.5px] tracking-wide text-neutral-500">
          km
        </span>
      </div>
    </label>
  );
}

function calcDaysFromInbound(inboundDigits: string): string {
  if (inboundDigits.length !== 8) return "";
  const y = Number(inboundDigits.slice(0, 4));
  const m = Number(inboundDigits.slice(4, 6));
  const d = Number(inboundDigits.slice(6, 8));
  const inbound = new Date(y, m - 1, d);
  if (Number.isNaN(inbound.getTime())) return "";
  const today = new Date();
  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const diffMs = startToday.getTime() - inbound.getTime();
  return String(Math.max(0, Math.floor(diffMs / 86_400_000)));
}

function InboundDateFields({ inboundDate }: { inboundDate?: string }) {
  const [inbound, setInbound] = useState(() =>
    digitsOnly(inboundDate ?? "").slice(0, 8),
  );
  const days = calcDaysFromInbound(inbound);

  return (
    <>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          입고일자
        </span>
        <input
          name="inboundDate"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="예: 20260719"
          value={inbound}
          onChange={(e) => setInbound(digitsOnly(e.target.value).slice(0, 8))}
          className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          누적일
          <span className="ml-1.5 font-normal text-neutral-400">
            (입고일 ~ 오늘)
          </span>
        </span>
        <input type="hidden" name="accumulatedDays" value={days} />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          readOnly
          tabIndex={-1}
          placeholder="입고일자 입력 시 자동 계산"
          value={days === "" ? "" : `${days}일`}
          className="h-10 w-full cursor-default rounded-md border border-neutral-200 bg-neutral-100 px-3 text-[13.5px] tracking-wide text-neutral-800 outline-none"
        />
      </label>
    </>
  );
}

function sumCostDisplay(auction: string, incidental: string) {
  const total =
    (Number(digitsOnly(auction) || "0") || 0) +
    (Number(digitsOnly(incidental) || "0") || 0);
  if (!digitsOnly(auction) && !digitsOnly(incidental)) return "";
  return formatOdometer(String(total));
}

function InternalCostFields({
  auctionPrice,
  incidentalCost,
}: {
  auctionPrice?: string;
  incidentalCost?: string;
}) {
  const [auction, setAuction] = useState(() =>
    formatOdometer(auctionPrice ?? ""),
  );
  const [incidental, setIncidental] = useState(() =>
    formatOdometer(incidentalCost ?? ""),
  );
  const cost = sumCostDisplay(auction, incidental);

  return (
    <>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          낙찰가
        </span>
        <input
          name="auctionPrice"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="예: 10,000,000"
          value={auction}
          onChange={(e) => setAuction(formatOdometer(e.target.value))}
          className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          부대비용
        </span>
        <input
          name="incidentalCost"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="예: 500,000"
          value={incidental}
          onChange={(e) => setIncidental(formatOdometer(e.target.value))}
          className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
          원가
          <span className="ml-1.5 font-normal text-neutral-400">
            (낙찰가 + 부대비용)
          </span>
        </span>
        <input
          name="costPrice"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          readOnly
          tabIndex={-1}
          placeholder="자동 계산"
          value={cost}
          className="h-10 w-full cursor-default rounded-md border border-neutral-200 bg-neutral-100 px-3 text-[13.5px] tracking-wide text-neutral-800 outline-none"
        />
      </label>
    </>
  );
}

function NumericField({
  label,
  name,
  defaultValue,
  placeholder,
  maxDigits,
  withCommas = true,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  maxDigits?: number;
  withCommas?: boolean;
}) {
  const [value, setValue] = useState(() => {
    const digits = digitsOnly(defaultValue ?? "");
    if (!digits) return "";
    return withCommas ? formatOdometer(digits) : digits;
  });

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
        {label}
      </span>
      <input
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          let digits = digitsOnly(e.target.value);
          if (maxDigits != null) digits = digits.slice(0, maxDigits);
          setValue(withCommas ? formatOdometer(digits) : digits);
        }}
        className="h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400"
      />
    </label>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 text-[13.5px] tracking-wide outline-none focus:border-neutral-400 focus:bg-white"
      />
    </label>
  );
}
