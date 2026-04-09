import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { CATEGORY_PAIN_POINTS } from '@/lib/constants'
import type { Business } from '@/lib/types'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    business,
    anthropicApiKey: clientKey,
    senderName,
    yourWebsite,
    yourPortfolio,
  }: {
    business: Business
    anthropicApiKey?: string
    senderName?: string
    yourWebsite?: string
    yourPortfolio?: string
  } = body

  const apiKey = process.env.ANTHROPIC_API_KEY || clientKey
  if (!apiKey) {
    return NextResponse.json({ error: 'Lipsă Anthropic API key' }, { status: 400 })
  }

  const ctx = CATEGORY_PAIN_POINTS[business.category] ?? CATEGORY_PAIN_POINTS['default']
  const name         = process.env.SENDER_NAME         || senderName    || 'Alexandru'
  const website      = process.env.YOUR_WEBSITE        || yourWebsite   || ''
  const portfolio    = process.env.YOUR_PORTFOLIO_URL  || yourPortfolio || ''

  const ratingCtx =
    business.rating >= 4.0 && business.reviews_count >= 10
      ? `Văd că aveți ${business.reviews_count} recenzii cu o medie de ${business.rating} stele pe Google – felicitări, clienții vă apreciază mult! Tocmai de aceea merități o prezență online pe măsura acestei reputații.`
      : ''

  const prompt = `Ești un expert în marketing digital și copywriting de vânzări pentru IMM-uri din România.
Sarcina ta: scrie un email de cold outreach EXTREM DE CAPTIVANT și PERSUASIV către o afacere locală care nu are website.

DATELE AFACERII:
- Nume: ${business.name}
- Tip: ${business.category_label}
- Oraș: ${business.city}
- Context recenzii: ${ratingCtx || 'Fără detalii despre recenzii.'}

CONTEXT DE VÂNZARE:
- Problema lor principală: ${ctx.pain}
- Ce câștigă cu un website: ${ctx.gain}
- Statistici relevante: ${ctx.hook}
- Urgență: ${ctx.urgency}

OFERTA TA:
- Construiești website-uri profesionale rapid (1-3 zile)
- Preț accesibil (500-2000 RON în funcție de complexitate)
- Domeniu .ro inclus primul an
- Hosting inclus primul an
- Optimizare Google inclusă (SEO de bază)
- Suport tehnic inclus 3 luni
${portfolio ? `- Portofoliu: ${portfolio}` : ''}
${website ? `- Site propriu: ${website}` : ''}

Scrie EXCLUSIV în limba română, folosind "dumneavoastră" sau "voi" (formă de politețe).

REGULI STRICTE:
1. Subject line: MAX 8 cuvinte, intrigant și specific pentru ${business.name} – NU generic
2. Deschidere: Observație/compliment SPECIFIC despre afacerea lor (nu generic)
3. Problema: 2-3 rânduri care descriu exact ce pierd ei fără website (cu statistică)
4. Soluția: Prezintă oferta clar, cu beneficii concrete, nu features tehnice
5. Probă socială: Menționează că ai construit site-uri pentru afaceri similare din zonă
6. CTA: O singură acțiune clară – "Răspundeți la acest email"
7. Ton: Prietenos, direct, de la om la om – NU corporatist, NU template evident
8. Lungime: MAX 180 cuvinte în body – scurt și puternic
9. NU folosi: "Stimate", "Vă contactez pentru a vă oferi", "Sper că sunteți bine"
10. Personalizează cu numele afacerii de minim 2 ori

Semnează cu:
${name}${website ? `\n${website}` : ''}

Returnează EXACT în formatul JSON următor (fără alt text, fără markdown):
{"subject": "subiectul emailului", "body": "corpul emailului complet, cu salut și semnătură"}`

  try {
    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Răspuns invalid de la Claude')

    const { subject, body } = JSON.parse(jsonMatch[0])
    return NextResponse.json({ subject, body })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
