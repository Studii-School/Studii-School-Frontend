"use client";

import Link from "@/features/navigation-progress/navigation-progress-link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { firstTimePassword } from "@/lib/api";
import { normaliseRole, routeForRole } from "@/lib/auth";

export default function FirstTimeLoginPage() {
  const router = useRouter();
  const { toast } = useActionFeedback();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast("Passwords do not match.", "error");
      return;
    }
    setPending(true);
    try {
      const user = await firstTimePassword(email, password);
      toast("Password created successfully.", "success");
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(normaliseRole(user.role) === "Administrator" && next === "/school-onboarding"
        ? next
        : routeForRole(user.role));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Password could not be created.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <Logo />
      <h1 className="mt-10 text-2xl font-bold">Set your password</h1>
      <p className="mt-2 text-sm leading-6 text-muted">Use the email your school admin registered for you.</p>
      <form className="mt-7 space-y-5" onSubmit={submit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Email</span>
          <Input autoComplete="username" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <PasswordField autoComplete="new-password" label="New password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <PasswordField autoComplete="new-password" label="Confirm password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        <Button className="w-full" disabled={pending} type="submit">
          {pending ? "Creating password..." : "Create password"}
          <ArrowRight size={17} />
        </Button>
      </form>
      <Link className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary" href="/login"><ArrowLeft size={16} />Back to sign in</Link>
    </div>
  );
}
