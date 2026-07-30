export function loginErrorMessage(error?: string | null) {
  if (!error) return null;
  if (error === "pending") {
    return "Your account is waiting for administrator approval. Please try again after approval.";
  }
  if (error === "rejected") {
    return "Your account registration was not approved. Contact an administrator if you need help.";
  }
  if (error === "rate_limited") {
    return "Too many login attempts. Please wait a few minutes and try again.";
  }
  if (error === "invalid_input") {
    return "Enter a valid ID and password.";
  }
  // Auth.js default code when credentials fail
  if (
    error === "credentials" ||
    error === "CredentialsSignin" ||
    error === "invalid"
  ) {
    return "Invalid ID or password. Use the ID from Join (not your display name), unless they are the same.";
  }
  return "Invalid ID or password. Use the ID from Join (not your display name), unless they are the same.";
}
