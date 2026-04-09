'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Rocket, Users, CheckCircle2, AlertCircle,
  TrendingUp, Settings, ChevronRight, Mail,
} from 'lucide-react'
import { getLeads, getSettings, getTodayStats, getAllStats } from '@/lib/storage'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLeads:    0,
    readyLeads:    0,
    sentTotal:     0,
    sentToday:     0,
    failedToday:   0,
    settingsOk:    false,
  })

  useEffect(() => {
    const leads      = getLeads()
    const settings   = getSettings()
    const todayStats = getTodayStats()
    const allStats   = getAllStats()

    setStats({
      totalLeads:  leads.length,
      readyLeads:  leads.filter(l => l.status === 'ready').length,
      sentTotal:   allStats.reduce((acc, s) => acc + s.sent, 0),
      sentToday:   todayStats.sent,
      failedToday: todayStats.failed,
      settingsOk:  !!(
        settings.googlePlacesApiKey &&
        settings.anthropicApiKey &&
        settings.senderEmail &&
        settings.senderAppPassword
      ),
    })
  }, [])

  const cards = [
    {
      label: 'Total Leads',
      value: stats.totalLeads,
      icon:  Users,
      color: 'text-blue-400',
      bg:    'bg-blue-500/10',
    },
    {
      label: 'Gata de Trimis',
      value: stats.readyLeads,
      icon:  Mail,
      color: 'text-yellow-400',
      bg:    'bg-yellow-500/10',
    },
    {
      label: 'Trimise Azi',
      value: stats.sentToday,
      icon:  CheckCircle2,
      color: 'text-green-400',
      bg:    'bg-green-500/10',
    },
    {
      label: 'Total Trimise',
      value: stats.sentTotal,
      icon:  TrendingUp,
      color: 'text-purple-400',
      bg:    'bg-purple-500/10',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400 text-sm">
          Automatizare outreach pentru afaceri locale din România fără website.
        </p>
      </div>

      {/* Settings warning */}
      {!stats.settingsOk && (
        <div className="mb-8 flex items-start gap-3 p-4 rounded-xl
                        bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-300 font-medium text-sm">Configurare necesară</p>
            <p className="text-slate-400 text-sm mt-0.5">
              Completează API key-urile în Setări înainte de a începe.
            </p>
          </div>
          <Link href="/settings"
                className="ml-auto shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg
                           bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold
                           transition-colors">
            <Settings className="w-3.5 h-3.5" /> Setări
          </Link>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label}
               className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="text-white font-semibold mb-4">Acțiuni rapide</h2>
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        <Link href="/campaign"
              className="group flex items-center gap-4 p-5 rounded-xl border border-slate-700
                         bg-slate-800/50 hover:border-green-500/50 hover:bg-slate-800
                         transition-all">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl
                          bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
            <Rocket className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold">Campanie Nouă</p>
            <p className="text-slate-400 text-sm">Caută afaceri fără website și trimite emailuri</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-green-400
                                   transition-colors" />
        </Link>

        <Link href="/leads"
              className="group flex items-center gap-4 p-5 rounded-xl border border-slate-700
                         bg-slate-800/50 hover:border-blue-500/50 hover:bg-slate-800
                         transition-all">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl
                          bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold">Gestionează Leads</p>
            <p className="text-slate-400 text-sm">Vizualizează, editează și trimite emailuri</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400
                                   transition-colors" />
        </Link>
      </div>

      {/* How it works */}
      <h2 className="text-white font-semibold mb-4">Cum funcționează</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            step: '1',
            title: 'Găsești afaceri',
            desc:  'Google Places API caută afaceri locale care nu au website în Google Maps.',
            color: 'bg-green-500',
          },
          {
            step: '2',
            title: 'Claude scrie emailul',
            desc:  'AI-ul generează un email personalizat pentru fiecare tip de afacere.',
            color: 'bg-blue-500',
          },
          {
            step: '3',
            title: 'Trimiți automat',
            desc:  'Emailurile sunt trimise cu delay anti-spam. Nu contactezi aceeași afacere de două ori.',
            color: 'bg-purple-500',
          },
        ].map(({ step, title, desc, color }) => (
          <div key={step}
               className="p-5 rounded-xl border border-slate-700 bg-slate-800/50">
            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full
                              ${color} text-white text-sm font-bold mb-3`}>
              {step}
            </span>
            <p className="text-white font-medium mb-1">{title}</p>
            <p className="text-slate-400 text-sm">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
