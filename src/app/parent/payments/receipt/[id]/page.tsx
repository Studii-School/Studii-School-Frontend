import { ReceiptPageContent } from "@/features/finance/receipt-page-content";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ReceiptPageContent id={id}/>}
