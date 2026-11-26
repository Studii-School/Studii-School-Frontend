const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const uppercaseDayPeriod = (value: string) =>
  value.replace(/\b(am|pm)\b/gi, (period) => period.toUpperCase());

function parseDisplayDate(value: string | Date) {
  if (value instanceof Date) return value;
  // Date-only values are calendar dates, so keep them in the local day.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Date(dateOnly ? `${value}T00:00:00` : value);
}

export function formatDate(value: string | Date) {
  const date = parseDisplayDate(value);
  return Number.isNaN(date.getTime()) ? String(value) : dateFormatter.format(date);
}

export function formatDateTime(value: string | Date) {
  const date = parseDisplayDate(value);
  return Number.isNaN(date.getTime()) ? String(value) : uppercaseDayPeriod(dateTimeFormatter.format(date));
}

export function formatTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return value;
  const date = new Date(2000, 0, 1, hours, minutes);
  return uppercaseDayPeriod(timeFormatter.format(date));
}

export function toLocalDateKey(date:Date){const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,"0"),day=String(date.getDate()).padStart(2,"0");return`${year}-${month}-${day}`}
export function isAttendanceDateEditable(date:string,currentDate=new Date()){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;return date===toLocalDateKey(currentDate)}
export function isUpcomingDate(startDate:string,endDate?:string){return(endDate??startDate)>=toLocalDateKey(new Date())}
export function formatEventDate(value: string) {
  return formatDate(value.slice(0, 10));
}
export const formatEventTime = formatTime;
