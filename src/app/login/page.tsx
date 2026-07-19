import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/authenticate";
import { signIn } from "@/lib/auth";
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

  async function loginAction(formData: FormData) {
    "use server";
    const loginId = normalizeLoginId(String(formData.get("email") ?? ""));
    const password = String(formData.get("password") ?? "");

    const checked = await verifyCredentials(loginId, password);
    if (!checked.ok) {
      redirect(
        `/login?error=${encodeURIComponent(checked.reason)}&callbackUrl=${encodeURIComponent(callbackUrl)}&id=${encodeURIComponent(loginId)}`,
      );
    }

    try {
      await signIn("credentials", {
        email: loginId,
        password,
        redirectTo: callbackUrl,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(
          `/login?error=CredentialsSignin&callbackUrl=${encodeURIComponent(callbackUrl)}&id=${encodeURIComponent(loginId)}`,
        );
      }
      throw error;
    }
  }

  return (
    <div className="site-container py-10" lang="en">
      <form action={loginAction} className="mx-auto w-full max-w-sm space-y-4">
        <h1 className="site-heading text-[1.2rem] text-neutral-800">Login</h1>
        {params.pending && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13.5px] leading-relaxed text-amber-900">
            Account created. An administrator must approve your account before
            you can sign in.
          </p>
        )}
        {params.registered && !params.pending && (
          <p className="text-sm text-emerald-700">
            Account created. Sign in with the ID you just registered.
          </p>
        )}
        {errorMessage && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}
        <label className="block text-sm">
          <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
            ID
          </span>
          <input
            name="email"
            type="text"
            required
            minLength={2}
            defaultValue={defaultId}
            autoComplete="username"
            className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 text-[13.5px] outline-none focus:border-neutral-400 focus:bg-white"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-[13px] font-medium tracking-wide text-neutral-600">
            Password
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={1}
            autoComplete="current-password"
            className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50/40 px-3 text-[13.5px] outline-none focus:border-neutral-400 focus:bg-white"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-800 py-2.5 text-[13.5px] font-medium tracking-wide text-white transition hover:bg-neutral-700"
        >
          Login
        </button>
        <p className="text-center text-[13.5px] text-neutral-600">
          No account?{" "}
          <Link href="/join" className="underline">
            Join
          </Link>
        </p>
      </form>
    </div>
  );
}
