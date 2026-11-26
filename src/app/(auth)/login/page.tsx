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
import { routeForRole } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useActionFeedback();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const user = await login(email, password);
      toast("Signed in successfully.", "success");
      router.replace(routeForRole(user.role));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Unable to sign in.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <Logo href="/" />
      <div className="mt-10">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">Sign in to continue to your account.</p>
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
        <button className={buttonStyles("primary") + " w-full"} type="submit" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
          <ArrowRight size={17} />
        </button>
      </form>
      <Link className="mt-5 block text-center text-sm font-semibold text-primary" href="/first-time-login">
        Logging in for the first time? Create your password
      </Link>
    </div>
  );
}
