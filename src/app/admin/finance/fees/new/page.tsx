"use client";
import { FeeStructureForm } from "@/features/finance/forms/fee-structure-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
export default function Page(){return <><PageHeader title="Create Fee Structure" description="Define an obligation and preview eligible students before activation."/><Card className="p-5"><FeeStructureForm onDone={()=>{}}/></Card></>}
