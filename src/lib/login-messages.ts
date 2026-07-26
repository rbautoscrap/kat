export function loginErrorMessage(error?: string | null) {
  if (!error) return null;
  if (error === "pending") {
    return "Your account is waiting for administrator approval. Please try again after approval.";
  }
  if (error === "rejected") {
    return "Your account registration was not approved. Contact an administrator if you need help.";
  }
  return "Invalid ID or password. Use the ID from Join (not your display name), unless they are the same.";
}
