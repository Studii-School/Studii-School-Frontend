import { Badge } from "@/components/ui/badge";
import { invoiceTone,reconciliationTone } from "../finance-utils";
import type { InvoiceStatus,ReconciliationStatus } from "../finance.types";
export function InvoiceStatusBadge({status}:{status:InvoiceStatus}){return <Badge tone={invoiceTone(status)}>{status}</Badge>}
export function ReconciliationStatusBadge({status}:{status:ReconciliationStatus}){return <Badge tone={reconciliationTone(status)}>{status}</Badge>}
