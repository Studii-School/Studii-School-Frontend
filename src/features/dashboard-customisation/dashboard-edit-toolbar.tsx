"use client";
import { Check,LayoutDashboard,RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
export function DashboardEditToolbar({editing,onEdit,onDone,onRestore}:{editing:boolean;onEdit:()=>void;onDone:()=>void;onRestore:()=>void}){return editing?<div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={onRestore}><RotateCcw size={16}/>Restore default</Button><Button type="button" onClick={onDone}><Check size={16}/>Done</Button></div>:<Button type="button" variant="outline" onClick={onEdit}><LayoutDashboard size={16}/>Edit dashboard</Button>}
