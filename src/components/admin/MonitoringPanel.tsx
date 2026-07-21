import type { MaintenanceSnapshot } from "@/lib/maintenance";

type Props = {
  snapshot: MaintenanceSnapshot;
};

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex h-8 items-center rounded-md px-2.5 text-[12.5px] font-semibold ${
        ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
      }`}
    >
      <span
        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
          ok ? "bg-emerald-500" : "bg-amber-500"
        }`}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function MonitoringPanel({ snapshot }: Props) {
  const ready = snapshot.persistence.ready;

  const systemCards = [
    { label: "가동 시간", value: snapshot.uptimeLabel },
    {
      label: "볼륨",
      value: snapshot.persistence.volumeMounted ? "연결됨" : "로컬/미연결",
    },
    {
      label: "DB",
      value: snapshot.persistence.dbFileExists ? "확인됨" : "없음",
    },
    {
      label: "업로드 폴더",
      value: snapshot.persistence.uploadsDirExists ? "확인됨" : "없음",
    },
  ];

  const dataCards = [
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
    <section className="admin-panel overflow-hidden">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <div className="admin-section-head">
          <div className="admin-section-head-text">
            <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
              모니터링
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
              서비스 상태와 데이터 규모를 확인합니다.
            </p>
          </div>
          <div className="admin-section-head-actions">
            <StatusPill ok={ready} label={ready ? "정상" : "점검 필요"} />
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div>
          <p className="mb-2 text-[12px] font-semibold text-neutral-500">
            시스템
          </p>
          <div className="admin-metric-grid">
            {systemCards.map((card) => (
              <div key={card.label} className="admin-metric-card">
                <p className="admin-metric-label">{card.label}</p>
                <p className="admin-metric-value">{card.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[12px] font-semibold text-neutral-500">
            데이터
          </p>
          <div className="admin-metric-grid">
            {dataCards.map((card) => (
              <div key={card.label} className="admin-metric-card is-emphasis">
                <div>
                  <p className="admin-metric-label">{card.label}</p>
                  <p className="admin-metric-value">{card.value}</p>
                </div>
                <p className="admin-metric-hint">{card.hint}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="border-t border-neutral-100 pt-3 text-[12.5px] text-neutral-400">
          기준 시각 {snapshot.time.slice(0, 19).replace("T", " ")} UTC · Node{" "}
          {snapshot.nodeVersion}
        </p>
      </div>
    </section>
  );
}
