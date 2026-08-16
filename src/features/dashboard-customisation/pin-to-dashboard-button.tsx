"use client";
import { useState } from "react";
import { Check,Pin,PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardLayouts } from "./dashboard-layout-context";
import type { PortalRole } from "./dashboard-widget.types";
export function PinToDashboardButton({role,widgetId}:{role:PortalRole;widgetId:string}){const {layouts,pin,unpin}=useDashboardLayouts();const widget=layouts[role].widgets.find((item)=>item.widgetId===widgetId);const pinned=Boolean(widget?.isPinned&&widget.isVisible);const [saved,setSaved]=useState(false);const toggle=async()=>{if(pinned)await unpin(role,widgetId);else await pin(role,widgetId);setSaved(true);setTimeout(()=>setSaved(false),1600)};return <Button type="button" variant="outline" onClick={()=>void toggle()}>{saved?<Check size={15}/>:pinned?<PinOff size={15}/>:<Pin size={15}/>} {saved?"Dashboard updated":pinned?"Unpin from dashboard":"Pin to dashboard"}</Button>}
