"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readStoredUser } from "@/lib/auth";

export default function Page() {
  const user = readStoredUser();
  const name =
    user?.name ?? [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  return (
    <>
      <PageHeader title="Profile" description="Manage your contact information." />
      <SectionCard
        title="Personal information"
        description="Keep your contact details current."
      >
        <form className="grid max-w-2xl gap-5 p-5 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Full name
            <Input className="mt-2" defaultValue={name} />
          </label>
          <label className="text-sm font-medium">
            Email address
            <Input className="mt-2" defaultValue={user?.email ?? ""} />
          </label>
          <label className="text-sm font-medium">
            Phone number
            <Input className="mt-2" defaultValue="" />
          </label>
          <label className="text-sm font-medium">
            Relationship
            <Input className="mt-2" defaultValue="" />
          </label>
          <div className="sm:col-span-2">
            <Button type="button">Save changes</Button>
          </div>
        </form>
      </SectionCard>
    </>
  );
}
