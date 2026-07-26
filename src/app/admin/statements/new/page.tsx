import { redirect } from "next/navigation";

/** Legacy URL — create flow is a modal on the statements list. */
export default function NewStatementPage() {
  redirect("/admin/statements");
}
