"use client";
import { createContext,useContext } from "react";
export type ToastTone="success"|"error"|"warning"|"info";
export interface ConfirmOptions{title:string;description:string;confirmLabel:string;destructive?:boolean;reasonLabel?:string;onConfirm:(reason?:string)=>Promise<void>|void}
export interface ActionFeedbackValue{confirm(options:ConfirmOptions):void;toast(message:string,tone?:ToastTone):void}
export const ActionFeedbackContext=createContext<ActionFeedbackValue|null>(null);
export function useActionFeedback(){const value=useContext(ActionFeedbackContext);if(!value)throw new Error("useActionFeedback must be used within ActionFeedbackProvider");return value}
