export function normalizeSearch(value:string){return value.trim().replace(/\s+/g," ").toLowerCase()}
export function matchesSearch(query:string,...values:Array<string|number|undefined>){const normalized=normalizeSearch(query);return !normalized||values.some((value)=>String(value??"").toLowerCase().includes(normalized))}
