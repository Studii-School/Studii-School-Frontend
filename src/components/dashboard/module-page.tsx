"use client";
import { Plus } from "lucide-react";
import { useMemo,useState } from "react";
import { PageHeader } from "./page-header";
import { SimpleTable } from "./simple-table";
import { SectionCard } from "./section-card";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import type { TableRow } from "@/types";
export function ModulePage({ title, description, rows, columns, actionLabel, headerAction }: { title: string; description: string; rows: TableRow[]; columns: Array<{ key: string; label: string }>; actionLabel?: string; headerAction?: React.ReactNode }) { const[query,setQuery]=useState("");const filtered=useMemo(()=>rows.filter((row)=>!query.trim()||columns.some(({key})=>String(row[key]??"").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))),[rows,columns,query]);return <><PageHeader title={title} description={description} action={headerAction ?? (actionLabel ? <Button><Plus size={17} />{actionLabel}</Button> : undefined)} /><SectionCard title={`All ${title.toLowerCase()}`} description={`${filtered.length} result(s)`}><div className="border-b p-4"><SearchInput value={query} onChange={setQuery} placeholder={`Search ${title.toLowerCase()}`} /></div>{filtered.length?<SimpleTable columns={columns} rows={filtered} />:<p className="p-8 text-center text-sm text-muted">No {title.toLowerCase()} match “{query.trim()}”.</p>}</SectionCard></>; }
