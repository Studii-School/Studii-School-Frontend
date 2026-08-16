"use client";
import { useMemo,useState } from "react";
import { FileText,Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { PinToDashboardButton } from "@/features/dashboard-customisation/pin-to-dashboard-button";
import { isUpcomingDate } from "@/lib/date-utils";
import { useEvents } from "./events-context";
import { EventFilters } from "./event-filters";
import { EventForm } from "./event-form";
import { EventList } from "./event-list";
import type { EventCategory,SchoolEvent } from "./events.types";

export function EventsManager(){
  const{events,isLoading,error,createEvent,updateEvent,deleteEvent,publishEvent}=useEvents();
  const{confirm,toast}=useActionFeedback();
  const[search,setSearch]=useState("");
  const[category,setCategory]=useState<EventCategory|"All">("All");
  const[view,setView]=useState<"upcoming"|"past">("upcoming");
  const[editing,setEditing]=useState<SchoolEvent>();
  const[showForm,setShowForm]=useState(false);
  const filtered=useMemo(()=>events.filter((event)=>(category==="All"||event.category===category)&&`${event.title} ${event.shortDescription}`.toLowerCase().includes(search.trim().toLowerCase())&&(view==="upcoming"?isUpcomingDate(event.startDate,event.endDate):!isUpcomingDate(event.startDate,event.endDate))).sort((a,b)=>a.startDate.localeCompare(b.startDate)),[events,category,search,view]);
  const close=()=>{setShowForm(false);setEditing(undefined)};
  const remove=(id:string)=>{const item=events.find((event)=>event.id===id);if(!item)return;confirm({title:item.isPublished?"Delete published event?":"Delete event?",description:item.isPublished?"This published event will disappear from every connected portal. This action cannot be undone.":"This draft event will be permanently removed.",confirmLabel:"Delete Event",destructive:true,onConfirm:async()=>{await deleteEvent(id);toast("Event deleted successfully.","success")}})};
  const save=async(input:Parameters<typeof createEvent>[0])=>{try{if(editing)await updateEvent(editing.id,input);else await createEvent(input);toast(editing?"Event updated successfully.":"Event created successfully.","success");close()}catch(caught){toast(caught instanceof Error?caught.message:"Event could not be saved.","error")}};
  const publish=async(event:SchoolEvent)=>{try{await publishEvent(event.id,!event.isPublished);toast(event.isPublished?"Event unpublished successfully.":"Event published successfully.","success")}catch(caught){toast(caught instanceof Error?caught.message:"Event could not be updated.","error")}};
  return <>
    <PageHeader title="Events & Calendar" description="Create and publish events for the school community." action={<div className="flex gap-2"><PinToDashboardButton role="admin" widgetId="admin-events"/><Button onClick={()=>{setEditing(undefined);setShowForm(true)}}><Plus size={17}/>Create event</Button></div>}/>
    <div className="mb-5 grid gap-3 sm:grid-cols-3">{[["Upcoming",events.filter((event)=>isUpcomingDate(event.startDate,event.endDate)).length],["Published",events.filter((event)=>event.isPublished).length],["Drafts",events.filter((event)=>!event.isPublished).length]].map(([name,value])=><Card key={String(name)} className="p-4"><p className="text-xs text-muted">{name}</p><p className="mt-1 text-2xl font-bold">{value}</p></Card>)}</div>
    {showForm&&<Card className="mb-6 p-5"><div className="mb-5 flex items-center gap-2"><FileText size={19}/><h2 className="font-semibold">{editing?"Edit event":"New event"}</h2></div><EventForm key={editing?.id??"new"} event={editing} onCancel={close} onSubmit={save}/></Card>}
    <Card className="overflow-hidden"><EventFilters search={search} category={category} view={view} onSearch={setSearch} onCategory={setCategory} onView={setView}/>{isLoading?<div className="p-8 text-sm text-muted">Loading events...</div>:error?<div className="p-8 text-sm text-danger">{error}</div>:<EventList events={filtered} onEdit={(event)=>{setEditing(event);setShowForm(true);window.scrollTo({top:0,behavior:"smooth"})}} onDelete={remove} onPublish={(event)=>void publish(event)} onFeature={(event)=>void updateEvent(event.id,{isFeatured:!event.isFeatured})}/>}</Card>
  </>
}
