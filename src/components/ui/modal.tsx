"use client";

import { SidePanel } from "@/components/ui/side-panel";

export interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "md" | "lg" | "xl" | "2xl";
  presentation?: "panel" | "modal";
  onClose: () => void;
}

export function Modal({ open, title, description, children, maxWidth = "lg", presentation = "panel", onClose }: ModalProps) {
  return <SidePanel open={open} title={title} description={description} onClose={onClose} maxWidth={maxWidth} presentation={presentation}>{children}</SidePanel>;
}
