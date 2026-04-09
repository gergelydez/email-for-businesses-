'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Users, Wand2, Send, Trash2, Loader2, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Search, Filter,
  Download, RefreshCw,
} from 'lucide-react'
import {
  getLeads, updateLead, deleteLead, clearLeads,
  getSettings, incrementTodaySent,
} from '@/lib/storage'
import type { Business } from '@/lib/types'

type StatusFilter = 'all' | 'found' | 'ready' | 'sent' | 'failed'

export default function LeadsPage() {
  const [leads,       setLeads]       = useState<Business[]>([])
  const [search,      setSearch]      = useState('')
  const [statusFilter,setStatusFilter]= useState<StatusFilter>('all')
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [processing,  setProcessing]  = useState<Record<string, string>>({})
  const [error,       setError]       = useState('')

  const reload = () => setLeads(getLeads())

  useEffect(() => { reload() }, [])

  const filtered = useMemo(() => {
    return leads.filter(l => {
      const matchSearch = !search ||
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.city.toLowerCase().includes(search.toLowerCase()) ||
        l.category_label.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || l.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [leads, search, statusFilter])

  const counts = useMemo(() => ({
    all:    leads.length,
    found:  leads.filter(l => l.status === 'found').length,
    ready:  leads.filter(l => l.status === 'ready').length,
    sent:   leads.filter(l => l.status === 'sent').length,
    failed: leads.filter(l => l.status === 'failed').length,
  }), [leads])

  // ── Generate email ──────────────────────────────────────────────────────
  const generateEmail = async (biz: Business) => {
    setProcessing(prev => ({ ...prev, [biz.place_id]: 'generating' }))
    const settings = getSettings()

    try {
      const res = await fetch('/api/generate-email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          business:        biz,
          anthropicApiKey: settings.anthropicApiKey,
          senderName:      settings.senderName,
          yourWebsite:     settings.yourWebsite,
          yourPortfolio:   settings.yourPortfolio,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      updateLead(biz.place_id, {
        generated_subject: data.subject,
        generated_body:    data.body,
        status:            'ready',
      })
      reload()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      updateLead(biz.place_id, { status: 'failed', error: msg })
      reload()
    } finally {
      setProcessing(prev => { const n = { ...prev }; delete n[biz.place_id]; return n })
    }
  }

  // ── Send email ──────────────────────────────────────────────────────────
  const sendEmail = async (biz: Business) => {
    if (!biz.contact_email || !biz.generated_subject || !biz.generated_body) {
      setError(`Lead "${biz.name}": lipsă email de contact sau email generat.`)
      return
    }
    setProcessing(prev => ({ ...prev, [biz.place_id]: 'sending' }))
    const settings = getSettings()

    try {
      const res = await fetch('/api/send-email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          to:                biz.contact_email,
          subject:           biz.generated_subject,
          emailBody:         biz.generated_body,
          senderEmail:       settings.senderEmail,
          senderAppPassword: settings.senderAppPassword,
          senderName:        settings.senderName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      updateLead(biz.place_id, { status: 'sent', sent_at: new Date().toISOString() })
      incrementTodaySent(true)
      reload()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      updateLead(biz.place_id, { status: 'failed', error: msg })
      incrementTodaySent(false)
      reload()
    } finally {
      setProcessing(prev => { const n = { ...prev }; delete n[biz.place_id]; return n })
    }
  }

  // ── Bulk: send all ready ────────────────────────────────────────────────
  const sendAllReady = async () => {
    const ready = leads.filter(l => l.status === 'ready' && l.contact_email)
    for (const biz of ready) {
      await sendEmail(biz)
      await new Promise(r => setTimeout(r, 2000)) // 2s delay between sends
    }
  }

  // ── Update field inline ─────────────────────────────────────────────────
  const updateField = (placeId: string, key: keyof Business, value: string) => {
    updateLead(placeId, { [key]: value })
    setLeads(prev => prev.map(l =>
      l.place_id === placeId ? { ...l, [key]: value } : l,
    ))
  }

  // ── Export CSV ──────────────────────────────────────────────────────────
  const exportCsv = () => {
    const header = 'Nume,Oras,Categorie,Telefon,Email,Status,Trimis La'
    const rows   = leads.map(l =>
      [l.name, l.city, l.category_label, l.phone, l.contact_email,
       l.status, l.sent_at || ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusBadge = (status: Business['status']) => {
    const map: Record<string, string> = {
      found:  'bg-slate-700 text-slate-300',
      ready:  'bg-yellow-500/20 text-yellow-300',
      sent:   'bg-green-500/20 text-green-300',
      failed: 'bg-red-500/20 text-red-300',
    }
    const labels: Record<string, string> = {
      found: 'Găsit', ready: 'Gata', sent: 'Trimis', failed: 'Eroare',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || ''}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Leads</h1>
          <p className="text-slate-400 text-sm">
            {leads.length} afaceri în total · {counts.sent} emailuri trimise
          </p>
        </div>
        <div className="flex items-center gap-2">
          {counts.ready > 0 && (
            <button
              onClick={sendAllReady}
              className="flex items-center gap-2 px-4 py-2 rounded-xl
                         bg-green-600 hover:bg-green-500 text-white text-sm font-medium
                         transition-colors">
              <Send className="w-4 h-4" />
              Trimite toate ({counts.ready})
            </button>
          )}
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-3 py-2 rounded-xl
                       border border-slate-600 bg-slate-800 hover:bg-slate-700
                       text-slate-300 text-sm transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={reload}
            className="p-2 rounded-xl border border-slate-600 bg-slate-800
                       hover:bg-slate-700 text-slate-400 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          {leads.length > 0 && (
            <button
              onClick={() => { clearLeads(); reload() }}
              className="p-2 rounded-xl border border-red-500/30 bg-red-500/10
                         hover:bg-red-500/20 text-red-400 transition-colors"
              title="Șterge toate">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl
                        bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-xs underline">
            Închide
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Caută după nume, oraș..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-600
                       text-white placeholder-slate-500 text-sm
                       focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-slate-500" />
          {(['all', 'found', 'ready', 'sent', 'failed'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                          ${statusFilter === s
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'}`}>
              {s === 'all' ? `Toate (${counts.all})` : `${s} (${counts[s]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          {leads.length === 0
            ? <>
                <p>Nu ai încă niciun lead.</p>
                <p className="text-xs mt-1">
                  Mergi la <a href="/campaign" className="text-green-400 hover:underline">Campanie</a> pentru a găsi afaceri.
                </p>
              </>
            : <p>Niciun lead nu corespunde filtrului ales.</p>
          }
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(biz => {
            const isExpanded = expanded === biz.place_id
            const proc       = processing[biz.place_id]

            return (
              <div key={biz.place_id}
                   className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
                {/* Row */}
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm truncate max-w-48">
                        {biz.name}
                      </span>
                      {statusBadge(biz.status)}
                      <span className="text-slate-500 text-xs">{biz.city}</span>
                      <span className="text-slate-600 text-xs">{biz.category_label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-slate-500 text-xs">{biz.phone}</span>
                      {biz.contact_email && (
                        <span className="text-slate-400 text-xs">{biz.contact_email}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Generate */}
                    {biz.status !== 'sent' && (
                      <button
                        disabled={!!proc || !biz.contact_email}
                        onClick={() => generateEmail(biz)}
                        title={!biz.contact_email ? 'Adaugă email de contact' : 'Generează email cu AI'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                                   font-medium bg-blue-600/80 hover:bg-blue-600
                                   disabled:opacity-40 disabled:cursor-not-allowed
                                   text-white transition-colors">
                        {proc === 'generating'
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Wand2 className="w-3.5 h-3.5" />}
                        AI
                      </button>
                    )}

                    {/* Send */}
                    {biz.status === 'ready' && (
                      <button
                        disabled={!!proc}
                        onClick={() => sendEmail(biz)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                                   font-medium bg-green-600/80 hover:bg-green-600
                                   disabled:opacity-40 text-white transition-colors">
                        {proc === 'sending'
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Send className="w-3.5 h-3.5" />}
                        Trimite
                      </button>
                    )}

                    {biz.status === 'sent' && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => { deleteLead(biz.place_id); reload() }}
                      className="p-1.5 rounded-lg hover:bg-red-500/20
                                 text-slate-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Expand */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : biz.place_id)}
                      className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600
                                 text-slate-400 transition-colors">
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-700 p-4 bg-slate-900/30 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Contact email edit */}
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">
                          Email de contact
                        </label>
                        <input
                          type="email"
                          defaultValue={biz.contact_email}
                          onBlur={e => updateField(biz.place_id, 'contact_email', e.target.value)}
                          placeholder="contact@afacere.ro"
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600
                                     text-white placeholder-slate-500 text-sm
                                     focus:outline-none focus:border-green-500 transition-colors"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Adresă</p>
                        <p className="text-slate-300 text-sm">{biz.address || '—'}</p>
                        {biz.sent_at && (
                          <p className="text-slate-500 text-xs mt-1">
                            Trimis: {new Date(biz.sent_at).toLocaleString('ro-RO')}
                          </p>
                        )}
                        {biz.error && (
                          <p className="text-red-400 text-xs mt-1">Eroare: {biz.error}</p>
                        )}
                      </div>
                    </div>

                    {/* Edit subject */}
                    {biz.generated_subject && (
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Subject</label>
                        <input
                          type="text"
                          defaultValue={biz.generated_subject}
                          onBlur={e => updateField(biz.place_id, 'generated_subject', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600
                                     text-green-400 text-sm
                                     focus:outline-none focus:border-green-500 transition-colors"
                        />
                      </div>
                    )}

                    {/* Edit body */}
                    {biz.generated_body && (
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Body email</label>
                        <textarea
                          rows={8}
                          defaultValue={biz.generated_body}
                          onBlur={e => updateField(biz.place_id, 'generated_body', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700
                                     text-slate-300 text-xs font-mono leading-relaxed
                                     focus:outline-none focus:border-green-500 transition-colors
                                     resize-y"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
