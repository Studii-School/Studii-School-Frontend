export function toLocalDateKey(date:Date){const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,"0"),day=String(date.getDate()).padStart(2,"0");return`${year}-${month}-${day}`}
export function isAttendanceDateEditable(date:string,currentDate=new Date()){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;return date===toLocalDateKey(currentDate)}
export function isUpcomingDate(startDate:string,endDate?:string){return(endDate??startDate)>=toLocalDateKey(new Date())}
export function formatEventDate(value:string){return new Date(`${value.slice(0,10)}T00:00:00`).toLocaleDateString([], {day:"numeric",month:"short",year:"numeric"})}
export function formatEventTime(value:string){const[hours,minutes]=value.split(":").map(Number);const date=new Date();date.setHours(hours,minutes,0,0);return date.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}
