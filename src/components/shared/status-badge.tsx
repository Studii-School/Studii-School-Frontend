import { Badge } from "@/components/ui/badge";
export function StatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase(); const tone = lower.includes("paid") || lower === "active" || lower === "submitted" ? "success" : lower.includes("pending") || lower.includes("progress") || lower === "review" ? "warning" : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}
