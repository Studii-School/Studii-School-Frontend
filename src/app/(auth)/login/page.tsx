"use client";

import Link from "@/features/navigation-progress/navigation-progress-link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Input } from "@/components/ui/input";
import { buttonStyles } from "@/components/ui/button";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { login } from "@/lib/api";
import { routeForRole } from "@/lib/auth";

const portalOptions = [
  { label: "Super Admin", helper: "Platform access" },
  { label: "Admin", helper: "School admin access" },
  { label: "Teacher", helper: "Teacher portal" },
  { label: "Student", helper: "Student portal" },
  { label: "Parent", helper: "Parent portal" },
];

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useActionFeedback();
  const [selectedPortal, setSelectedPortal] = useState(portalOptions[0]);
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

  function choosePortal(option: (typeof portalOptions)[number]) {
    setSelectedPortal(option);
    setEmail("");
    setPassword("");
  }

  return <div className="w-full max-w-md"><Logo /><div className="mt-10"><h1 className="text-2xl font-bold tracking-tight">Welcome back</h1><p className="mt-2 text-sm text-muted">Sign in to continue to your school portal.</p></div><div className="mt-7"><p className="mb-2 text-sm font-medium">Login as</p><div className="grid gap-2 sm:grid-cols-2">{portalOptions.map((option) => { const active = selectedPortal.label === option.label; return <button className={buttonStyles(active ? "primary" : "outline")} key={option.label} type="button" onClick={() => choosePortal(option)} aria-pressed={active}>{active && <Check size={15} />}<span className="text-left"><span className="block leading-tight">{option.label}</span><span className="block text-[11px] font-normal opacity-75">{option.helper}</span></span></button>; })}</div></div><form className="mt-7 space-y-5" onSubmit={submit}><label className="block"><span className="mb-2 block text-sm font-medium">{selectedPortal.label} email</span><Input autoComplete="username" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="block"><span className="mb-2 block text-sm font-medium">Password</span><Input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label><div className="flex items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2"><input className="size-4 accent-primary" type="checkbox" />Remember me</label><Link className="font-medium text-primary hover:text-primary-hover" href="/forgot-password">Forgot password?</Link></div><button className={buttonStyles("primary") + " w-full"} type="submit" disabled={pending}>{pending ? "Signing in..." : `Sign in as ${selectedPortal.label}`} <ArrowRight size={17} /></button></form><Link className="mt-5 block text-center text-sm font-semibold text-primary" href="/first-time-login">Logging in for the first time? Create your password</Link><p className="mt-6 text-center text-xs text-muted">Access is granted only after the backend confirms the user credentials.</p></div>;
}
