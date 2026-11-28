"use client";

import Link from "@/features/navigation-progress/navigation-progress-link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { buttonStyles } from "@/components/ui/button";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { login } from "@/lib/api";
import { normaliseRole, routeForRole } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useActionFeedback();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      toast("Signed in successfully.", "success");
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(normaliseRole(user.role) === "Administrator" && next === "/school-onboarding"
        ? next
        : routeForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <Logo href="/" />
      <div className="mt-10">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">Use the email linked to your SchoolOS account.</p>
      </div>
      <form className="mt-7 space-y-5" onSubmit={submit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Email</span>
          <Input autoComplete="username" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <PasswordField autoComplete="current-password" label="Password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <div className="text-right text-sm">
          <Link className="font-medium text-primary hover:text-primary-hover" href="/forgot-password">Forgot password?</Link>
        </div>
        {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
        <button className={buttonStyles("primary") + " w-full"} type="submit" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
          <ArrowRight size={17} />
        </button>
      </form>
      <div className="mt-6 space-y-3 border-t pt-5 text-sm">
        <p className="text-muted">Your school created your account? <Link className="font-semibold text-primary" href="/first-time-login">Set your password</Link></p>
        <p className="text-muted">Need a school workspace? <Link className="font-semibold text-primary" href="/schedule-demo">Contact SchoolOS</Link></p>
      </div>
    </div>
  );
}
