import Link from "@/features/navigation-progress/navigation-progress-link";
import { Logo } from "@/components/shared/logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export default function ResetPasswordPage() { return <div className="w-full max-w-md"><Logo /><h1 className="mt-10 text-2xl font-bold">Create a new password</h1><p className="mt-2 text-sm text-muted">Use at least eight characters for your new password.</p><form className="mt-7 space-y-5"><label className="block"><span className="mb-2 block text-sm font-medium">New password</span><Input type="password" required /></label><label className="block"><span className="mb-2 block text-sm font-medium">Confirm password</span><Input type="password" required /></label><Button className="w-full" type="submit">Update password</Button></form><Link className="mt-6 block text-center text-sm font-medium text-primary" href="/login">Return to sign in</Link></div>; }
