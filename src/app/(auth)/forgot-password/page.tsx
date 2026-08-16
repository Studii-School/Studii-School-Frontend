import Link from "@/features/navigation-progress/navigation-progress-link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export default function ForgotPasswordPage() { return <div className="w-full max-w-md"><Logo /><h1 className="mt-10 text-2xl font-bold">Reset your password</h1><p className="mt-2 text-sm leading-6 text-muted">Enter the email or phone number connected to your SchoolOS account.</p><form className="mt-7 space-y-5"><label className="block"><span className="mb-2 block text-sm font-medium">Email or phone number</span><Input placeholder="name@school.edu.ng" required /></label><Button className="w-full" type="submit">Send reset instructions</Button></form><Link className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary" href="/login"><ArrowLeft size={16} />Back to sign in</Link></div>; }
