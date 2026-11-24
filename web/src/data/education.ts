// Dział "Edukacja": programy dla dyrekcji i nauczycieli. Kolejne programy dopisuj do tablicy (strona i lista powstają same).
export type EduPoint = { text: string; sub?: string[] };
export type EduModule = { n: number; title: string; hours: string; who: string; points: EduPoint[] };
export type EduProgram = {
  id: string; slug: string; name: string; short: string; lead: string; audience: string; format: string;
  duration: string; schedule: string; requirements: string;
  goals: { who: string; text: string }[]; modules: EduModule[]; benefits: { title: string; text: string }[]; boundary: string;
};
export const eduPrograms: EduProgram[] = [
 {
  id: 'E1', slug: 'ai-w-edukacji',
  name: 'AI w edukacji: jak przewodzić zmianie, nie zostać w tyle i wzbogacić lekcje',
  short: 'AI w edukacji',
  lead: 'Warsztaty dla dyrekcji i nauczycieli: mniej czasu na przygotowanie materiałów, lekcje z AI i jasne zasady dla szkoły.',
  audience: 'Dyrekcja oraz nauczyciele szkół podstawowych i średnich.',
  format: 'Warsztaty praktyczne z elementami wykładu i dyskusji, stacjonarnie lub online.',
  duration: '8 godzin dydaktycznych',
  schedule: '1 dzień albo 2 bloki po 4 godziny',
  requirements: 'Narzędzie AI, konta uczestników i zakres dopuszczonych danych uzgadniamy przed terminem. Bez programowania.',
  goals: [
   { who: 'Dla dyrekcji', text: 'Zrozumienie wyzwań i szans związanych z AI, ramy organizacyjne i zasady oceniania prac oraz zapobieganie plagiatom.' },
   { who: 'Dla nauczycieli', text: 'Praktyczne narzędzia AI w codziennej pracy (przygotowanie materiałów, sprawdzanie prac) i angażujące lekcje.' },
   { who: 'Dla obu grup', text: 'Zrozumienie, jak uczniowie korzystają z AI, i budowanie ich krytycznego myślenia zamiast walki z wiatrakami.' },
  ],
  modules: [
   { n: 1, title: 'AI w oczach ucznia: krajobraz technologiczny w szkole', hours: '1,5 h', who: 'Dyrekcja i nauczyciele', points: [
    { text: 'Świat uczniów a świat szkoły: jak uczniowie używają asystentów AI (np. ChatGPT, Claude) i narzędzi pomocniczych do odrabiania zadań i pisania prac.' },
    { text: 'Uczciwość akademicka: dlaczego wykrywacze AI nie są w pełni niezawodne i jak zmienić podejście do prac domowych.' },
    { text: 'Świadomość zagrożeń: halucynacje modeli, bańki informacyjne, ochrona prywatności i danych osobowych (RODO w szkole).' },
   ] },
   { n: 2, title: 'AI w służbie nauczyciela: oszczędność czasu', hours: '2 h', who: 'Nauczyciele', points: [
    { text: 'Prompt engineering dla edukatorów: jak rozmawiać z modelami językowymi, żeby otrzymywać wartościowe odpowiedzi.' },
    { text: 'Generowanie materiałów dydaktycznych:', sub: [
     'sprawdziany, karty pracy, krzyżówki i teksty z lukami o różnym poziomie trudności,',
     'dostosowanie treści do uczniów ze specjalnymi potrzebami edukacyjnymi (SPE),',
     'przygotowanie planów lekcji, rozkładów materiału i scenariuszy zajęć.',
    ] },
    { text: 'Informacja zwrotna i ocenianie: kryteria oceniania (rubryki) i konstruktywny feedback wspierany narzędziami.' },
   ] },
   { n: 3, title: 'Angażowanie uczniów: AI na żywo na lekcji', hours: '2,5 h', who: 'Nauczyciele', points: [
    { text: 'Interaktywne metody nauczania z AI:', sub: [
     'AI jako partner do dyskusji: odgrywanie ról (np. rozmowa z postacią historyczną lub naukowcem),',
     'AI jako „uczeń”: poprawianie błędów popełnionych przez model językowy (trening myślenia krytycznego).',
    ] },
    { text: 'Narzędzia wspomagające prowadzenie zajęć:', sub: [
     'grafiki, ilustracje i prezentacje wizualne na potrzeby lekcji,',
     'interaktywne quizy i mapy myśli wspierane przez AI,',
     'aplikacje przydatne dla przedmiotów humanistycznych, ścisłych i językowych.',
    ] },
   ] },
   { n: 4, title: 'AI w zarządzaniu szkołą: panel dla dyrekcji i liderów', hours: '2 h', who: 'Dyrekcja i liderzy', points: [
    { text: 'Polityka szkoły wobec AI: jak prosty kodeks korzystania zapobiega konfliktom i nieporozumieniom.' },
    { text: 'Strategia wdrożenia: wsparcie nauczycieli w adaptacji nowych narzędzi i zapobieganie wykluczeniu cyfrowemu w gronie pedagogicznym.' },
    { text: 'Bezpieczeństwo cyfrowe i etyka: ochrona wizerunku i danych uczniów przy korzystaniu z generatorów treści.' },
    { text: 'Warsztat podsumowujący: pierwsze założenia polityki AI dla placówki.' },
   ] },
  ],
  benefits: [
   { title: 'Czas na przygotowanie materiałów', text: 'Celem jest skrócenie czasu przygotowania materiałów i dokumentacji. Skala zależy od przedmiotu, doświadczenia i narzędzi, dlatego mierzymy ją razem ze szkołą i nie obiecujemy procentowych oszczędności.' },
   { title: 'Lekcje, które angażują', text: 'Uczniowie pracują z narzędziami, które znają, a nauczyciel kieruje ich uwagę na sprawdzanie, porównywanie i krytyczne myślenie.' },
   { title: 'Pewność w pracy z AI', text: 'Zrozumienie, jak działają modele i jakie mają ograniczenia, ułatwia świadome decyzje i spokojniejszą rozmowę z uczniami.' },
   { title: 'Rozwiązania systemowe', text: 'Dyrekcja wychodzi z pierwszymi założeniami polityki AI dla placówki i wskazówkami, jak ustalić przejrzyste zasady korzystania z technologii.' },
  ],
  boundary: 'To szkolenie edukacyjne. Nie jest opinią prawną (w tym w zakresie RODO i prawa oświatowego), certyfikacją ani audytem szkoły. Nie gwarantujemy skuteczności wykrywaczy AI ani wyników generowanych przez modele; wyniki zawsze wymagają sprawdzenia przez nauczyciela.',
 },
];
