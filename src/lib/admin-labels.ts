import type {
  AccountStatus,
  ListingCategory,
  ListingSaleStatus,
  Role,
} from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  MEMBER: "일반회원",
  AUTHORIZED: "권한회원",
  ADMIN: "관리자",
};

export const SALE_STATUS_ADMIN_LABELS: Record<ListingSaleStatus, string> = {
  AVAILABLE: "판매중",
  RESERVED: "예약완료",
  SOLD: "판매완료",
};

export const STATUS_LABELS: Record<AccountStatus, string> = {
  PENDING: "승인 대기",
  APPROVED: "승인됨",
  REJECTED: "거절됨",
};

export const ADMIN_CATEGORY_LABELS: Record<ListingCategory, string> = {
  HOT_DEALS: "핫딜",
  CAR_LISTINGS: "차량 매물",
  STAND_BY: "스탠바이",
};
