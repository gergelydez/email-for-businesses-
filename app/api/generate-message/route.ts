import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { CATEGORY_PAIN_POINTS } from '@/lib/constants'
import type { Business } from '@/lib/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    business,
    mode = 'whatsapp',
    variant = 0,
    anthropicApiKey: clientKey,
    senderName,
    yourWebsite,
    yourPortfolio,
    yourPhone,
    priceFrom = '500',
    priceTo = '1500',
    deliveryDays = '5',
  }: {
    business: Business
    mode?: string
    variant?: number
    anthropicApiKey?: string
    senderName?: string
    yourWebsite?: string
    yourPortfolio?: string
    yourPhone?: string
    priceFrom?: string
    priceTo?: string
    deliveryDays?: string
  } = body

  const apiKey = process.env.ANTHROPIC_API_KEY || clientKey
  if (!apiKey) return NextResponse.json({ error: 'Lipsă Anthropic API key' }, { status: 400 })

  const ctx      = CATEGORY_PAIN_POINTS[business.category] ?? CATEGORY_PAIN_POINTS['default']
  const name     = process.env.SENDER_NAME        || senderName    || 'Alexandru'
  const website  = process.env.YOUR_WEBSITE       || yourWebsite   || ''
  const portfolio= process.env.YOUR_PORTFOLIO_URL || yourPortfolio || ''
  const phone    = process.env.YOUR_PHONE         || yourPhone     || ''
  const pFrom    = process.env.PRICE_FROM         || priceFrom
  const pTo      = process.env.PRICE_TO           || priceTo
  const days     = process.env.DELIVERY_DAYS      || deliveryDays

  const hasGoodRating = business.rating >= 4.2 && business.reviews_count >= 15
  const hasManyReviews = business.reviews_count >= 50
  const ratingLine = hasGoodRating
    ? hasManyReviews
      ? `${business.reviews_count} de recenzii cu ${business.rating}★ — ești printre cei mai apreciați din ${business.city} în domeniu`
      : `${business.reviews_count} recenzii cu ${business.rating}★ pe Google`
    : business.reviews_count >= 5 ? `${business.reviews_count} recenzii pe Google` : ''

  const isSmall = business.is_small_city
  const cityClean = business.city.replace(' 🏘️', '')

  const client = new Anthropic({ apiKey })
  const results: { subject?: string; body?: string; whatsapp?: string; demo_html?: string } = {}

  // ── WHATSAPP: primul mesaj de contact ────────────────────────────────────────
  if (mode === 'whatsapp' || mode === 'both') {

    // 4 unghiuri psihologice diferite — rotăm ca să nu pară spam dacă același client vede mai multe
    const angles = [
      {
        name: 'CURIOSITY GAP',
        instruction: `Deschide cu o observație surprinzătoare care îl lasă cu un semn de întrebare în minte.
Exemplu de structură: "[Observație specifică despre ei] → [Ceva ce alții din domeniu fac și ei nu] → [Întrebare care trezește curiozitate]"
NU explica nimic complet — lasă-l să vrea să afle mai mult.`,
      },
      {
        name: 'SOCIAL PROOF HOOK',
        instruction: `Deschide menționând că ai văzut/lucrat cu afaceri SIMILARE din zonă și ai observat ceva specific.
Exemplu de structură: "[Ce ai observat la ei specific] → [Ce fac concurenții lor online] → [Ce ar putea și ei]"
Creează FOMO subtil fără să fie agresiv.`,
      },
      {
        name: 'INSIGHT HOOK',
        instruction: `Arată că știi ceva despre industria/piața lor locală pe care EI ar trebui să știe.
Exemplu de structură: "[Insight despre comportamentul clienților lor] → [Cum îi afectează direct] → [Ce faci tu pentru asta]"
Poziționează-te ca expert care aduce valoare, nu ca vânzător.`,
      },
      {
        name: 'PERSONALIZED COMPLIMENT + GAP',
        instruction: `Laudă ceva SPECIFIC și real (recenziile, reputația, longevitatea) și arată imediat gap-ul dureros.
Exemplu de structură: "[Compliment hiper-specific bazat pe datele lor] → [Paradoxul: reputație bună dar invizibili online] → [Oportunitatea pierdută zilnic]"
Fă-l să simtă mândrie și durere în același mesaj.`,
      },
    ]

    const angle = angles[variant % 4]

    const waPrompt = `Ești unul dintre cei mai buni copywriteri din România, specializat în outreach B2C pentru afaceri locale.
Ai scris mii de mesaje WhatsApp care au generat răspunsuri și clienți reali.
Știi exact cum gândește un proprietar de afacere mică — este ocupat, suspicios față de vânzători, dar receptiv dacă îi vorbești sincer.

━━━ MISIUNEA TA ━━━
Scrie primul mesaj WhatsApp trimis unui proprietar de afacere care NU te cunoaște.
Scopul UNIC al acestui mesaj: să răspundă cu ceva. Orice. Nu să cumpere acum.

━━━ DATELE AFACERII ━━━
Nume: ${business.name}
Tip: ${business.category_label}
Oraș: ${cityClean}${isSmall ? ' (oraș mic — ZERO concurență online în categorie)' : ''}
${ratingLine ? `Recenzii Google: ${ratingLine}` : 'Fără recenzii vizibile'}
Beneficiul principal dacă ar avea site: ${ctx.waHook}

━━━ CONTEXT ━━━
${isSmall
  ? `${cityClean} e un oraș mic. Cel care apare primul pe Google în această categorie câștigă toți clienții online. Acum nu apare nimeni — e o oportunitate uriașă.`
  : `În ${cityClean}, primii 3 rezultate Google iau 85% din traficul online. Ei nu sunt acolo.`}
${hasManyReviews ? `Au ${business.reviews_count} recenzii — asta înseamnă o afacere cu volum mare și reputație construită greu. Merită o prezență online pe măsura reputației.` : ''}

━━━ TEHNICA DE SCRIERE: ${angle.name} ━━━
${angle.instruction}

━━━ REGULILE DE AUR ━━━
1. MAX 3-4 rânduri. Pe WhatsApp, mesajele lungi = ignorate instant.
2. ZERO prețuri. Prețul ucide conversația înainte să înceapă.
3. ZERO cuvinte vânzări: "servicii", "ofertă", "pachet", "promovare", "soluție"
4. ZERO "Bună ziua, mă numesc X și fac Y" — asta e moarte sigură
5. Fiecare rând trebuie să îl tragă spre următorul — ca un trailer de film
6. Termină cu o întrebare la care ORICE răspuns e ok: "da", "nu", "ce?" — vrei reacție
7. Sună ca un mesaj trimis manual de un om real, nu ca un template
8. Dacă au recenzii bune: folosește-le ca dovadă că merită mai mult
9. Dacă e oraș mic: "primul din ${cityClean} care apare pe Google" e un hook puternic
10. Semnătură: doar "${name}" — fără titluri, fără link-uri, fără emojis în semnătură

━━━ EXEMPLE DE DESCHIDERI CARE FUNCȚIONEAZĂ ━━━
✅ "Am căutat [tip afacere] în ${cityClean} pe Google. Știți ce am găsit în top 3?"
✅ "${business.reviews_count} recenzii pe Google și nicio pagină web. Asta mi-a atras atenția."
✅ "Clienții voștri vă caută online acum. Problema e că nu vă găsesc."
✅ "Am văzut ceva la ${business.name} pe care îl văd rar la afaceri din zonă."

━━━ EXEMPLE DE DESCHIDERI CARE NU FUNCȚIONEAZĂ ━━━
❌ "Bună ziua! Am observat că nu aveți site web..."
❌ "Vă contactez pentru a vă oferi servicii de web design..."
❌ "Am o ofertă specială pentru dumneavoastră..."
❌ Orice cu "Stimate", "Sper că ești bine", "Cu stimă"

Returnează DOAR mesajul final, gata de copiat și trimis pe WhatsApp.
Fără ghilimele, fără explicații, fără "Iată mesajul:".`

    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{ role: 'user', content: waPrompt }],
      })
      results.whatsapp = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    } catch {
      // Fallback cu hook puternic
      results.whatsapp = ratingLine
        ? `${business.reviews_count} recenzii pe Google și nicio pagină web. Asta mi-a atras atenția când am căutat ${business.category_label.toLowerCase()} în ${cityClean}.\n\nClienții vă caută online — problema e că nu vă găsesc pe voi, ci pe alții.\n\nAm ceva de arătat. Vă interesează?\n\n${name}`
        : `Am căutat ${business.category_label.toLowerCase()} în ${cityClean} pe Google.\n\nȘtiți cine apare în top 3? Concurența voastră. Voi nu.\n\nAm o idee pentru asta — durează 2 minute să vă explic. Merită?\n\n${name}`
    }
  }

  // ── EMAIL ────────────────────────────────────────────────────────────────────
  if (mode === 'email' || mode === 'both') {
    const emailPrompt = `Ești un copywriter expert cu 25 ani experiență în cold email B2B/B2C pentru piața românească.
Rata ta de răspuns e 35-40% pentru că știi că proprietarii de afaceri mici sunt oameni ocupați și suspicios față de emailuri nesolicitate.

━━━ MISIUNEA TA ━━━
Un singur email care să genereze UN SINGUR lucru: un răspuns.

━━━ DATELE AFACERII ━━━
Nume: ${business.name}
Tip: ${business.category_label}
Oraș: ${cityClean}
${ratingLine ? `Situație Google: ${ratingLine}` : ''}
${isSmall ? `Avantaj unic: primul din ${cityClean} cu prezență online în această categorie` : ''}
Problema reală: ${ctx.pain}
Ce câștigă: ${ctx.gain}
De ce acum: ${ctx.urgency}

━━━ OFERTA (pentru după răspuns — NU o menționezi pe toate în email!) ━━━
- Site complet în ${days} zile
- Domeniu .ro + hosting + SEO local + mobil — tot inclus
- HOOK: demo personalizat gratuit cu numele lor, îl văd înainte să decidă
${portfolio ? `- Portofoliu: ${portfolio}` : ''}
${website ? `- Site tău: ${website}` : ''}

━━━ FORMULA OBLIGATORIE ━━━

SUBJECT (cel mai important — dacă nu deschid, restul nu contează):
- Personalizat cu NUMELE afacerii — nu generic
- Trezește curiozitate sau FOMO, nu descrie ce vinzi
- MAX 6 cuvinte
- Exemple bune: "O întrebare pentru [Nume]", "[Nume] — am găsit ceva", "Clienții caută [Nume] online"
- Exemple proaste: "Ofertă website", "Servicii web design", "Prezență online"

BODY — structura în 5 mișcări:
1. HOOK (1 rând): Observație specifică și surprinzătoare bazată pe datele lor reale
2. DURERE (1-2 rânduri): Ce pierd ZILNIC în termeni concreți — clienți reali, bani reali, nu statistici abstracte
3. DEMO OFFER (1-2 rânduri): "Am pregătit deja un demo de site cu numele vostru — îl trimit gratuit, fără nicio obligație" — asta elimină orice barieră
4. DOVADĂ (1 rând): Afaceri similare ajutate, fără să fii specific dacă nu ai
5. CTA (1 rând): Întrebare moale — "Vreți să îl vedeți?" sau "Merită 2 minute?"

━━━ REGULI ━━━
- MAX 120 cuvinte în body — mai scurt = mai citit
- Română naturală, "dumneavoastră" — respectuos dar uman
- ZERO prețuri în primul email
- ZERO bullet points — text curgător, ca o conversație
- ZERO: "Stimate", "Sper că sunteți bine", "Vă contactez pentru a vă oferi"
- Ton: consultant care face o favoare, nu vânzător care face presiune
- Semnează: ${name}${phone ? '\n' + phone : ''}${website ? '\n' + website : ''}

Returnează EXACT JSON fără markdown:
{"subject":"...","body":"..."}`

    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: emailPrompt }],
      })
      const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        results.subject = parsed.subject
        results.body    = parsed.body
      }
    } catch {
      results.subject = `Am ceva pentru ${business.name}`
      results.body    = `Am văzut ${business.name} pe Google Maps — ${ratingLine || 'afacere activă în ' + cityClean}.\n\nAm pregătit un demo de site cu numele vostru, să vedeți exact cum ar arăta online. Îl trimit gratuit, fără nicio obligație.\n\n${ctx.urgency}\n\nVreți să îl vedeți?\n\n${name}${phone ? '\n' + phone : ''}${website ? '\n' + website : ''}`
    }
  }

  // ── DEMO HTML GENERATOR ──────────────────────────────────────────────────────
  if (mode === 'demo') {
    const demoPrompt = `Ești un web designer expert. Generează un site web demo COMPLET și PROFESIONIST în HTML/CSS/JS pentru afacerea de mai jos.
Site-ul trebuie să arate ca un site REAL, nu ca un template generic.

━━━ DATELE AFACERII ━━━
Nume: ${business.name}
Tip: ${business.category_label}
Categorie internă: ${business.category}
Oraș: ${cityClean}
Telefon: ${business.phone || 'nedisponibil'}
${ratingLine ? `Recenzii Google: ${ratingLine}` : ''}
Adresă: ${business.address || cityClean}

━━━ STRUCTURA SITE-ULUI ━━━
1. Banner sticky sus: "✨ DEMO PERSONALIZAT · Site complet în ${days} zile de la ${pFrom} RON"
2. Navbar: logo (numele afacerii) + buton "Sună acum" cu telefonul lor
3. Hero section: gradient frumos cu culoarea specifică tipului de afacere, titlu mare, subtitlu, 2 butoane CTA
4. Servicii: 4-6 carduri cu iconuri emoji relevante pentru tipul lor de afacere
5. Despre noi: text convingător, adresă, eventual hartă placeholder
6. Galerie: 4 placeholder-uri cu emoji + text descriere (pentru că nu avem poze reale)
7. Recenzii: ${hasGoodRating ? `Afișează rating-ul real de ${business.rating}★ din ${business.reviews_count} recenzii` : '3 recenzii fictive pozitive credibile'}
8. Contact: box cu gradient, telefon clickabil, WhatsApp link dacă e disponibil
9. Footer: domeniu sugerat (${business.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.ro), "Site realizat de ${name}${phone ? ' · ' + phone : ''} · De la ${pFrom} RON · Livrare ${days} zile"

━━━ DESIGN ━━━
- Culori specifice tipului de afacere (nu alb/albastru generic):
  - pensiune/hotel: verde pădure #2d6a4f
  - salon/coafor: violet/roz #9d4edd  
  - restaurant: roșu/portocaliu #d62828
  - dentist/medic: albastru ocean #0077b6
  - service auto: verde închis #1b4332
  - foto/video: bleumarin #1d3557
  - patiserie/brutărie: auriu #c9a227
  - fitness: mov/roz neon #7209b7
  - florărie: roșu/portocaliu cald
  - altele: albastru profesional
- Mobile-first, responsive
- Animații subtile la scroll (CSS only)
- Font: system-ui sau Georgia pentru titluri
- Aspect premium, nu ieftin

━━━ REGULI TEHNICE ━━━
- Un singur fișier HTML complet cu CSS și JS inline
- Fără dependențe externe (fără Google Fonts, fără CDN) — trebuie să meargă offline
- Telefonul trebuie să fie clickabil: <a href="tel:${business.phone_intl ? '+' + business.phone_intl : business.phone}">
- WhatsApp link: https://wa.me/${business.phone_intl || ''}
- Nu folosi placeholder.com sau alte imagini externe

Returnează DOAR codul HTML complet, fără explicații, fără markdown, fără backticks.
Începe direct cu <!DOCTYPE html>`

    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{ role: 'user', content: demoPrompt }],
      })
      const html = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
      results.demo_html = html.startsWith('<!DOCTYPE') ? html : '<!DOCTYPE html>' + html
    } catch (e) {
      results.demo_html = ''
    }
  }

  // ── MESAJ DE FOLLOW-UP (după ce clientul a răspuns) ──────────────────────────
  if (mode === 'followup') {
    const replyText = (body as Record<string,string>).replyText || ''
    const followupPrompt = `Ești expert în vânzări consultative. Un client potențial a răspuns la mesajul tău de outreach.

━━━ CONTEXT ━━━
Afacerea: ${business.name} (${business.category_label}, ${cityClean})
${ratingLine ? `Recenzii: ${ratingLine}` : ''}
Tu ești: ${name} — faci site-uri profesionale în ${days} zile, de la ${pFrom} RON

━━━ CE A RĂSPUNS CLIENTUL ━━━
"${replyText}"

━━━ MISIUNEA TA ━━━
Scrie un mesaj de follow-up WhatsApp care:
1. Răspunde NATURAL la ce a zis el (nu ignora răspunsul lui)
2. Dacă e interesat → propune să îi trimiți demo-ul gratuit personalizat
3. Dacă are obiecții → neutralizează natural (fără a fi agresiv)
4. Dacă e neutru → trezește curiozitatea pentru demo
5. Dacă spune că are deja site → întreabă politicos când a fost actualizat ultima oară

REGULI:
- MAX 3 rânduri
- Natural, uman, ca un răspuns de WhatsApp real
- Propune demo GRATUIT ca pas următor logic
- ZERO presiune, ZERO urgență falsă
- Semnează cu "${name}" dacă e primul schimb

Returnează DOAR mesajul.`

    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [{ role: 'user', content: followupPrompt }],
      })
      results.whatsapp = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    } catch {
      results.whatsapp = `Mulțumesc pentru răspuns! Am pregătit deja un demo de site cu numele "${business.name}" — îl trimit acum gratuit, fără nicio obligație. Vreți să îl vedeți?\n\n${name}`
    }
  }

  return NextResponse.json(results)
}
