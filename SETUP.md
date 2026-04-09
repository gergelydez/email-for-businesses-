# Setup & Utilizare - Business Outreach Automator

## Ce face acest tool?

1. **Gaseste** afaceri locale din Romania (pe Google Maps) care NU au website
2. **Gaseste** adresele de email ale acestor afaceri
3. **Genereaza** emailuri de vanzare ultra-personalizate cu Claude AI (diferite pentru restaurant vs dentist vs service auto etc.)
4. **Trimite** emailurile automat cu delay anti-spam
5. **Inregistreaza** tot intr-un log CSV ca sa nu contactezi aceeasi afacere de doua ori

---

## Setup rapid (5 minute)

### 1. Instaleaza dependentele

```bash
pip install -r requirements.txt
```

### 2. Copiaza fisierul de configurare

```bash
cp .env.example .env
```

### 3. Configureaza `.env` cu cheile tale API

Deschide `.env` si completeaza:

#### Google Places API Key
- Mergi la: https://console.cloud.google.com/
- Creeaza un proiect nou (sau foloseste unul existent)
- Activeaza **Places API** din "APIs & Services"
- Creeaza un API Key din "Credentials"
- Pune key-ul la `GOOGLE_PLACES_API_KEY=`
- **Cost estimat**: ~$5-15/zi pentru 200-500 de afaceri cautate (ai $200 credit gratuit lunar)

#### Anthropic API Key
- Mergi la: https://console.anthropic.com/
- Creeaza un API Key
- Pune key-ul la `ANTHROPIC_API_KEY=`
- **Cost estimat**: ~$0.50-2/zi pentru 150 emailuri generate

#### Gmail App Password
- Mergi la: https://myaccount.google.com/security
- Activeaza **2-Step Verification** (obligatoriu)
- Mergi la: https://myaccount.google.com/apppasswords
- Genereaza un App Password pentru "Mail"
- Pune parola la `SENDER_APP_PASSWORD=` (nu parola Gmail!)

### 4. Testeaza configurarea

```bash
# Preview 5 emailuri generate (fara a trimite nimic)
python main.py --preview 5

# Campanie simulata (fara trimitere efectiva)
python main.py --dry-run

# Test pe un singur oras + categorie
python main.py --city "Cluj-Napoca" --category restaurant --dry-run
```

### 5. Prima campanie reala

```bash
# Ruleaza campania completa
python main.py
```

---

## Comenzi disponibile

| Comanda | Descriere |
|---------|-----------|
| `python main.py` | Campanie completa (gaseste + email + trimite) |
| `python main.py --dry-run` | Simuleaza fara a trimite |
| `python main.py --preview 5` | Afiseaza 5 emailuri de exemplu |
| `python main.py --stats` | Statistici zilnice |
| `python main.py --find-only` | Doar gaseste leads → CSV |
| `python main.py --city "Cluj-Napoca" --category restaurant` | Un singur oras/categorie |

---

## Structura fisierelor generate

```
data/
├── leads_raw.csv          # Toate afacerile gasite fara website
├── leads_with_email.csv   # Leads cu email gasit
├── leads_no_email.csv     # Leads fara email (pentru follow-up manual)
├── leads_export.csv       # Export complet (modul --find-only)
└── sent_log.csv           # Log complet al emailurilor trimise

logs/
└── campaign_YYYY-MM-DD.log  # Log detaliat al campaniei
```

---

## Configurare campanie optima

In `.env`, ajusteaza:

```env
# Orase tinta (incepe cu 2-3 orase, extinde treptat)
TARGET_CITIES=Cluj-Napoca,Brasov,Sibiu

# Categorii cu cel mai mare potential de conversie
TARGET_CATEGORIES=restaurant,dentist,beauty_salon,lodging

# Emailuri per zi (incepe cu 50-100, creste treptat)
MAX_EMAILS_PER_DAY=100

# Delay intre emailuri (min 30s recomandat)
EMAIL_DELAY_SECONDS=45
```

---

## Automatizare zilnica (cron job)

Pentru a rula automat in fiecare zi:

```bash
# Editeaza crontab
crontab -e

# Adauga (ruleaza zilnic la 09:00)
0 9 * * * cd /calea/catre/proiect && python main.py >> logs/cron.log 2>&1
```

---

## Considerente legale (GDPR)

- Trimiti doar catre adrese de email de business **publice** (de pe site-uri, pagini FB etc.)
- Fiecare email contine posibilitatea de dezabonare (adauga manual daca doresti)
- Pastreaza `data/sent_log.csv` ca dovada de conformitate
- In Romania, cold email B2B catre adrese publice este permis cu respectarea GDPR Art. 6(1)(f) (interes legitim)
- Recomandat: adauga la finalul emailului `"Pentru a nu mai primi astfel de mesaje, raspundeti cu 'Dezabonare'"`

---

## Estimare costuri si venituri

### Costuri lunare (150 emailuri/zi)
| Serviciu | Cost/luna |
|----------|-----------|
| Google Places API | ~$30-50 |
| Anthropic (Claude) | ~$20-40 |
| Total | ~$50-90 RON ~250-450 |

### Venituri potentiale (la 1% rata de conversie)
| | Conservative | Realist | Optimist |
|--|--|--|--|
| Emailuri/zi | 150 | 150 | 300 |
| Rata conversie | 0.5% | 1.5% | 2% |
| Vanzari/zi | 0.75 | 2.25 | 6 |
| Pret mediu | 1200 RON | 1500 RON | 1800 RON |
| **Venit/luna** | **~27.000 RON** | **~100.000 RON** | **~270.000 RON** |

**ROI: x60-600 fata de costul tool-ului**
