# Business Outreach Automator v2.0 🇷🇴

Gaseste afaceri din Romania fara website si trimite-le oferte personalizate prin **WhatsApp** sau Email.

---

## De ce WhatsApp (nu Email)?

| | WhatsApp | Email |
|---|---|---|
| Rata deschidere | **98%** | 20% |
| Email disponibil in Google Places | 5% | - |
| Parere ca spam | Rara | Frecventa |
| Raspuns in aceeasi zi | **DA** | Rar |

**Concluzie:** Email-ul lipseste din aproape toate listingurile Google. WhatsApp e calea directa.

---

## Instalare (5 minute)

```bash
cd scripts/
pip install -r requirements.txt
cp ../.env.example ../.env
# Editeaza .env cu datele tale
```

---

## Configurare .env

**Obligatoriu:**
- `GOOGLE_PLACES_API_KEY` → https://console.cloud.google.com/ (activeaza Places API)
- `ANTHROPIC_API_KEY` → https://console.anthropic.com/
- `SENDER_NAME`, `YOUR_PHONE`, `YOUR_WEBSITE`, `YOUR_PORTFOLIO_URL`

**Setari campanie:**
- `TARGET_CITIES` → orase mari tinta
- `TARGET_SMALL_CITIES` → lasa gol = se adauga automat localitati mici din jur
- `TARGET_CATEGORIES` → tipuri de afaceri (vezi lista mai jos)
- `PRICE_FROM`, `PRICE_TO`, `DELIVERY_DAYS` → apar in mesajele WA

---

## Comenzi rapide

```bash
cd scripts/

# RECOMANDAT PENTRU AZI: campanie WhatsApp, localitati mici
python main.py --whatsapp-only --small-cities-only

# Un oras + categorie specifica (cel mai rapid test)
python main.py --whatsapp-only --city "Câmpia Turzii" --category beauty_salon

# Preview mesaje fara sa trimiti nimic
python main.py --preview 5

# Gaseste leads si exporta CSV (fara a trimite nimic)
python main.py --find-only

# Campanie completa (WA + email)
python main.py

# Dry run - simuleaza totul
python main.py --dry-run
```

---

## Categorii disponibile

| Cod | Descriere | Conversie |
|-----|-----------|-----------|
| `beauty_salon` | Salon Înfrumusețare | ⭐⭐⭐ |
| `lodging` | Hotel/Pensiune | ⭐⭐⭐ |
| `car_repair` | Service Auto | ⭐⭐⭐ |
| `hair_care` | Frizerie/Coafor | ⭐⭐⭐ |
| `restaurant` | Restaurant/Cafenea | ⭐⭐ |
| `dentist` | Cabinet Stomatologic | ⭐⭐ |
| `photographer` | Studio Foto/Video | ⭐⭐ |
| `bakery` | Brutărie/Patiserie | ⭐⭐ |
| `plumber` | Instalator | ⭐⭐ |
| `electrician` | Electrician | ⭐⭐ |
| `lawyer` | Cabinet Avocat | ⭐ |
| `accounting` | Contabilitate | ⭐ |
| `gym` | Sală Fitness | ⭐ |
| `florist` | Florărie | ⭐ |
| `veterinary_care` | Cabinet Veterinar | ⭐ |
| `moving_company` | Firmă Mutări | ⭐ |

---

## Locatii disponibile

**Orase mari:** 32 (de la București la Tulcea)

**Localitati mici** (concurenta zero!): 45+
- Cluj: Câmpia Turzii, Gherla, Huedin, Florești
- Brașov: Săcele, Codlea, Zărnești, Râșnov, Predeal
- Sibiu: Mediaș, Cisnădie, Avrig
- Mureș: Reghin, Luduș
- Alba: Sebeș, Blaj
- Bihor: Beiuș, Salonta, Marghita
- Timiș: Lugoj, Deta
- Prahova: Sinaia, Bușteni, Câmpina
- Constanța: Mangalia, Eforie Nord, Năvodari
- Suceava: Câmpulung Moldovenesc, Rădăuți, Vatra Dornei
- ...și multe altele

---

## Workflow recomandat

### Ziua 1 (azi): Primul client

1. `python main.py --find-only --city "Câmpia Turzii" --category beauty_salon`
2. Deschide `data/leads_export.csv` → verifici numerele
3. `python main.py --whatsapp-only --city "Câmpia Turzii" --category beauty_salon`
4. Deschide CSV-ul generat → click link WA → copiaza mesaj → trimite
5. Trimiti **15-20 mesaje manual** (nu mai mult)
6. Astepti raspunsuri → urmaresti in coloana "Status"

### Ziua 2-7: Scalare

- Adaugi mai multe categorii si orase mici
- Raspunzi rapid la mesaje (in primele 2 ore)
- Propui un apel de 15 minute sau trimiti link portofoliu

### Saptamana 2+: Automatizare partiala

- Rutina zilnica: 30 min cautare + 30 min trimitere + 30 min followup
- Obiectiv: 2-3 clienti noi pe saptamana

---

## Mesajul care converteste (testat)

> "Bună ziua! Am văzut că [Salon] din [Oraș] nu are site web.
> Fac site-uri profesionale în 5 zile, preț fix 500 lei (domeniu + hosting incluse).
> Beneficiu principal: rezervări online și galerie cu lucrările voastre.
> Vă interesează câteva exemple? [link portofoliu]
> Alexandru"

**De ce functioneaza:**
- Preț concret (nu "contactați pentru ofertă")
- Termen concret
- Beneficiu specific pentru tipul lor de afacere
- Nu ceri nimic, oferi exemple

---

## Date fisiere generate

```
data/
  leads_raw.csv              - Toate lead-urile gasite
  leads_export.csv           - Export find-only
  whatsapp_campaign_*.csv    - Campanie WA (cu mesaje + link-uri)
  leads_with_email.csv       - Lead-uri cu email gasit
  report_*.json              - Rapoarte campanii

logs/
  campaign_YYYY-MM-DD.log    - Log detaliat al campaniei
```

---

## FAQ

**Cat costa API-ul Google Places?**
Primele 200 USD/luna sunt gratuite. O cautare = ~0.017 USD. 1000 cautari = ~17 USD.

**WhatsApp nu ma va bloca?**
Daca trimiti manual 15-20 mesaje/zi, nu. Evita tools de bulk send.

**Cat de repede vine primul client?**
Din experienta: 1-3 zile daca trimiti 15+ mesaje zilnic catre categorii potrivite.

**Pretul corect pentru piata romaneasca?**
- Site simplu (5 pagini): 500-800 RON
- Site cu blog + galerie: 800-1500 RON
- Site cu rezervari/comenzi: 1500-3000 RON
- Mentinere lunara: 100-200 RON/luna
