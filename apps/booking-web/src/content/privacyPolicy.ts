// DRAFT legal text. Every statement must match repository behavior; see
// docs/legal/privacy-policy.md for what the owner must verify before publishing.

export type PrivacyPolicySection = {
  readonly heading: string;
  readonly paragraphs?: readonly string[];
  readonly items?: readonly string[];
};

export type PrivacyPolicyLanguage = {
  readonly lang: "cs" | "en";
  readonly id: string;
  readonly languageName: string;
  readonly title: string;
  readonly draftNotice: string;
  readonly effectiveDate: string;
  readonly sections: readonly PrivacyPolicySection[];
};

const czech: PrivacyPolicyLanguage = {
  lang: "cs",
  id: "cs",
  languageName: "Čeština",
  title: "Zásady ochrany osobních údajů",
  draftNotice:
    "Koncept – dosud nezkontrolováno právníkem. Text v hranatých závorkách musí provozovatel doplnit nebo ověřit před zveřejněním.",
  effectiveDate: "Účinnost od: [EFFECTIVE DATE]",
  sections: [
    {
      heading: "1. Kdo jsme",
      paragraphs: [
        "Chvilio je aplikace pro nezávislé poskytovatele služeb v Česku („poskytovatelé“), která jim umožňuje spravovat služby, pracovní dobu, klienty a rezervace, a veřejná rezervační stránka, přes kterou si klienti rezervují termíny.",
        "Provozovatel: [OPERATOR NAME], IČO [IČO], sídlo [ADDRESS]. Kontakt pro otázky ochrany osobních údajů: [CONTACT EMAIL].",
      ],
    },
    {
      heading: "2. Kdo za vaše údaje odpovídá",
      items: [
        "Účty poskytovatelů: provozovatel Chvilio je správcem osobních údajů poskytovatelů, kteří si v aplikaci vytvoří účet.",
        "Údaje klientů: poskytovatel, u kterého si klient rezervuje službu, je správcem údajů o svých klientech (včetně údajů zadaných přes rezervační stránku). Chvilio tyto údaje zpracovává jako zpracovatel podle pokynů poskytovatele. [K OVĚŘENÍ: rozdělení rolí správce/zpracovatel a smlouva o zpracování osobních údajů s poskytovateli.]",
        "Analytika rezervační stránky a aplikace: správcem je provozovatel Chvilio. [K OVĚŘENÍ]",
        "Klienti, kteří chtějí uplatnit svá práva, se mohou obrátit přímo na poskytovatele nebo na nás na [CONTACT EMAIL]; žádost poskytovateli předáme.",
      ],
    },
    {
      heading: "3. Jaké údaje zpracováváme",
      items: [
        "Účet poskytovatele: e-mail a heslo pro přihlášení (heslo ukládá ověřovací služba Supabase Auth pouze v zahashované podobě), název podniku, adresa rezervační stránky, služby, ceny, pracovní doba, rezervace a evidence plateb.",
        "Údaje klientů: jméno, e-mail, telefon (nepovinný), poznámky klienta a poskytovatele, historie rezervací, stav rezervace a důvod zrušení.",
        "Odkazy na správu rezervace: ukládáme pouze otisk (hash) odkazu, nikoli samotný odkaz.",
        "Technické údaje rezervační stránky: IP adresa odesílatele rezervace pro omezení zneužití (limit počtu požadavků) a technické záznamy, které brání duplicitnímu vytvoření rezervace.",
        "Údaje v prohlížeči (localStorage): zvolený jazyk a náhodný identifikátor pro analytiku. Nepoužíváme reklamní cookies.",
        "Analytické události: pouze předem definované události (např. otevření rezervační stránky, odeslání rezervace) s jazykem stránky a náhodným identifikátorem. Neodesíláme jména, e-maily, telefony, poznámky, adresy stránek ani identifikátory rezervací.",
        "Texty služeb pro překlad: název, popis a kategorie služby, pokud poskytovatel sám požádá o AI překlad. Údaje klientů se do překladu neodesílají.",
      ],
    },
    {
      heading: "4. Účely a právní základy",
      items: [
        "Poskytování aplikace a správa účtu poskytovatele – plnění smlouvy (čl. 6 odst. 1 písm. b) GDPR).",
        "Zpracování rezervací a údajů klientů pro poskytovatele – plnění smlouvy mezi poskytovatelem a klientem; Chvilio jedná jako zpracovatel. [K OVĚŘENÍ]",
        "Ochrana rezervační stránky před zneužitím (IP adresa, limity) – oprávněný zájem (čl. 6 odst. 1 písm. f) GDPR).",
        "Měření používání produktu bez jmen a kontaktů – [K OVĚŘENÍ: oprávněný zájem, nebo souhlas, protože identifikátor se ukládá v zařízení uživatele].",
        "E-maily o rezervaci (po jejich zapnutí) – plnění smlouvy a oprávněný zájem informovat klienta o stavu rezervace. [K OVĚŘENÍ]",
        "AI překlad textů služeb – plnění smlouvy na žádost poskytovatele.",
      ],
    },
    {
      heading: "5. Zpracovatelé a místo zpracování",
      items: [
        "Supabase (databáze, přihlášení, serverové funkce) – data uložena v regionu eu-west-2 (Londýn, Spojené království). Pro Spojené království platí rozhodnutí Evropské komise o odpovídající ochraně. [K OVĚŘENÍ: aktuální region a smlouva o zpracování.]",
        "Vercel (hostování rezervační stránky) – zpracovává technické údaje požadavků, např. IP adresu. [K OVĚŘENÍ: region a smlouva o zpracování.]",
        "PostHog (analytika) – projekt v EU (eu.i.posthog.com). [K OVĚŘENÍ: nastavení ukládání IP adresy a doba uchování.]",
        "Resend (odesílání e-mailů o rezervaci) – v současnosti není zapnuto. Po zapnutí zpracovává e-mail příjemce a obsah zprávy; vlastní záznamy uchovává 30 dní. [K OVĚŘENÍ: region a mechanismus předávání do USA.]",
        "OpenAI (AI překlad textů služeb) – pouze texty služeb na žádost poskytovatele, nikoli údaje klientů. Zpracování může probíhat v USA. [K OVĚŘENÍ: mechanismus předávání do USA.]",
      ],
    },
    {
      heading: "6. Jak dlouho údaje uchováváme",
      items: [
        "Účet poskytovatele: do jeho smazání. Poskytovatel může účet smazat v aplikaci; tím se smaže přihlašovací účet a podniky, jejichž je jediným vlastníkem, včetně služeb, klientů a rezervací.",
        "Údaje klientů: do doby, kdy je poskytovatel anonymizuje nebo smaže svůj účet. Anonymizace odstraní jméno, kontakty a poznámky; datum, služby a částky rezervací zůstanou pro evidenci poskytovatele.",
        "Fronta e-mailů o rezervaci: 30 dní po odeslání nebo selhání, neodeslané záznamy 90 dní.",
        "Odkazy na správu rezervace: platí obvykle do 7 dní po termínu (nejvýše 180 dní od vydání); otisky neplatných odkazů mažeme po 90 dnech.",
        "Záznamy o žádostech o AI překlad (bez textů služeb): přibližně 12 měsíců.",
        "IP adresy pro omezení zneužití a technické záznamy proti duplicitním rezervacím: [RETENTION PERIOD – K DOPLNĚNÍ].",
        "Záložní kopie a záznamy u zpracovatelů: [K OVĚŘENÍ].",
      ],
    },
    {
      heading: "7. Vaše práva",
      paragraphs: [
        "Máte právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování, přenositelnost a právo vznést námitku proti zpracování založenému na oprávněném zájmu. Pokud zpracování probíhá na základě souhlasu, můžete jej kdykoli odvolat.",
        "Žádost pošlete na [CONTACT EMAIL]. Klienti se mohou obrátit také přímo na svého poskytovatele.",
        "Máte právo podat stížnost u Úřadu pro ochranu osobních údajů (ÚOOÚ), Pplk. Sochora 27, 170 00 Praha 7, www.uoou.gov.cz.",
      ],
    },
    {
      heading: "8. Další informace",
      items: [
        "Neprovádíme automatizované rozhodování ani profilování s právními účinky.",
        "Osobní údaje neprodáváme a nepoužíváme je k reklamě.",
        "Tyto zásady můžeme aktualizovat; datum účinnosti je uvedeno výše.",
      ],
    },
  ],
};

const english: PrivacyPolicyLanguage = {
  lang: "en",
  id: "en",
  languageName: "English",
  title: "Privacy policy",
  draftNotice:
    "Draft – not yet reviewed by a lawyer. Text in square brackets must be completed or verified by the operator before publication.",
  effectiveDate: "Effective date: [EFFECTIVE DATE]",
  sections: [
    {
      heading: "1. Who we are",
      paragraphs: [
        "Chvilio is an app for independent service professionals in Czechia (“masters”) to manage services, working hours, clients and bookings, together with a public booking page where clients book appointments.",
        "Operator: [OPERATOR NAME], company ID (IČO) [IČO], registered address [ADDRESS]. Privacy contact: [CONTACT EMAIL].",
      ],
    },
    {
      heading: "2. Who is responsible for your data",
      items: [
        "Master accounts: the Chvilio operator is the controller of the personal data of masters who create an account in the app.",
        "Client data: the master a client books with is the controller of their clients' data (including data entered on the booking page). Chvilio processes that data as a processor on the master's instructions. [TO VERIFY: controller/processor split and the data processing agreement with masters.]",
        "Booking page and app analytics: the Chvilio operator is the controller. [TO VERIFY]",
        "Clients who want to exercise their rights can contact their master directly or us at [CONTACT EMAIL]; we will pass the request on to the master.",
      ],
    },
    {
      heading: "3. What data we process",
      items: [
        "Master account: sign-in email and password (the Supabase Auth service stores the password only as a hash), business name, booking page address, services, prices, working hours, bookings and payment records.",
        "Client data: name, email, phone (optional), client and master notes, booking history, booking status and cancellation reason.",
        "Booking management links: we store only a hash of the link, never the link itself.",
        "Booking page technical data: the IP address of a booking request to prevent abuse (request rate limits) and technical records that prevent the same booking from being created twice.",
        "Data in your browser (localStorage): your chosen language and a random analytics identifier. We do not use advertising cookies.",
        "Analytics events: only predefined events (for example, opening the booking page or submitting a booking) with the page language and a random identifier. We do not send names, emails, phone numbers, notes, page URLs or booking identifiers.",
        "Service texts for translation: service name, description and category, only when the master asks for an AI translation. Client data is never sent for translation.",
      ],
    },
    {
      heading: "4. Purposes and legal bases",
      items: [
        "Providing the app and managing master accounts – performance of a contract (Art. 6(1)(b) GDPR).",
        "Handling bookings and client data for masters – performance of the contract between the master and the client; Chvilio acts as a processor. [TO VERIFY]",
        "Protecting the booking page from abuse (IP address, rate limits) – legitimate interest (Art. 6(1)(f) GDPR).",
        "Product usage measurement without names or contact details – [TO VERIFY: legitimate interest, or consent because an identifier is stored on the user's device].",
        "Booking emails (once enabled) – performance of a contract and legitimate interest in informing the client about their booking. [TO VERIFY]",
        "AI translation of service texts – performance of a contract at the master's request.",
      ],
    },
    {
      heading: "5. Processors and locations",
      items: [
        "Supabase (database, sign-in, server functions) – data stored in region eu-west-2 (London, United Kingdom). The United Kingdom is covered by a European Commission adequacy decision. [TO VERIFY: current region and data processing agreement.]",
        "Vercel (booking page hosting) – processes technical request data such as IP addresses. [TO VERIFY: region and data processing agreement.]",
        "PostHog (analytics) – EU project (eu.i.posthog.com). [TO VERIFY: IP address storage settings and retention.]",
        "Resend (booking emails) – currently not enabled. Once enabled, it processes the recipient's email address and the message content and keeps its own logs for 30 days. [TO VERIFY: region and US transfer mechanism.]",
        "OpenAI (AI translation of service texts) – only service texts at the master's request, never client data. Processing may take place in the USA. [TO VERIFY: US transfer mechanism.]",
      ],
    },
    {
      heading: "6. How long we keep data",
      items: [
        "Master account: until it is deleted. Masters can delete their account in the app; this deletes the sign-in account and every business they solely own, including its services, clients and bookings.",
        "Client data: until the master anonymizes the client or deletes their account. Anonymization removes the name, contact details and notes; booking dates, services and amounts remain in the master's records.",
        "Booking email queue: 30 days after sending or failure; unsent records 90 days.",
        "Booking management links: normally valid until 7 days after the appointment (at most 180 days from issue); hashes of invalid links are deleted after 90 days.",
        "AI translation request records (without service texts): about 12 months.",
        "IP addresses for abuse prevention and technical records against duplicate bookings: [RETENTION PERIOD – TO BE SET].",
        "Backups and processor logs: [TO VERIFY].",
      ],
    },
    {
      heading: "7. Your rights",
      paragraphs: [
        "You have the right to access, rectify and erase your data, to restrict processing, to data portability and to object to processing based on legitimate interest. Where processing is based on consent, you can withdraw it at any time.",
        "Send requests to [CONTACT EMAIL]. Clients can also contact their master directly.",
        "You have the right to lodge a complaint with the Czech Office for Personal Data Protection (ÚOOÚ), Pplk. Sochora 27, 170 00 Prague 7, www.uoou.gov.cz.",
      ],
    },
    {
      heading: "8. Other information",
      items: [
        "We do not carry out automated decision-making or profiling with legal effects.",
        "We do not sell personal data or use it for advertising.",
        "We may update this policy; the effective date is shown above.",
      ],
    },
  ],
};

export const privacyPolicyLanguages: readonly PrivacyPolicyLanguage[] = [
  czech,
  english,
];
