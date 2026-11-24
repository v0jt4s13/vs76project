export const topics = ['AI w codziennej pracy','Projektowanie pilota AI','AI Security w firmie','Szkolenie z narzędzi AI','Przegląd zasad korzystania z AI','AI w edukacji','Doradztwo','Współpraca B2B','Pomoc w wyborze'];
export function nextTheme(current) { return ({auto:'light',light:'dark',dark:'auto'})[current] || 'auto'; }
export function createInquiry(data) {
 const read = (key,max) => String(data[key] || '').trim().slice(0,max);
 const topic = topics.includes(data.topic) ? data.topic : 'Pomoc w wyborze';
 return `Dzień dobry,\n\nchcę porozmawiać o: ${topic}.\n\nFirma / zespół: ${read('company',160) || 'do ustalenia'}\nOsoba kontaktowa: ${read('name',100)}\nE-mail: ${read('email',160)}\nLiczba osób: ${read('people',30) || 'do ustalenia'}\nForma: ${read('format',50) || 'do ustalenia'}\n\nCel i kontekst:\n${read('message',2500)}\n\nProszę o kontakt w sprawie zakresu i terminu.`;
}
export function mailtoUrl(recipient,body) {
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return null;
 return `mailto:${recipient}?subject=${encodeURIComponent('Zapytanie do vs76project')}&body=${encodeURIComponent(body)}`;
}
