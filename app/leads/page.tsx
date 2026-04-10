'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  getLeads, saveLeads, addLeads, updateLead, deleteLead, clearLeads, getSettings,
  incrementTodaySent, getTodayStats,
} from '@/lib/storage'
import { CITY_COORDINATES, BUSINESS_CATEGORIES, JUDETE, HIGH_CONVERSION_CATEGORIES } from '@/lib/constants'
import type { Business, Settings } from '@/lib/types'

const CITIES = Object.keys(CITY_COORDINATES).sort()
const CATEGORIES = Object.entries(BUSINESS_CATEGORIES)

// ── helpers ──────────────────────────────────────────────────────────────────
function RatingStars({ rating }: { rating: number }) {
  const stars = Math.round(rating)
  return (
    <span className="text-yellow-400 text-xs">
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
      <span className="text-slate-400 ml-1">{rating.toFixed(1)}</span>
    </span>
  )
}

function StatusBadge({ status }: { status: Business['status'] }) {
  const map: Record<string, { label: string; color: string }> = {
    found:  { label: 'Găsit',   color: '#63b3ed' },
    ready:  { label: 'Gata',    color: '#f6ad55' },
    sent:   { label: 'Trimis',  color: '#25D366' },
    failed: { label: 'Eroare',  color: '#fc8181' },
  }
  const s = map[status] || map.found
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: s.color + '22', color: s.color, border: `1px solid ${s.color}44` }}>
      {s.label}
    </span>
  )
}

// ── MessageModal ─────────────────────────────────────────────────────────────
function MessageModal({
  business, settings, onClose, onSent,
}: {
  business: Business
  settings: Settings
  onClose: () => void
  onSent: (b: Business) => void
}) {
  const [tab, setTab]           = useState<'whatsapp' | 'email'>('whatsapp')
  const [waMsgGenerated, setWaMsgGenerated] = useState(business.generated_whatsapp || '')
  const [emailSubject, setEmailSubject] = useState(business.generated_subject || '')
  const [emailBody, setEmailBody]       = useState(business.generated_body || '')
  const [generating, setGenerating]     = useState(false)
  const [copied, setCopied]             = useState(false)
  const [sending, setSending]           = useState(false)
  const [emailTo, setEmailTo]           = useState(business.contact_email || '')
  const [genError, setGenError]         = useState('')

  const needsGenWA    = !waMsgGenerated
  const needsGenEmail = !emailSubject || !emailBody

  async function generate(mode: 'whatsapp' | 'email' | 'both') {
    setGenerating(true)
    setGenError('')
    try {
      const res = await fetch('/api/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business,
          mode,
          variant: Math.floor(Math.random() * 4),
          anthropicApiKey: settings.anthropicApiKey,
          senderName:   settings.senderName,
          yourWebsite:  settings.yourWebsite,
          yourPortfolio: settings.yourPortfolio,
          yourPhone:    settings.yourPhone,
          priceFrom:    settings.priceFrom,
          priceTo:      settings.priceTo,
          deliveryDays: settings.deliveryDays,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Eroare necunoscută')
      if (data.whatsapp) setWaMsgGenerated(data.whatsapp)
      if (data.subject)  setEmailSubject(data.subject)
      if (data.body)     setEmailBody(data.body)
      // persist
      updateLead(business.place_id, {
        generated_whatsapp: data.whatsapp || waMsgGenerated,
        generated_subject:  data.subject  || emailSubject,
        generated_body:     data.body     || emailBody,
        status: 'ready',
      })
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerating(false)
    }
  }

  async function copyAndOpenWhatsApp() {
    if (!waMsgGenerated) return
    try {
      await navigator.clipboard.writeText(waMsgGenerated)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
    // open WhatsApp
    const waUrl = business.whatsapp_link
      ? `${business.whatsapp_link}?text=${encodeURIComponent(waMsgGenerated)}`
      : ''
    if (waUrl) window.open(waUrl, '_blank')
    updateLead(business.place_id, { status: 'sent', sent_at: new Date().toISOString(), contact_method: 'whatsapp' })
    incrementTodaySent(true)
    onSent({ ...business, status: 'sent', contact_method: 'whatsapp' })
  }

  async function sendEmail() {
    if (!emailTo || !emailSubject || !emailBody) return
    setSending(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo, subject: emailSubject, emailBody,
          senderEmail:       settings.senderEmail,
          senderAppPassword: settings.senderAppPassword,
          senderName:        settings.senderName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      updateLead(business.place_id, { status: 'sent', sent_at: new Date().toISOString(), contact_method: 'email' })
      incrementTodaySent(true)
      onSent({ ...business, status: 'sent', contact_method: 'email' })
      onClose()
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : String(e))
      incrementTodaySent(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="glass rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up" style={{ border: '1px solid rgba(99,179,237,0.2)' }}>
        {/* Header */}
        <div className="p-6 border-b border-slate-800/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-lg">{business.name}</h3>
              <p className="text-slate-400 text-sm">{business.category_label} · {business.city}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-slate-300 text-sm">📞 {business.phone}</span>
                {business.rating > 0 && <RatingStars rating={business.rating} />}
                {business.reviews_count > 0 && <span className="text-slate-400 text-xs">({business.reviews_count} recenzii)</span>}
                {business.is_small_city && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(246,173,85,0.15)', color: '#f6ad55', border: '1px solid rgba(246,173,85,0.3)' }}>
                    🏘️ Oraș mic
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-xl">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-4 pb-0">
          {(['whatsapp', 'email'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={tab === t
                ? t === 'whatsapp'
                  ? { background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff' }
                  : { background: 'linear-gradient(135deg,#63b3ed,#3b82f6)', color: '#fff' }
                : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
              {t === 'whatsapp' ? '📱 WhatsApp' : '✉️ Email'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {genError && (
            <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.3)', color: '#fc8181' }}>
              ⚠️ {genError}
            </div>
          )}

          {/* WHATSAPP TAB */}
          {tab === 'whatsapp' && (
            <div className="space-y-4">
              {!business.whatsapp_link && (
                <div className="p-3 rounded-xl text-sm text-center" style={{ background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.3)', color: '#f6ad55' }}>
                  ⚠️ Nu există număr de WhatsApp pentru această afacere. Încearcă emailul.
                </div>
              )}

              {needsGenWA ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm mb-4">Generează un mesaj WhatsApp personalizat cu AI</p>
                  <button onClick={() => generate('whatsapp')} disabled={generating || !settings.anthropicApiKey}
                    className="px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
                    style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)', boxShadow: '0 0 20px rgba(37,211,102,0.3)' }}>
                    {generating ? '⏳ Generez...' : '🤖 Generează mesaj WhatsApp'}
                  </button>
                  {!settings.anthropicApiKey && <p className="text-red-400 text-xs mt-2">Configurează Anthropic API key în Setări</p>}
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mesaj WhatsApp</label>
                      <button onClick={() => generate('whatsapp')} disabled={generating}
                        className="text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                        style={{ background: 'rgba(37,211,102,0.1)', color: '#25D366', border: '1px solid rgba(37,211,102,0.2)' }}>
                        {generating ? '⏳' : '🔄 Regenerează'}
                      </button>
                    </div>
                    <textarea
                      value={waMsgGenerated}
                      onChange={e => setWaMsgGenerated(e.target.value)}
                      rows={8}
                      className="w-full rounded-xl p-4 text-sm text-white resize-none leading-relaxed"
                      style={{ background: 'rgba(15,22,41,0.8)', border: '1px solid rgba(99,179,237,0.15)', outline: 'none' }}
                    />
                    <p className="text-xs text-slate-500 mt-1">{waMsgGenerated.length} caractere · {waMsgGenerated.split('\n').length} rânduri</p>
                  </div>

                  <button
                    onClick={copyAndOpenWhatsApp}
                    disabled={!business.whatsapp_link}
                    className="w-full py-4 rounded-2xl font-bold text-white text-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:scale-100 glow-wa"
                    style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 4px 30px rgba(37,211,102,0.35)' }}>
                    {copied ? '✅ Copiat! WhatsApp deschis...' : '📱 Trimite pe WhatsApp'}
                  </button>
                  <p className="text-xs text-slate-500 text-center">
                    Mesajul e copiat în clipboard și WhatsApp se deschide automat
                  </p>
                </>
              )}
            </div>
          )}

          {/* EMAIL TAB */}
          {tab === 'email' && (
            <div className="space-y-4">
              {needsGenEmail ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm mb-4">Generează un email personalizat cu AI</p>
                  <button onClick={() => generate('email')} disabled={generating || !settings.anthropicApiKey}
                    className="px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#63b3ed,#3b82f6)', boxShadow: '0 0 20px rgba(99,179,237,0.3)' }}>
                    {generating ? '⏳ Generez...' : '🤖 Generează email'}
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Email destinatar</label>
                    <input value={emailTo} onChange={e => setEmailTo(e.target.value)}
                      placeholder="email@afacere.ro"
                      className="w-full rounded-xl px-4 py-3 text-sm text-white"
                      style={{ background: 'rgba(15,22,41,0.8)', border: '1px solid rgba(99,179,237,0.15)', outline: 'none' }} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subiect</label>
                      <button onClick={() => generate('email')} disabled={generating}
                        className="text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                        style={{ background: 'rgba(99,179,237,0.1)', color: '#63b3ed', border: '1px solid rgba(99,179,237,0.2)' }}>
                        {generating ? '⏳' : '🔄 Regenerează'}
                      </button>
                    </div>
                    <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm text-white"
                      style={{ background: 'rgba(15,22,41,0.8)', border: '1px solid rgba(99,179,237,0.15)', outline: 'none' }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Corp email</label>
                    <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={10}
                      className="w-full rounded-xl p-4 text-sm text-white resize-none leading-relaxed"
                      style={{ background: 'rgba(15,22,41,0.8)', border: '1px solid rgba(99,179,237,0.15)', outline: 'none' }} />
                  </div>
                  <button onClick={sendEmail}
                    disabled={sending || !emailTo || !emailSubject || !emailBody || !settings.senderEmail}
                    className="w-full py-4 rounded-2xl font-bold text-white text-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #63b3ed, #3b82f6)', boxShadow: '0 4px 30px rgba(99,179,237,0.3)' }}>
                    {sending ? '⏳ Trimit...' : '✉️ Trimite Email'}
                  </button>
                  {!settings.senderEmail && <p className="text-red-400 text-xs text-center">Configurează email în Setări</p>}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── LeadCard ──────────────────────────────────────────────────────────────────
function LeadCard({
  business, settings, onUpdate, onDelete,
}: {
  business: Business
  settings: Settings
  onUpdate: (b: Business) => void
  onDelete: (id: string) => void
}) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="glass rounded-2xl p-5 hover:border-blue-500/30 transition-all animate-slide-up"
           style={{ border: business.is_small_city ? '1px solid rgba(246,173,85,0.2)' : undefined }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-white text-sm truncate">{business.name}</span>
              {business.is_small_city && <span className="text-xs">🏘️</span>}
              <StatusBadge status={business.status} />
            </div>
            <p className="text-slate-400 text-xs">{business.category_label} · {business.city}</p>
          </div>
          <button onClick={() => onDelete(business.place_id)}
            className="text-slate-600 hover:text-red-400 transition-colors text-sm flex-shrink-0">✕</button>
        </div>

        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <span className="text-slate-300 text-xs">📞 {business.phone}</span>
          {business.rating > 0 && <RatingStars rating={business.rating} />}
          {business.reviews_count > 0 && (
            <span className="text-slate-400 text-xs">({business.reviews_count})</span>
          )}
          {business.whatsapp_link && (
            <span className="text-xs font-semibold" style={{ color: '#25D366' }}>✓ WhatsApp</span>
          )}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={business.whatsapp_link
            ? { background: 'linear-gradient(135deg, rgba(37,211,102,0.25), rgba(18,140,126,0.25))', border: '1px solid rgba(37,211,102,0.35)', color: '#25D366' }
            : { background: 'rgba(99,179,237,0.15)', border: '1px solid rgba(99,179,237,0.25)', color: '#63b3ed' }}>
          {business.status === 'sent'
            ? '✅ Trimis · Vezi detalii'
            : business.whatsapp_link
            ? '📱 Trimite WhatsApp'
            : '✉️ Trimite Email'}
        </button>
      </div>

      {showModal && (
        <MessageModal
          business={business}
          settings={settings}
          onClose={() => setShowModal(false)}
          onSent={(updated) => { onUpdate(updated); setShowModal(false) }}
        />
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [leads, setLeads]       = useState<Business[]>([])
  const [settings, setSettings] = useState<Settings>({} as Settings)
  const [city, setCity]         = useState('Cluj-Napoca')
  const [category, setCategory] = useState('beauty_salon')
  const [judet, setJudet]       = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchMode, setSearchMode] = useState<'city' | 'judet'>('city')
  const [filter, setFilter]     = useState<'all' | 'found' | 'ready' | 'sent'>('all')
  const [todaySent, setTodaySent] = useState(0)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [genProgress, setGenProgress]     = useState(0)

  useEffect(() => {
    setLeads(getLeads())
    setSettings(getSettings())
    setTodaySent(getTodayStats().sent)
  }, [])

  async function searchCityCategory(c: string, cat: string): Promise<Business[]> {
    const res = await fetch('/api/find-businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: c, category: cat, googleApiKey: settings.googlePlacesApiKey }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Eroare API')
    return data.businesses || []
  }

  async function handleSearch() {
    if (!settings.googlePlacesApiKey) {
      setSearchError('Configurează Google Places API key în Setări')
      return
    }
    setSearching(true)
    setSearchError('')
    try {
      let allNew: Business[] = []

      if (searchMode === 'judet' && judet) {
        const cities = JUDETE[judet] || []
        for (const c of cities) {
          try {
            const results = await searchCityCategory(c, category)
            allNew = [...allNew, ...results]
          } catch {}
        }
      } else {
        allNew = await searchCityCategory(city, category)
      }

      const updated = addLeads(allNew)
      setLeads(updated)
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : String(e))
    } finally {
      setSearching(false)
    }
  }

  async function generateAllMessages() {
    const targets = leads.filter(l => !l.generated_whatsapp && l.status !== 'sent')
    if (targets.length === 0) return
    setGeneratingAll(true)
    setGenProgress(0)

    for (let i = 0; i < targets.length; i++) {
      try {
        const res = await fetch('/api/generate-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business: targets[i],
            mode: 'both',
            variant: i % 4,
            anthropicApiKey: settings.anthropicApiKey,
            senderName:   settings.senderName,
            yourWebsite:  settings.yourWebsite,
            yourPortfolio: settings.yourPortfolio,
            yourPhone:    settings.yourPhone,
            priceFrom:    settings.priceFrom,
            priceTo:      settings.priceTo,
            deliveryDays: settings.deliveryDays,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          updateLead(targets[i].place_id, {
            generated_whatsapp: data.whatsapp || '',
            generated_subject:  data.subject  || '',
            generated_body:     data.body     || '',
            status: 'ready',
          })
        }
      } catch {}
      setGenProgress(i + 1)
      await new Promise(r => setTimeout(r, 600)) // rate limiting
    }

    setLeads(getLeads())
    setGeneratingAll(false)
  }

  function handleUpdate(updated: Business) {
    updateLead(updated.place_id, updated)
    setLeads(getLeads())
    setTodaySent(getTodayStats().sent)
  }

  function handleDelete(id: string) {
    deleteLead(id)
    setLeads(getLeads())
  }

  const filtered = leads.filter(l => filter === 'all' || l.status === filter)
  const hasWA    = leads.filter(l => l.whatsapp_link && l.status !== 'sent').length
  const notGenerated = leads.filter(l => !l.generated_whatsapp && l.status !== 'sent').length

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b2a 50%, #0a1628 100%)' }}>
      {/* Header */}
      <header className="border-b border-slate-800/50 px-6 py-4 sticky top-0 z-40" style={{ background: 'rgba(10,15,30,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm">← Acasă</Link>
            <span className="text-slate-700">/</span>
            <span className="font-bold text-white">Leads</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              <span className="text-white font-semibold">{todaySent}</span> trimise azi
            </span>
            <span className="text-sm text-slate-400">
              <span className="text-white font-semibold">{leads.length}</span> total leads
            </span>
            {leads.length > 0 && (
              <button onClick={() => { if (confirm('Ștergi toate leads-urile?')) { clearLeads(); setLeads([]) } }}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(252,129,129,0.1)', color: '#fc8181', border: '1px solid rgba(252,129,129,0.2)' }}>
                Șterge tot
              </button>
            )}
            <Link href="/settings"
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'rgba(99,179,237,0.1)', color: '#63b3ed', border: '1px solid rgba(99,179,237,0.2)' }}>
              ⚙️ Setări
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar – Search */}
        <aside className="w-80 flex-shrink-0 space-y-4">
          <div className="glass rounded-2xl p-5">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              🔍 Caută leads
            </h2>

            {/* Search mode toggle */}
            <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
              {(['city', 'judet'] as const).map(m => (
                <button key={m} onClick={() => setSearchMode(m)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={searchMode === m
                    ? { background: 'rgba(99,179,237,0.2)', color: '#63b3ed' }
                    : { color: '#64748b' }}>
                  {m === 'city' ? '🏙️ Oraș' : '🗺️ Județ'}
                </button>
              ))}
            </div>

            {searchMode === 'city' ? (
              <div className="mb-3">
                <label className="text-xs text-slate-400 mb-1 block">Oraș</label>
                <select value={city} onChange={e => setCity(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white"
                  style={{ background: 'rgba(15,22,41,0.8)', border: '1px solid rgba(99,179,237,0.15)', outline: 'none' }}>
                  {CITIES.map(c => (
                    <option key={c} value={c}>{CITY_COORDINATES[c]?.isSmall ? '🏘️ ' : ''}{c}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mb-3">
                <label className="text-xs text-slate-400 mb-1 block">Județ (caută toate orașele)</label>
                <select value={judet} onChange={e => setJudet(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white"
                  style={{ background: 'rgba(15,22,41,0.8)', border: '1px solid rgba(99,179,237,0.15)', outline: 'none' }}>
                  <option value="">Selectează județ...</option>
                  {Object.keys(JUDETE).map(j => (
                    <option key={j} value={j}>{j} ({JUDETE[j].length} orașe)</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs text-slate-400 mb-1 block">Categorie afacere</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white"
                style={{ background: 'rgba(15,22,41,0.8)', border: '1px solid rgba(99,179,237,0.15)', outline: 'none' }}>
                <optgroup label="⭐ Conversie maximă">
                  {HIGH_CONVERSION_CATEGORIES.map(c => (
                    <option key={c} value={c}>{BUSINESS_CATEGORIES[c]}</option>
                  ))}
                </optgroup>
                <optgroup label="Toate categoriile">
                  {CATEGORIES.filter(([k]) => !HIGH_CONVERSION_CATEGORIES.includes(k)).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {searchError && (
              <div className="mb-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.3)', color: '#fc8181' }}>
                ⚠️ {searchError}
              </div>
            )}

            <button onClick={handleSearch} disabled={searching || (searchMode === 'judet' && !judet)}
              className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #63b3ed, #3b82f6)', boxShadow: '0 0 20px rgba(99,179,237,0.25)' }}>
              {searching ? '⏳ Caut...' : '🔍 Caută afaceri fără site'}
            </button>
          </div>

          {/* Quick stats */}
          {leads.length > 0 && (
            <div className="glass rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-white text-sm">📊 Statistici</h3>
              {[
                { label: 'Total leads', value: leads.length, color: '#63b3ed' },
                { label: '📱 Cu WhatsApp', value: leads.filter(l => l.whatsapp_link).length, color: '#25D366' },
                { label: '⚡ Gata de trimis', value: leads.filter(l => l.status === 'ready').length, color: '#f6ad55' },
                { label: '✅ Trimise', value: leads.filter(l => l.status === 'sent').length, color: '#4ade80' },
                { label: '🏘️ Orașe mici', value: leads.filter(l => l.is_small_city).length, color: '#f6ad55' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">{s.label}</span>
                  <span className="font-bold text-sm" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Generate all button */}
          {notGenerated > 0 && settings.anthropicApiKey && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold text-white text-sm mb-3">🤖 Generare în masă</h3>
              <p className="text-slate-400 text-xs mb-3">{notGenerated} leads fără mesaj generat</p>
              {generatingAll && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Progres</span>
                    <span>{genProgress}/{notGenerated}</span>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ background: 'rgba(99,179,237,0.1)' }}>
                    <div className="h-2 rounded-full transition-all"
                         style={{ background: 'linear-gradient(90deg,#25D366,#128C7E)', width: `${(genProgress/notGenerated)*100}%` }} />
                  </div>
                </div>
              )}
              <button onClick={generateAllMessages} disabled={generatingAll}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366' }}>
                {generatingAll ? `⏳ ${genProgress}/${notGenerated}...` : `⚡ Generează toate (${notGenerated})`}
              </button>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Filter tabs */}
          {leads.length > 0 && (
            <div className="flex gap-2 mb-6 flex-wrap">
              {([
                { key: 'all',   label: `Toate (${leads.length})` },
                { key: 'found', label: `Găsite (${leads.filter(l => l.status === 'found').length})` },
                { key: 'ready', label: `Gata (${leads.filter(l => l.status === 'ready').length})` },
                { key: 'sent',  label: `Trimise (${leads.filter(l => l.status === 'sent').length})` },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={filter === f.key
                    ? { background: 'rgba(99,179,237,0.2)', color: '#63b3ed', border: '1px solid rgba(99,179,237,0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {f.label}
                </button>
              ))}

              {hasWA > 0 && (
                <div className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                     style={{ background: 'rgba(37,211,102,0.1)', color: '#25D366', border: '1px solid rgba(37,211,102,0.2)' }}>
                  📱 {hasWA} disponibile WhatsApp
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {leads.length === 0 && (
            <div className="text-center py-24">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-white mb-2">Zero leads deocamdată</h3>
              <p className="text-slate-400 mb-6">Selectează un oraș și o categorie, apoi apasă „Caută afaceri fără site"</p>
              <div className="glass rounded-2xl p-6 max-w-sm mx-auto text-left">
                <p className="text-sm font-semibold text-white mb-3">💡 Recomandare pentru azi:</p>
                <ul className="text-sm text-slate-400 space-y-2">
                  <li>🏘️ Caută în <strong className="text-white">orașe mici</strong> – concurență zero</li>
                  <li>💄 Categoria <strong className="text-white">Salon de Înfrumusețare</strong> – conversie maximă</li>
                  <li>🍰 <strong className="text-white">Brutărie/Patiserie</strong> – comenzi de Paști acum</li>
                </ul>
              </div>
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(b => (
              <LeadCard
                key={b.place_id}
                business={b}
                settings={settings}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
