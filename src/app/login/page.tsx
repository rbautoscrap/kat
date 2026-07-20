import { auth, signOut } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { normalizeLoginId } from "@/lib/login-id";

type Props = {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
    pending?: string;
    registered?: string;
    id?: string;
  }>;
};

function loginErrorMessage(error?: string) {
  if (error === "pending") {
    return "Your account is waiting for administrator approval. Please try again after approval.";
  }
  if (error === "rejected") {
    return "Your account registration was not approved. Contact an administrator if you need help.";
  }
  if (error) {
    return "Invalid ID or password. Use the ID from Join (not your display name), unless they are the same.";
  }
  return null;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/";
  const defaultId = params.id ? normalizeLoginId(params.id) : "";
  const errorMessage = loginErrorMessage(params.error);

  // Clear any existing session so Login always starts as a fresh sign-in
  const session = await auth();
  if (session?.user?.id) {
    await signOut({
      redirectTo: `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    });
  }

  return (
    <div className="site-container py-10" lang="en">
      <LoginForm
        callbackUrl={callbackUrl}
        defaultId={defaultId}
        errorMessage={errorMessage}
        pending={Boolean(params.pending)}
        registered={Boolean(params.registered)}
      />
    </div>
  );
}
