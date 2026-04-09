'use client'

import { useEffect, useState } from 'react'
import { Save, Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '@/lib/storage'
import type { Settings } from '@/lib/types'

function Field({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  placeholder,
  link,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'password' | 'number' | 'email'
  placeholder?: string
  link?: { text: string; href: string }
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        {link && (
          <a href={link.href} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
            {link.text} <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <div className="relative">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-900 border border-slate-600
                     text-white placeholder-slate-500 text-sm
                     focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30
                     transition-colors"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500
                             hover:text-slate-300 transition-colors">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  const set = (key: keyof Settings, value: string | number) =>
    setSettings(prev => ({ ...prev, [key]: value }))

  const handleSave = () => {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const configured = {
    google:    !!settings.googlePlacesApiKey,
    anthropic: !!settings.anthropicApiKey,
    email:     !!(settings.senderEmail && settings.senderAppPassword),
  }

  const StatusBadge = ({ ok }: { ok: boolean }) =>
    ok
      ? <span className="flex items-center gap-1 text-green-400 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" /> Configurat
        </span>
      : <span className="flex items-center gap-1 text-slate-500 text-xs">
          <AlertCircle className="w-3.5 h-3.5" /> Neconfigurat
        </span>

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-white mb-1">Setări</h1>
      <p className="text-slate-400 text-sm mb-8">
        Cheile API sunt salvate local în browser (localStorage), nu pe server.
      </p>

      {/* Status overview */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Google Places', ok: configured.google },
          { label: 'Claude AI',     ok: configured.anthropic },
          { label: 'Gmail',         ok: configured.email },
        ].map(({ label, ok }) => (
          <div key={label}
               className={`p-3 rounded-xl border text-sm font-medium
                           ${ok
                             ? 'border-green-500/30 bg-green-500/10 text-green-300'
                             : 'border-slate-700 bg-slate-800/50 text-slate-400'}`}>
            <StatusBadge ok={ok} />
            <p className="mt-1 text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        {/* Google Places */}
        <section className="p-5 rounded-xl border border-slate-700 bg-slate-800/50">
          <h2 className="text-white font-semibold mb-4 flex items-center justify-between">
            Google Places API
            <StatusBadge ok={configured.google} />
          </h2>
          <div className="space-y-4">
            <Field
              label="API Key"
              type="password"
              value={settings.googlePlacesApiKey}
              onChange={v => set('googlePlacesApiKey', v)}
              placeholder="AIzaSy..."
              hint="Activează Places API și creează un API Key"
              link={{ text: 'Google Console', href: 'https://console.cloud.google.com/' }}
            />
          </div>
        </section>

        {/* Anthropic */}
        <section className="p-5 rounded-xl border border-slate-700 bg-slate-800/50">
          <h2 className="text-white font-semibold mb-4 flex items-center justify-between">
            Anthropic / Claude API
            <StatusBadge ok={configured.anthropic} />
          </h2>
          <Field
            label="API Key"
            type="password"
            value={settings.anthropicApiKey}
            onChange={v => set('anthropicApiKey', v)}
            placeholder="sk-ant-..."
            hint="Folosit pentru generarea emailurilor personalizate"
            link={{ text: 'Anthropic Console', href: 'https://console.anthropic.com/' }}
          />
        </section>

        {/* Email */}
        <section className="p-5 rounded-xl border border-slate-700 bg-slate-800/50">
          <h2 className="text-white font-semibold mb-4 flex items-center justify-between">
            Configurare Email (Gmail)
            <StatusBadge ok={configured.email} />
          </h2>
          <div className="space-y-4">
            <Field
              label="Adresă Gmail"
              type="email"
              value={settings.senderEmail}
              onChange={v => set('senderEmail', v)}
              placeholder="tu@gmail.com"
            />
            <Field
              label="App Password Gmail"
              type="password"
              value={settings.senderAppPassword}
              onChange={v => set('senderAppPassword', v)}
              placeholder="xxxx xxxx xxxx xxxx"
              hint='NU parola Gmail! Generează un "App Password" cu 2FA activat.'
              link={{ text: 'Generează App Password', href: 'https://myaccount.google.com/apppasswords' }}
            />
            <Field
              label="Numele Tău (afișat în email)"
              value={settings.senderName}
              onChange={v => set('senderName', v)}
              placeholder="Alexandru Ionescu"
            />
          </div>
        </section>

        {/* Branding */}
        <section className="p-5 rounded-xl border border-slate-700 bg-slate-800/50">
          <h2 className="text-white font-semibold mb-4">Branding & Portofoliu</h2>
          <div className="space-y-4">
            <Field
              label="Website-ul tău"
              value={settings.yourWebsite}
              onChange={v => set('yourWebsite', v)}
              placeholder="https://websitultau.ro"
              hint="Va apărea în semnătura emailurilor"
            />
            <Field
              label="Portofoliu lucrări"
              value={settings.yourPortfolio}
              onChange={v => set('yourPortfolio', v)}
              placeholder="https://portofoliu.websitultau.ro"
              hint="Link menționat în emailuri pentru credibilitate"
            />
          </div>
        </section>

        {/* Campaign */}
        <section className="p-5 rounded-xl border border-slate-700 bg-slate-800/50">
          <h2 className="text-white font-semibold mb-4">Limitări Campanie</h2>
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1">
              Emailuri maxime pe zi
            </label>
            <input
              type="number"
              min={10}
              max={500}
              value={settings.maxEmailsPerDay}
              onChange={e => set('maxEmailsPerDay', Number(e.target.value))}
              className="w-32 px-3 py-2 rounded-lg bg-slate-900 border border-slate-600
                         text-white text-sm focus:outline-none focus:border-green-500
                         focus:ring-1 focus:ring-green-500/30 transition-colors"
            />
            <p className="mt-1 text-xs text-slate-500">
              Recomandat: 100-150/zi pentru a evita filtrele de spam
            </p>
          </div>
        </section>
      </div>

      {/* Save button */}
      <div className="mt-8 flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Salvat cu succes!
          </span>
        )}
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl
                     bg-green-500 hover:bg-green-400 active:scale-95
                     text-black font-semibold text-sm transition-all">
          <Save className="w-4 h-4" />
          Salvează Setările
        </button>
      </div>
    </div>
  )
}
