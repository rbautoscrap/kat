"use client";

import { useEffect, useState } from "react";
import { CONTACT_LINE } from "@/lib/contact";

type Props = {
  resumeAt: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatRemain(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`;
}

export function CsResumeBanner({ resumeAt }: Props) {
  const [remainMs, setRemainMs] = useState(() =>
    Math.max(0, new Date(resumeAt).getTime() - Date.now()),
  );

  useEffect(() => {
    const tick = () =>
      setRemainMs(Math.max(0, new Date(resumeAt).getTime() - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [resumeAt]);

  if (remainMs <= 0) {
    return (
      <p className="flex min-w-0 flex-wrap items-baseline justify-center gap-x-3 gap-y-0.5 text-center text-[12.5px] leading-snug tracking-wide text-neutral-500">
        {CONTACT_LINE}
      </p>
    );
  }

  return (
    <p className="flex min-w-0 flex-wrap items-baseline justify-center gap-x-3 gap-y-0.5 text-center text-[12.5px] leading-snug tracking-wide text-neutral-500">
      <span>CS consultations begin at 9:00 AM KST</span>
      <span className="font-medium tabular-nums text-neutral-800">
        {formatRemain(remainMs)}
      </span>
    </p>
  );
}
