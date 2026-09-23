export const HOLIDAY_NOTICE_LANGS = ["en", "ko", "ru", "ar", "mn"] as const;
export type HolidayNoticeLang = (typeof HOLIDAY_NOTICE_LANGS)[number];

/** Show notice from Sep 23, 2026 19:00 KST through Sep 28, 2026 09:00 KST. */
export const HOLIDAY_NOTICE_START_MS = Date.parse("2026-09-23T19:00:00+09:00");
export const HOLIDAY_NOTICE_END_MS = Date.parse("2026-09-28T09:00:00+09:00");

export function isHolidayNoticeActive(now = Date.now()) {
  return now >= HOLIDAY_NOTICE_START_MS && now < HOLIDAY_NOTICE_END_MS;
}

export const HOLIDAY_NOTICE_COPY: Record<
  HolidayNoticeLang,
  { label: string; body: string; continue: string; dir: "ltr" | "rtl" }
> = {
  en: {
    label: "English",
    dir: "ltr",
    continue: "Continue",
    body: "Our service will be paused for the holidays from Sep 23, 7:00 PM to Sep 28, 9:00 AM (KST). We will respond to your messages in order as soon as possible. We appreciate your patience.",
  },
  ko: {
    label: "한국어",
    dir: "ltr",
    continue: "계속하기",
    body: "연휴로 인해 9월 23일 오후 7시부터 9월 28일 오전 9시(한국시간)까지 서비스가 잠시 중단됩니다. 남겨 주신 메시지는 접수된 순서대로 빠르게 답변드리겠습니다. 양해 부탁드립니다.",
  },
  ru: {
    label: "Русский",
    dir: "ltr",
    continue: "Продолжить",
    body: "В связи с праздниками наш сервис будет приостановлен с 19:00 23 сентября до 09:00 28 сентября (KST). Мы ответим на ваши сообщения в порядке поступления как можно скорее. Благодарим за терпение.",
  },
  ar: {
    label: "العربية",
    dir: "rtl",
    continue: "متابعة",
    body: "ستتوقف خدمتنا مؤقتًا خلال العطلة من الساعة 7:00 مساءً يوم 23 سبتمبر حتى الساعة 9:00 صباحًا يوم 28 سبتمبر (بتوقيت كوريا). سنرد على رسائلكم بالترتيب في أقرب وقت ممكن. نشكركم على صبركم.",
  },
  mn: {
    label: "Монгол",
    dir: "ltr",
    continue: "Үргэлжлүүлэх",
    body: "Баярын өдрүүдээр манай үйлчилгээ 9-р сарын 23-ны 19:00 цагаас 9-р сарын 28-ны 09:00 цаг хүртэл (KST) түр завсарлана. Бид таны зурваст хүлээн авсан дарааллын дагуу аль болох хурдан хариу өгөх болно. Хүлээцтэй хандаж байгаад баярлалаа.",
  },
};
