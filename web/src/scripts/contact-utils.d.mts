export const topics: string[];
export function nextTheme(current:string): 'auto'|'light'|'dark';
export function createInquiry(data:Record<string,unknown>):string;
export function mailtoUrl(recipient:string,body:string):string|null;
