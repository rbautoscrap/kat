/** One-time caution dialog before permanently deleting a listing. */
export function confirmListingDelete(): boolean {
  return window.confirm(
    [
      "[주의] 매물 삭제",
      "",
      "이 매물을 삭제하면 복구할 수 없습니다.",
      "사진 등 관련 데이터도 함께 삭제됩니다.",
      "",
      "정말 삭제하시겠습니까?",
    ].join("\n"),
  );
}
