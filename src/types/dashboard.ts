import type { IconName } from "./navigation";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "primary";
export interface Stat { label: string; value: string; note: string; icon: IconName; tone?: StatusTone; }
export interface TableRow { [key: string]: string; }
export interface Announcement { title: string; date: string; audience: string; }
export interface EventItem { title: string; date: string; time: string; }
