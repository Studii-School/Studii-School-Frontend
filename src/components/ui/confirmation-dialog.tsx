"use client";
import { useEffect,useId,useRef } from "react";
import { LoaderCircle,X } from "lucide-react";
import { Button } from "./button";

export interface ConfirmationDialogProps {
  open:boolean;
  title:string;
  description:string;
  confirmLabel:string;
  destructive?:boolean;
  isLoading?:boolean;
  reasonLabel?:string;
  reason?:string;
  onReasonChange?:(value:string)=>void;
  onConfirm:()=>void;
  onCancel:()=>void;
}

export function ConfirmationDialog({open,title,description,confirmLabel,destructive=false,isLoading=false,reasonLabel,reason="",onReasonChange,onConfirm,onCancel}:ConfirmationDialogProps){const titleId=useId(),descriptionId=useId(),panelRef=useRef<HTMLDivElement>(null),cancelRef=useRef<HTMLButtonElement>(null),previousFocus=useRef<HTMLElement|null>(null);useEffect(()=>{if(!open)return;previousFocus.current=document.activeElement as HTMLElement;cancelRef.current?.focus();const key=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!isLoading)onCancel();if(event.key!=="Tab")return;const focusable=panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),textarea:not([disabled]),input:not([disabled])');if(!focusable?.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}};const previousOverflow=document.body.style.overflow;document.body.style.overflow="hidden";document.addEventListener("keydown",key);return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener("keydown",key);previousFocus.current?.focus()}},[open,isLoading,onCancel]);if(!open)return null;return <div className="fixed inset-0 z-[100] flex justify-end bg-black/45" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget&&!isLoading)onCancel()}}><div ref={panelRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="h-full w-full max-w-md overflow-y-auto border-l bg-surface p-5 shadow-2xl animate-[drawer-in_180ms_ease-out] sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 id={titleId} className="text-lg font-bold">{title}</h2><p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">{description}</p></div><button type="button" disabled={isLoading} onClick={onCancel} aria-label="Close confirmation panel" className="rounded-lg p-2 text-muted hover:bg-surface-muted"><X size={18}/></button></div>{reasonLabel&&<label className="mt-5 block text-sm font-medium">{reasonLabel}<textarea autoFocus className="mt-2 min-h-24 w-full rounded-[10px] border bg-surface p-3 outline-none focus:ring-2 focus:ring-primary/20" value={reason} onChange={(event)=>onReasonChange?.(event.target.value)} required/></label>}<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button ref={cancelRef} type="button" variant="outline" disabled={isLoading} onClick={onCancel}>Cancel</Button><Button type="button" variant={destructive?"danger":"primary"} disabled={isLoading||Boolean(reasonLabel&&!reason.trim())} onClick={onConfirm}>{isLoading&&<LoaderCircle className="animate-spin" size={16}/>} {isLoading?`${confirmLabel.replace(/e?$/i,"")}ing...`:confirmLabel}</Button></div></div></div>}
