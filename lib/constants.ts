export const CITY_COORDINATES: Record<string, { lat: number; lng: number; radius: number }> = {
  'Cluj-Napoca':     { lat: 46.7712, lng: 23.6236, radius: 15000 },
  'Brașov':          { lat: 45.6427, lng: 25.5887, radius: 15000 },
  'Sibiu':           { lat: 45.7983, lng: 24.1256, radius: 12000 },
  'Târgu Mureș':     { lat: 46.5386, lng: 24.5575, radius: 12000 },
  'Alba Iulia':      { lat: 46.0669, lng: 23.5799, radius: 10000 },
  'Bistrița':        { lat: 47.1333, lng: 24.5000, radius: 10000 },
  'Deva':            { lat: 45.8833, lng: 22.9000, radius: 8000  },
  'Sighișoara':      { lat: 46.2197, lng: 24.7937, radius: 6000  },
  'Sfântu Gheorghe': { lat: 45.8670, lng: 25.7870, radius: 8000  },
  'Miercurea Ciuc':  { lat: 46.3578, lng: 25.8024, radius: 8000  },
  'Zalău':           { lat: 47.1897, lng: 23.0569, radius: 8000  },
  'Turda':           { lat: 46.5667, lng: 23.7833, radius: 6000  },
  'Oradea':          { lat: 47.0458, lng: 21.9189, radius: 15000 },
  'Timișoara':       { lat: 45.7489, lng: 21.2087, radius: 18000 },
  'Arad':            { lat: 46.1700, lng: 21.3150, radius: 12000 },
  'București':       { lat: 44.4268, lng: 26.1025, radius: 25000 },
  'Iași':            { lat: 47.1585, lng: 27.6014, radius: 15000 },
  'Constanța':       { lat: 44.1765, lng: 28.6480, radius: 15000 },
  'Craiova':         { lat: 44.3302, lng: 23.7949, radius: 12000 },
  'Ploiești':        { lat: 44.9365, lng: 26.0226, radius: 12000 },
}

export const BUSINESS_CATEGORIES: Record<string, string> = {
  restaurant:      'Restaurant / Cafenea',
  dentist:         'Cabinet Stomatologic',
  beauty_salon:    'Salon de Înfrumusețare',
  car_repair:      'Service Auto',
  plumber:         'Instalator / Sanitare',
  electrician:     'Electrician',
  lawyer:          'Cabinet Avocat',
  accounting:      'Contabilitate',
  lodging:         'Hotel / Pensiune',
  hair_care:       'Frizerie / Coafor',
  doctor:          'Cabinet Medical',
  gym:             'Sală de Fitness',
  florist:         'Florărie',
  bakery:          'Brutărie / Patiserie',
  veterinary_care: 'Cabinet Veterinar',
  moving_company:  'Firmă Mutări',
  photographer:    'Studio Foto / Video',
}

export interface PainPoint {
  pain: string
  gain: string
  hook: string
  urgency: string
}

export const CATEGORY_PAIN_POINTS: Record<string, PainPoint> = {
  restaurant: {
    pain: 'clienții nu vă pot vedea meniul online, nu pot rezerva o masă și nu vă găsesc pe Google',
    gain: 'rezervări online, meniu digital, prezență pe Google și TripAdvisor',
    hook: '72% dintre oameni caută restaurante online înainte să iasă din casă',
    urgency: 'restaurantele cu site primesc cu 40% mai multe rezervări în weekend-urile aglomerate',
  },
  dentist: {
    pain: 'pacienții noi nu vă găsesc și merg la concurența care are site modern',
    gain: 'programări online 24/7, imagine profesională, pacienți noi în fiecare lună',
    hook: '85% dintre pacienți verifică online înainte de a alege un stomatolog',
    urgency: 'cabinetele cu site primesc în medie 8-12 programări noi pe lună din online',
  },
  beauty_salon: {
    pain: 'clienții vă caută pe Instagram dar nu găsesc orarul, prețurile sau o modalitate să rezerve',
    gain: 'programări online, galerie foto cu lucrările tale, mai puține telefoane de rezervare',
    hook: 'femeile caută saloane pe Google înainte, nu în cartea de telefoane',
    urgency: 'salonul de lângă tine are deja site și apare primul în căutări',
  },
  car_repair: {
    pain: 'când mașina se strică, oamenii caută urgent pe Google – dacă nu ești acolo, mergi la concurență',
    gain: 'clienți noi organic din Google, listă de servicii și prețuri, credibilitate',
    hook: '"service auto + [orașul tău]" e căutat de mii de ori pe lună',
    urgency: 'service-urile cu site apar primele în Google Maps și primesc 3x mai multe apeluri',
  },
  plumber: {
    pain: 'când țevile se sparg la ora 10 noaptea, clientul caută pe Google – nu în agendă',
    gain: 'apeluri urgente non-stop, zonă de acoperire clară, recenzii verificate',
    hook: '"instalator urgență [oraș]" e una dintre cele mai căutate fraze locale',
    urgency: 'instalatorii cu site sunt contactați de 4x mai mulți clienți noi lunar',
  },
  electrician: {
    pain: 'clienții nu știu ce servicii oferi, la ce prețuri și dacă ești disponibil',
    gain: 'lead-uri noi zilnic, portofoliu de lucrări, zonă de activitate',
    hook: 'căutările pentru electricieni locali au crescut cu 60% în ultimii 2 ani',
    urgency: 'fără site, ești invizibil pentru 90% din clienții potențiali din zona ta',
  },
  lawyer: {
    pain: 'clienții caută avocați pe Google, nu din gură în gură – fără site, pierzi clienți zilnic',
    gain: 'consultanță online, credibilitate profesională, clienți noi din zona ta',
    hook: '68% dintre români caută avocați online înainte de primul contact',
    urgency: 'cabinetele cu site obțin 5-10 consultanțe noi pe lună din prezența online',
  },
  accounting: {
    pain: 'firmele tinere caută contabili pe Google – fără site, nu exiști pentru ei',
    gain: 'clienți noi lunar, imagine profesională, formulare de contact',
    hook: 'start-up-urile și firmele noi își caută contabilul exclusiv online',
    urgency: 'sezonul declarațiilor e acum – firmele își caută contabilul chiar în această perioadă',
  },
  lodging: {
    pain: 'turiștii rezervă pe Booking.com și plătești comision mare – un site propriu te scapă de asta',
    gain: 'rezervări directe fără comision, galerie foto profesională, pachete speciale',
    hook: '20-30% economii la comisioane dacă ai site propriu și rezervări directe',
    urgency: 'sezonul turistic se apropie – turiștii își planifică vacanțele chiar acum',
  },
  hair_care: {
    pain: 'clienții vin la recomandare, dar rata de clienți noi e mică fără prezență online',
    gain: 'rezervări online, galerie cu stiluri, fidelizare clienți existenți',
    hook: 'salonul cu site apare în top 3 Google Maps când cineva caută "coafor [orașul tău]"',
    urgency: 'poziția în Google se construiește în timp – cu cât începi mai devreme, cu atât ești mai sus',
  },
  doctor: {
    pain: 'pacienții noi nu știu ce specialități oferi, programul sau cum te contactează',
    gain: 'programări online, listă de servicii, credibilitate și încredere',
    hook: '90% din pacienți caută online informații despre medic înainte de prima vizită',
    urgency: 'cabinetele cu site profesional sunt percepute ca mai competente și mai organizate',
  },
  gym: {
    pain: 'oamenii caută săli de sport pe Google – fără site, mergi la sala de lângă care apare online',
    gain: 'abonamente online, program clase, galerie echipamente și spațiu',
    hook: 'ianuarie și septembrie = vârful căutărilor pentru săli de sport',
    urgency: 'competiția ta e deja online – fiecare zi fără site e o zi cu clienți pierduți',
  },
  florist: {
    pain: 'de Valentine\'s, 8 Martie și nunți, oamenii comandă flori online – tu ești acolo?',
    gain: 'comenzi online, catalog produse, livrare în oraș',
    hook: 'florile sunt unul dintre cele mai cumpărate cadouri online în România',
    urgency: 'sezoanele de nunți aduc cel mai mult trafic online pentru florării',
  },
  bakery: {
    pain: 'comenzile de tort pentru evenimente se fac tot mai mult online, nu telefonic',
    gain: 'comenzi torturi aniversare și evenimente, catalog produse, program',
    hook: 'căutările pentru "tort comandă [oraș]" sunt în continuă creștere',
    urgency: 'sezoanele de communioane și nunți sunt aproape – comenzile vin online',
  },
  veterinary_care: {
    pain: 'stăpânii de animale caută veterinari pe Google în momente de urgență',
    gain: 'programări online, liste servicii, hartă cu localizarea exactă',
    hook: '"veterinar [oraș]" e căutat zilnic de sute de stăpâni de animale',
    urgency: 'clinicile veterinare cu site sunt contactate cu 60% mai des decât cele fără',
  },
  moving_company: {
    pain: 'oamenii caută firme de mutări pe Google când se mută – nu din recomandări',
    gain: 'cereri de ofertă online, calculator transport, recenzii verificate',
    hook: '"firmă mutări [oraș]" are sute de căutări lunare în fiecare oraș mare',
    urgency: 'primăvara e sezonul mutărilor – cereri de ofertă vin online chiar acum',
  },
  photographer: {
    pain: 'mirii și clienții verifică obligatoriu portofoliul online – fără site, nici nu exiști',
    gain: 'portofoliu online, cereri de rezervare, prețuri și pachete clare',
    hook: '95% din mirii care caută fotograf verifică site-ul înainte de a contacta',
    urgency: 'cuplurile care se căsătoresc vara rezervă fotograful cu 6-12 luni înainte',
  },
  default: {
    pain: 'clienții potențiali nu te pot găsi online și merg la concurența care are prezență web',
    gain: 'vizibilitate online 24/7, clienți noi în fiecare lună, imagine profesională',
    hook: '97% din consumatori caută servicii locale pe internet înainte să cumpere',
    urgency: 'fiecare zi fără website e o zi în care clienții merg la concurența ta',
  },
}
