import type { MaintenanceSnapshot } from "@/lib/maintenance";

type Props = {
  snapshot: MaintenanceSnapshot;
};

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold ${
        ok
          ? "bg-emerald-50 text-emerald-800"
          : "bg-amber-50 text-amber-900"
      }`}
    >
      {label}
    </span>
  );
}

export function MonitoringPanel({ snapshot }: Props) {
  const ready = snapshot.persistence.ready;
  const cards = [
    {
      label: "매물",
      value: snapshot.counts.listings.toLocaleString("ko-KR"),
      hint: `판매중 ${snapshot.counts.available} · 예약 ${snapshot.counts.reserved} · 완료 ${snapshot.counts.sold}`,
    },
    {
      label: "회원",
      value: snapshot.counts.users.toLocaleString("ko-KR"),
      hint: `오퍼 ${snapshot.counts.offers.toLocaleString("ko-KR")}건`,
    },
    {
      label: "명세서",
      value: snapshot.counts.statements.toLocaleString("ko-KR"),
      hint: `백업 ${snapshot.storage.backupsCount}개 보관`,
    },
    {
      label: "저장소",
      value: snapshot.storage.dbSizeLabel,
      hint: `이미지 ${snapshot.storage.uploadsFiles.toLocaleString("ko-KR")}개 · ${snapshot.storage.uploadsSizeLabel}`,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="admin-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
              모니터링
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
              서비스 상태와 데이터 규모를 간단히 확인합니다.
            </p>
          </div>
          <StatusPill
            ok={ready}
            label={ready ? "정상" : "점검 필요"}
          />
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-neutral-100 bg-neutral-50/70 px-3.5 py-3">
            <dt className="text-[12px] font-medium text-neutral-500">가동 시간</dt>
            <dd className="mt-1 text-[15px] font-semibold text-neutral-900">
              {snapshot.uptimeLabel}
            </dd>
          </div>
          <div className="rounded-md border border-neutral-100 bg-neutral-50/70 px-3.5 py-3">
            <dt className="text-[12px] font-medium text-neutral-500">볼륨</dt>
            <dd className="mt-1 text-[15px] font-semibold text-neutral-900">
              {snapshot.persistence.volumeMounted ? "연결됨" : "로컬/미연결"}
            </dd>
          </div>
          <div className="rounded-md border border-neutral-100 bg-neutral-50/70 px-3.5 py-3">
            <dt className="text-[12px] font-medium text-neutral-500">DB</dt>
            <dd className="mt-1 text-[15px] font-semibold text-neutral-900">
              {snapshot.persistence.dbFileExists ? "확인됨" : "없음"}
            </dd>
          </div>
          <div className="rounded-md border border-neutral-100 bg-neutral-50/70 px-3.5 py-3">
            <dt className="text-[12px] font-medium text-neutral-500">업로드 폴더</dt>
            <dd className="mt-1 text-[15px] font-semibold text-neutral-900">
              {snapshot.persistence.uploadsDirExists ? "확인됨" : "없음"}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-[12.5px] text-neutral-400">
          기준 시각 {snapshot.time.slice(0, 19).replace("T", " ")} UTC · Node{" "}
          {snapshot.nodeVersion}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="admin-stat-card">
            <p className="admin-stat-label">{card.label}</p>
            <p className="admin-stat-value">{card.value}</p>
            <p className="mt-1.5 text-[12px] text-neutral-500">{card.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
