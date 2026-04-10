'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  getLeads, addLeads, updateLead, deleteLead, clearLeads,
  getSettings, incrementTodaySent, getTodayStats,
} from '@/lib/storage'
import { CITY_COORDINATES, BUSINESS_CATEGORIES, JUDETE, HIGH_CONVERSION_CATEGORIES } from '@/lib/constants'
import type { Business, Settings } from '@/lib/types'

const CITIES = Object.keys(CITY_COORDINATES).sort()
const CATEGORIES = Object.entries(BUSINESS_CATEGORIES)

// ─── helpers ──────────────────────────────────────────────────────────────────
const clr = {
  wa:    '#25D366',
  blue:  '#63b3ed',
  amber: '#f6ad55',
  red:   '#fc8181',
  green: '#4ade80',
}

function tag(color: string, text: string) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 9px', borderRadius:20,
      fontSize:11, fontWeight:700, background:`${color}22`, color, border:`1px solid ${color}44` }}>
      {text}
    </span>
  )
}

function Stars({ r }: { r: number }) {
  return <span style={{ color:'#f59e0b', fontSize:12 }}>
    {'★'.repeat(Math.round(r))}{'☆'.repeat(5-Math.round(r))}
    <span style={{ color:'#475569', marginLeft:4 }}>{r.toFixed(1)}</span>
  </span>
}

const STAGE_LABELS: Record<string, [string,string]> = {
  new:          ['⬜','Nou'],
  sent_opening: ['📤','Trimis'],
  replied:      ['💬','Răspuns!'],
  demo_sent:    ['🎨','Demo trimis'],
  negotiating:  ['🤝','Negociere'],
  closed_won:   ['✅','Client!'],
  closed_lost:  ['❌','Pierdut'],
}

// ─── Modal container ──────────────────────────────────────────────────────────
function Modal({ onClose, children, wide = false }: { onClose:()=>void; children:React.ReactNode; wide?:boolean }) {
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(6px)',
        zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:12 }}>
      <div style={{ background:'#0b1628', border:'1px solid rgba(99,179,237,0.18)', borderRadius:20,
        width:'100%', maxWidth: wide ? 680 : 520, maxHeight:'92vh', overflow:'auto' }}>
        {children}
      </div>
    </div>
  )
}

// ─── ConversationModal: full flow ─────────────────────────────────────────────
function ConversationModal({ biz, settings, onClose, onUpdate }:
  { biz:Business; settings:Settings; onClose:()=>void; onUpdate:(id:string,u:Partial<Business>)=>void }) {

  const [tab, setTab] = useState<'message'|'reply'|'demo'>('message')
  const [waMsg, setWaMsg] = useState(biz.generated_whatsapp || '')
  const [emailSubj, setEmailSubj] = useState(biz.generated_subject || '')
  const [emailBody, setEmailBody] = useState(biz.generated_body || '')
  const [emailTo, setEmailTo] = useState(biz.contact_email || '')
  const [replyText, setReplyText] = useState(biz.reply_text || '')
  const [followupMsg, setFollowupMsg] = useState('')
  const [demoHtml, setDemoHtml] = useState(biz.generated_demo_html || '')
  const [msgTab, setMsgTab] = useState<'wa'|'email'>('wa')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [copied, setCopied] = useState('')
  const [err, setErr] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const apiBase = {
    anthropicApiKey: settings.anthropicApiKey,
    senderName: settings.senderName,
    yourWebsite: settings.yourWebsite,
    yourPortfolio: settings.yourPortfolio,
    yourPhone: settings.yourPhone,
    priceFrom: settings.priceFrom,
    priceTo: settings.priceTo,
    deliveryDays: settings.deliveryDays,
  }

  async function generate(mode: string, extra?: Record<string,string>) {
    if (!settings.anthropicApiKey) { setErr('Adaugă Anthropic API key în Setări ⚙️'); return }
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/generate-message', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ business:biz, mode, variant:Math.floor(Math.random()*4), ...apiBase, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||'Eroare')
      if (data.whatsapp && mode !== 'followup') { setWaMsg(data.whatsapp); onUpdate(biz.place_id,{generated_whatsapp:data.whatsapp,status:'ready'}) }
      if (data.whatsapp && mode === 'followup')   setFollowupMsg(data.whatsapp)
      if (data.subject)  { setEmailSubj(data.subject); onUpdate(biz.place_id,{generated_subject:data.subject}) }
      if (data.body)     { setEmailBody(data.body);    onUpdate(biz.place_id,{generated_body:data.body,status:'ready'}) }
    } catch(e:unknown) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
  }

  async function generateDemo() {
    if (!settings.anthropicApiKey) { setErr('Adaugă Anthropic API key în Setări ⚙️'); return }
    setDemoLoading(true); setErr('')
    onUpdate(biz.place_id, { demo_status:'generating' })
    try {
      const res = await fetch('/api/generate-message', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ business:biz, mode:'demo', ...apiBase }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||'Eroare generare demo')
      if (data.demo_html) {
        setDemoHtml(data.demo_html)
        onUpdate(biz.place_id, { generated_demo_html:data.demo_html, demo_status:'ready' })
      }
    } catch(e:unknown) { setErr(e instanceof Error ? e.message : String(e)); onUpdate(biz.place_id,{demo_status:'none'}) }
    finally { setDemoLoading(false) }
  }

  async function copyText(text: string, key: string) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(''),2500) } catch {}
  }

  function openWA(msg: string) {
    if (!biz.whatsapp_link) return
    window.open(`${biz.whatsapp_link}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function markSent() {
    onUpdate(biz.place_id, { status:'sent', conversation_stage:'sent_opening', sent_at:new Date().toISOString(), contact_method:'whatsapp' })
    incrementTodaySent(true)
  }

  function downloadDemo() {
    if (!demoHtml) return
    const blob = new Blob([demoHtml], {type:'text/html'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `demo-${biz.name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}.html`
    a.click()
  }

  const inputStyle = { width:'100%', background:'rgba(6,13,26,0.8)', border:'1px solid rgba(99,179,237,0.15)', borderRadius:10, padding:'10px 14px', color:'#e2e8f0', fontSize:14, outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const }
  const btnPrimary = (color='#25D366',color2='#128C7E') => ({ background:`linear-gradient(135deg,${color},${color2})`, color:'#fff', border:'none', borderRadius:12, padding:'11px 20px', fontWeight:700, fontSize:14, cursor:'pointer', transition:'transform .15s', display:'block', width:'100%', marginTop:8 })
  const btnGhost = { background:'rgba(255,255,255,0.05)', color:'#94a3b8', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, padding:'6px 12px', fontWeight:600, fontSize:12, cursor:'pointer' }

  return (
    <Modal onClose={onClose} wide>
      {/* Header */}
      <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid rgba(99,179,237,0.1)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontWeight:800, color:'#f1f5f9', fontSize:17 }}>{biz.name}</div>
            <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{biz.category_label} · {biz.city.replace(' 🏘️','')}</div>
            <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:12, color:'#94a3b8' }}>📞 {biz.phone}</span>
              {biz.rating>0 && <Stars r={biz.rating} />}
              {biz.reviews_count>0 && <span style={{ fontSize:11, color:'#475569' }}>({biz.reviews_count} recenzii)</span>}
              {biz.is_small_city && tag('#f6ad55','🏘️ Oraș mic')}
              {biz.whatsapp_link && tag('#25D366','📱 WA')}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#475569', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        {/* Stage selector */}
        <div style={{ display:'flex', gap:6, marginTop:12, flexWrap:'wrap' }}>
          {Object.entries(STAGE_LABELS).map(([k,[icon,label]])=>(
            <button key={k} onClick={()=>onUpdate(biz.place_id,{conversation_stage:k as Business['conversation_stage']})}
              style={{ padding:'4px 10px', borderRadius:20, border:'none', fontSize:11, fontWeight:700, cursor:'pointer',
                background: biz.conversation_stage===k ? 'rgba(99,179,237,0.25)' : 'rgba(255,255,255,0.04)',
                color: biz.conversation_stage===k ? '#63b3ed' : '#475569' }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Flow tabs */}
        <div style={{ display:'flex', gap:6, marginTop:12 }}>
          {(['message','reply','demo'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{ flex:1, padding:'8px 0', borderRadius:10, border:'none', fontWeight:700, fontSize:12, cursor:'pointer',
                background: tab===t
                  ? t==='demo' ? 'linear-gradient(135deg,#f6ad55,#ed8936)'
                  : t==='reply' ? 'linear-gradient(135deg,#63b3ed,#3b82f6)'
                  : 'linear-gradient(135deg,#25D366,#128C7E)'
                  : 'rgba(255,255,255,0.04)',
                color: tab===t ? '#fff' : '#475569' }}>
              {t==='message'?'1️⃣ Mesaj inițial': t==='reply'?'2️⃣ Răspuns primit':'3️⃣ Demo site'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:20 }}>
        {err && <div style={{ background:'rgba(252,129,129,0.1)', border:'1px solid rgba(252,129,129,0.3)', color:'#fc8181', borderRadius:10, padding:'10px 14px', fontSize:13, marginBottom:14 }}>⚠️ {err}</div>}

        {/* ── TAB 1: Mesaj inițial ── */}
        {tab==='message' && (
          <div>
            <div style={{ display:'flex', gap:6, marginBottom:14 }}>
              {(['wa','email'] as const).map(t=>(
                <button key={t} onClick={()=>setMsgTab(t)}
                  style={{ flex:1, padding:'7px 0', borderRadius:9, border:'none', fontWeight:700, fontSize:12, cursor:'pointer',
                    background: msgTab===t ? (t==='wa'?'linear-gradient(135deg,#25D366,#128C7E)':'linear-gradient(135deg,#3b82f6,#1d4ed8)') : 'rgba(255,255,255,0.04)',
                    color: msgTab===t ? '#fff' : '#475569' }}>
                  {t==='wa'?'📱 WhatsApp':'✉️ Email'}
                </button>
              ))}
            </div>

            {msgTab==='wa' && (
              !waMsg ? (
                <div style={{ textAlign:'center', padding:'28px 0' }}>
                  <div style={{ fontSize:44, marginBottom:10 }}>🎯</div>
                  <div style={{ color:'#64748b', fontSize:13, marginBottom:18, lineHeight:1.6 }}>
                    AI generează un mesaj captivant, personalizat<br/>bazat pe datele reale din Google Maps
                  </div>
                  <button onClick={()=>generate('whatsapp')} disabled={loading}
                    style={{ ...btnPrimary(), width:'auto', padding:'12px 28px', display:'inline-block' }}>
                    {loading?'⏳ Generez...':'✨ Generează mesaj captivant'}
                  </button>
                  {!settings.anthropicApiKey && <p style={{ color:'#fc8181', fontSize:11, marginTop:8 }}>Configurează API key în ⚙️ Setări</p>}
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.08em' }}>Mesaj WhatsApp</span>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>generate('whatsapp')} disabled={loading} style={btnGhost}>{loading?'⏳':'🔄 Alt mesaj'}</button>
                    </div>
                  </div>
                  <textarea value={waMsg} onChange={e=>setWaMsg(e.target.value)} rows={6}
                    style={{ ...inputStyle, resize:'vertical', lineHeight:1.7 }} />
                  <div style={{ fontSize:11, color:'#334155', marginTop:4, marginBottom:2 }}>{waMsg.length} caractere · {waMsg.split('\n').filter(Boolean).length} rânduri</div>

                  {/* Preview bubble */}
                  <div style={{ background:'rgba(37,211,102,0.06)', border:'1px solid rgba(37,211,102,0.15)', borderRadius:12, padding:14, margin:'12px 0', borderTopLeftRadius:2 }}>
                    <div style={{ fontSize:11, color:'#25D366', fontWeight:700, marginBottom:6 }}>👁 Preview WhatsApp</div>
                    <div style={{ fontSize:14, color:'#e2e8f0', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{waMsg}</div>
                  </div>

                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={async()=>{ await copyText(waMsg,'wa'); openWA(waMsg); markSent(); }}
                      disabled={!biz.whatsapp_link}
                      style={{ ...btnPrimary(), flex:1, marginTop:0, padding:'13px', fontSize:15, opacity:biz.whatsapp_link?1:0.4 }}>
                      {copied==='wa'?'✅ Copiat! WA deschis...':'📱 Trimite pe WhatsApp'}
                    </button>
                    <button onClick={()=>copyText(waMsg,'copy')}
                      style={{ ...btnGhost, marginTop:0, padding:'13px 14px', fontSize:13 }}>
                      {copied==='copy'?'✅':'📋'}
                    </button>
                  </div>
                  <p style={{ fontSize:11, color:'#334155', textAlign:'center', marginTop:6 }}>
                    Mesajul e copiat automat + WhatsApp se deschide
                  </p>
                </>
              )
            )}

            {msgTab==='email' && (
              !emailSubj ? (
                <div style={{ textAlign:'center', padding:'28px 0' }}>
                  <div style={{ fontSize:44, marginBottom:10 }}>✉️</div>
                  <div style={{ color:'#64748b', fontSize:13, marginBottom:18 }}>AI generează un email cu subiect captivant</div>
                  <button onClick={()=>generate('email')} disabled={loading}
                    style={{ ...btnPrimary('#3b82f6','#1d4ed8'), width:'auto', padding:'12px 28px', display:'inline-block' }}>
                    {loading?'⏳ Generez...':'✨ Generează email'}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.08em', display:'block', marginBottom:6 }}>Email destinatar</label>
                    <input value={emailTo} onChange={e=>setEmailTo(e.target.value)} placeholder="email@afacere.ro" style={inputStyle} />
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <label style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.08em' }}>Subiect</label>
                      <button onClick={()=>generate('email')} disabled={loading} style={btnGhost}>{loading?'⏳':'🔄'}</button>
                    </div>
                    <input value={emailSubj} onChange={e=>setEmailSubj(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.08em', display:'block', marginBottom:6 }}>Corp email</label>
                    <textarea value={emailBody} onChange={e=>setEmailBody(e.target.value)} rows={8}
                      style={{ ...inputStyle, resize:'vertical', lineHeight:1.6 }} />
                  </div>
                  <button onClick={()=>{ if(emailTo&&emailSubj&&emailBody) window.location.href=`mailto:${emailTo}?subject=${encodeURIComponent(emailSubj)}&body=${encodeURIComponent(emailBody)}`; }}
                    disabled={!emailTo||!emailSubj||!emailBody}
                    style={{ ...btnPrimary('#3b82f6','#1d4ed8'), padding:'13px', fontSize:15 }}>
                    ✉️ Deschide în Mail
                  </button>
                </>
              )
            )}
          </div>
        )}

        {/* ── TAB 2: Răspuns primit ── */}
        {tab==='reply' && (
          <div>
            <div style={{ background:'rgba(99,179,237,0.06)', border:'1px solid rgba(99,179,237,0.15)', borderRadius:12, padding:14, marginBottom:16 }}>
              <div style={{ fontSize:12, color:'#63b3ed', fontWeight:700, marginBottom:8 }}>💡 Fluxul corect</div>
              <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.7 }}>
                <strong style={{ color:'#e2e8f0' }}>1.</strong> Notezi ce a răspuns clientul<br/>
                <strong style={{ color:'#e2e8f0' }}>2.</strong> Generezi răspunsul perfect cu AI<br/>
                <strong style={{ color:'#e2e8f0' }}>3.</strong> Dacă e interesat → treci la tab 3 Demo
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.08em', display:'block', marginBottom:6 }}>
                Ce a răspuns clientul?
              </label>
              <textarea value={replyText} onChange={e=>{ setReplyText(e.target.value); onUpdate(biz.place_id,{reply_text:e.target.value, conversation_stage:'replied', replied_at:new Date().toISOString()}) }}
                placeholder={'ex: "Da, ce presupune?", "Nu mulțumesc", "Cât costă?", "Am deja site"...'}
                rows={3} style={{ ...inputStyle, resize:'vertical' }} />
            </div>

            {replyText && (
              <button onClick={()=>generate('followup',{replyText})} disabled={loading}
                style={{ ...btnPrimary('#63b3ed','#3b82f6'), padding:'12px', fontSize:14, marginBottom:8 }}>
                {loading?'⏳ Generez răspuns...':'🤖 Generează răspuns perfect'}
              </button>
            )}

            {followupMsg && (
              <>
                <div style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8, marginTop:14 }}>Răspunsul tău</div>
                <textarea value={followupMsg} onChange={e=>setFollowupMsg(e.target.value)} rows={5}
                  style={{ ...inputStyle, resize:'vertical', lineHeight:1.7 }} />
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <button onClick={()=>{ copyText(followupMsg,'fu'); openWA(followupMsg); }}
                    disabled={!biz.whatsapp_link}
                    style={{ ...btnPrimary(), flex:1, marginTop:0, padding:'11px', opacity:biz.whatsapp_link?1:0.4 }}>
                    {copied==='fu'?'✅ Copiat!':'📱 Trimite răspunsul'}
                  </button>
                  <button onClick={()=>copyText(followupMsg,'fuc')} style={{ ...btnGhost, marginTop:0, padding:'11px 14px' }}>
                    {copied==='fuc'?'✅':'📋'}
                  </button>
                </div>
                <div style={{ marginTop:14, padding:12, background:'rgba(37,211,102,0.06)', border:'1px solid rgba(37,211,102,0.15)', borderRadius:10 }}>
                  <div style={{ fontSize:12, color:'#25D366', fontWeight:700, marginBottom:6 }}>💡 Pasul următor recomandat</div>
                  <div style={{ fontSize:13, color:'#94a3b8' }}>Dacă e interesat → apasă tab-ul <strong style={{ color:'#f6ad55' }}>3️⃣ Demo site</strong> și generează demo-ul personalizat gratuit.</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB 3: Demo site ── */}
        {tab==='demo' && (
          <div>
            <div style={{ background:'rgba(246,173,85,0.06)', border:'1px solid rgba(246,173,85,0.15)', borderRadius:12, padding:14, marginBottom:16 }}>
              <div style={{ fontSize:12, color:'#f6ad55', fontWeight:700, marginBottom:6 }}>🎨 Demo site personalizat</div>
              <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.7 }}>
                AI generează un site complet cu <strong style={{ color:'#e2e8f0' }}>numele, tipul și datele reale</strong> ale acestei afaceri.
                Descarcă HTML-ul și trimite-l pe WhatsApp ca atașament — sau urcă-l pe <strong style={{ color:'#e2e8f0' }}>tiiny.host</strong> și trimite linkul.
              </div>
            </div>

            {!demoHtml ? (
              <div style={{ textAlign:'center', padding:'24px 0' }}>
                <div style={{ fontSize:52, marginBottom:12 }}>🌐</div>
                <div style={{ color:'#64748b', fontSize:13, marginBottom:20, lineHeight:1.7 }}>
                  Claude AI construiește un site demo complet<br/>
                  cu datele din Google Maps ale acestei afaceri.<br/>
                  <span style={{ color:'#475569', fontSize:12 }}>⏱ Durează ~30 secunde</span>
                </div>
                <button onClick={generateDemo} disabled={demoLoading||!settings.anthropicApiKey}
                  style={{ ...btnPrimary('#f6ad55','#ed8936'), width:'auto', padding:'14px 32px', display:'inline-block', fontSize:15, opacity:settings.anthropicApiKey?1:0.5 }}>
                  {demoLoading?'⏳ Generez site demo... (~30s)':'🎨 Generează Demo Site Gratuit'}
                </button>
                {!settings.anthropicApiKey && <p style={{ color:'#fc8181', fontSize:11, marginTop:8 }}>Configurează API key în ⚙️ Setări</p>}
                {demoLoading && (
                  <div style={{ marginTop:16, color:'#64748b', fontSize:12 }}>
                    AI construiește: header, servicii, galerie, contact, footer...<br/>
                    <div style={{ width:200, height:3, background:'rgba(246,173,85,0.15)', borderRadius:3, margin:'10px auto 0' }}>
                      <div style={{ height:3, background:'linear-gradient(90deg,#f6ad55,#ed8936)', borderRadius:3, width:'60%', animation:'none' }} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                  <button onClick={downloadDemo}
                    style={{ ...btnPrimary('#f6ad55','#ed8936'), flex:1, marginTop:0, padding:'11px', fontSize:13 }}>
                    ⬇️ Descarcă HTML
                  </button>
                  <button onClick={async()=>{
                    const msg = `Bună! Iată demo-ul site-ului pentru ${biz.name} — l-am pregătit special pentru voi 👆\n\nAșa ar arăta online. Site complet în ${settings.deliveryDays||5} zile, tot inclus.\n\nCum vi se pare direcția?\n\n${settings.senderName||'Alexandru'}${settings.yourPhone?'\n'+settings.yourPhone:''}`
                    await copyText(msg,'demo')
                    openWA(msg)
                    onUpdate(biz.place_id,{conversation_stage:'demo_sent'})
                  }} disabled={!biz.whatsapp_link}
                    style={{ ...btnPrimary(), flex:1, marginTop:0, padding:'11px', fontSize:13, opacity:biz.whatsapp_link?1:0.4 }}>
                    {copied==='demo'?'✅ Mesaj copiat!':'📱 Trimite pe WA'}
                  </button>
                  <button onClick={()=>generateDemo()} disabled={demoLoading}
                    style={{ ...btnGhost, marginTop:0, padding:'11px 14px' }}>
                    {demoLoading?'⏳':'🔄'}
                  </button>
                </div>

                {/* iFrame preview */}
                <div style={{ border:'1px solid rgba(99,179,237,0.15)', borderRadius:12, overflow:'hidden', height:400 }}>
                  <div style={{ background:'rgba(6,13,26,0.9)', padding:'8px 14px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid rgba(99,179,237,0.1)' }}>
                    <div style={{ display:'flex', gap:5 }}>
                      {['#fc8181','#f6ad55','#4ade80'].map(c=><div key={c} style={{ width:10,height:10,borderRadius:'50%',background:c }} />)}
                    </div>
                    <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:6, padding:'3px 12px', fontSize:11, color:'#475569', flex:1, textAlign:'center' }}>
                      {biz.name.toLowerCase().replace(/\s+/g,'-')}.ro — DEMO
                    </div>
                  </div>
                  <iframe ref={iframeRef} srcDoc={demoHtml} style={{ width:'100%', height:358, border:'none', display:'block' }} title="Demo site" />
                </div>

                <div style={{ marginTop:12, padding:12, background:'rgba(246,173,85,0.06)', border:'1px solid rgba(246,173,85,0.15)', borderRadius:10 }}>
                  <div style={{ fontSize:12, color:'#f6ad55', fontWeight:700, marginBottom:4 }}>💡 Cum trimiți demo-ul pe WhatsApp</div>
                  <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.7 }}>
                    <strong style={{ color:'#e2e8f0' }}>Varianta 1:</strong> Descarcă HTML → trimite fișierul ca atașament pe WA<br/>
                    <strong style={{ color:'#e2e8f0' }}>Varianta 2:</strong> Urcă pe <a href="https://tiiny.host" target="_blank" rel="noreferrer" style={{ color:'#63b3ed' }}>tiiny.host</a> gratuit → trimite linkul (mai professional)
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── LeadCard ──────────────────────────────────────────────────────────────────
function LeadCard({ biz, settings, onUpdate, onDelete }:
  { biz:Business; settings:Settings; onUpdate:(id:string,u:Partial<Business>)=>void; onDelete:(id:string)=>void }) {
  const [open, setOpen] = useState(false)
  const [sl,ssl] = STAGE_LABELS[biz.conversation_stage||'new']||['⬜','Nou']

  const borderColor = biz.conversation_stage==='closed_won' ? 'rgba(74,222,128,0.3)'
    : biz.conversation_stage==='replied'||biz.conversation_stage==='negotiating' ? 'rgba(246,173,85,0.35)'
    : biz.is_small_city ? 'rgba(246,173,85,0.2)'
    : 'rgba(99,179,237,0.1)'

  return (
    <>
      <div style={{ background:'rgba(13,22,41,0.85)', border:`1px solid ${borderColor}`, borderRadius:14, padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:3 }}>
              <span style={{ fontWeight:700, color:'#f1f5f9', fontSize:14 }}>{biz.name}</span>
              {biz.is_small_city && <span>🏘️</span>}
              {tag(
                biz.conversation_stage==='closed_won' ? '#4ade80'
                : biz.conversation_stage==='replied'||biz.conversation_stage==='negotiating' ? '#f6ad55'
                : biz.conversation_stage==='sent_opening' ? '#63b3ed'
                : '#475569',
                `${sl} ${ssl}`
              )}
            </div>
            <div style={{ fontSize:12, color:'#64748b' }}>{biz.category_label} · {biz.city.replace(' 🏘️','')}</div>
          </div>
          <button onClick={()=>onDelete(biz.place_id)} style={{ background:'none',border:'none',color:'#2d3f5a',cursor:'pointer',fontSize:16 }}>✕</button>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, color:'#94a3b8' }}>📞 {biz.phone}</span>
          {biz.rating>0 && <Stars r={biz.rating} />}
          {biz.reviews_count>0 && <span style={{ fontSize:11, color:'#475569' }}>({biz.reviews_count})</span>}
          {biz.whatsapp_link && tag('#25D366','📱 WA')}
          {biz.demo_status==='ready' && tag('#f6ad55','🎨 Demo gata')}
        </div>

        {/* Reply preview */}
        {biz.reply_text && (
          <div style={{ background:'rgba(246,173,85,0.08)', border:'1px solid rgba(246,173,85,0.2)', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:12, color:'#f6ad55' }}>
            💬 "{biz.reply_text.slice(0,60)}{biz.reply_text.length>60?'...':''}"
          </div>
        )}

        <button onClick={()=>setOpen(true)}
          style={{ width:'100%', padding:'10px 16px', borderRadius:11, cursor:'pointer', fontWeight:700, fontSize:13, transition:'transform .12s',
            background: biz.conversation_stage==='closed_won' ? 'linear-gradient(135deg,#4ade80,#16a34a)'
              : biz.conversation_stage==='replied'||biz.conversation_stage==='negotiating' ? 'linear-gradient(135deg,#f6ad55,#ed8936)'
              : biz.whatsapp_link ? 'linear-gradient(135deg,rgba(37,211,102,0.2),rgba(18,140,126,0.2))'
              : 'rgba(99,179,237,0.12)',
            boxShadow: biz.conversation_stage==='replied' ? '0 0 16px rgba(246,173,85,0.25)' : 'none',
            border: biz.conversation_stage==='replied' ? '1px solid rgba(246,173,85,0.4)'
              : biz.whatsapp_link ? '1px solid rgba(37,211,102,0.3)' : '1px solid rgba(99,179,237,0.2)',
            color: biz.conversation_stage==='replied'||biz.conversation_stage==='negotiating' ? '#1a0f00'
              : biz.whatsapp_link ? '#25D366' : '#63b3ed' }}>
          {biz.conversation_stage==='closed_won' ? '✅ Client câștigat!'
            : biz.conversation_stage==='replied' ? '💬 A răspuns! → Vezi & răspunde'
            : biz.conversation_stage==='demo_sent' ? '🎨 Demo trimis → Urmărire'
            : biz.conversation_stage==='negotiating' ? '🤝 În negociere → Continuă'
            : biz.status==='sent' ? '📤 Trimis · Deschide conversația'
            : biz.whatsapp_link ? '📱 Deschide & Trimite'
            : '✉️ Scrie email'}
        </button>
      </div>

      {open && (
        <ConversationModal
          biz={biz}
          settings={settings}
          onClose={()=>setOpen(false)}
          onUpdate={(id,u)=>{ onUpdate(id,u); }}
        />
      )}
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [leads, setLeads]       = useState<Business[]>([])
  const [settings, setSettings] = useState<Settings>({} as Settings)
  const [city, setCity]         = useState('Câmpia Turzii 🏘️')
  const [category, setCategory] = useState('beauty_salon')
  const [searchMode, setSearchMode] = useState<'city'|'judet'>('city')
  const [judet, setJudet]       = useState('Cluj')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [filter, setFilter]     = useState<'all'|'found'|'sent'|'replied'|'demo'|'won'>('all')
  const [genProgress, setGenProgress] = useState<{done:number,total:number}|null>(null)

  useEffect(() => { setLeads(getLeads()); setSettings(getSettings()) }, [])

  function handleUpdate(id: string, updates: Partial<Business>) {
    updateLead(id, updates)
    setLeads(getLeads())
  }
  function handleDelete(id: string) { deleteLead(id); setLeads(getLeads()) }

  async function searchCityCategory(c: string, cat: string): Promise<Business[]> {
    const res = await fetch('/api/find-businesses', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ city:c, category:cat, googleApiKey:settings.googlePlacesApiKey }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error||'Eroare API')
    return (data.businesses||[]).map((b: Business) => ({
      ...b,
      generated_demo_html: '',
      demo_status: 'none',
      conversation_stage: 'new',
      reply_text: '',
      notes: '',
    }))
  }

  async function handleSearch() {
    if (!settings.googlePlacesApiKey) { setSearchError('Configurează Google Places API key în Setări ⚙️'); return }
    setSearching(true); setSearchError('')
    try {
      let all: Business[] = []
      const cities = searchMode==='judet'&&judet ? JUDETE[judet]||[] : [city]
      for (const c of cities) {
        try { const r = await searchCityCategory(c, category); all = [...all, ...r] } catch {}
      }
      const updated = addLeads(all)
      setLeads(updated)
    } catch(e:unknown) { setSearchError(e instanceof Error ? e.message : String(e)) }
    finally { setSearching(false) }
  }

  async function generateAllMessages() {
    const targets = leads.filter(l=>!l.generated_whatsapp&&l.conversation_stage==='new')
    if (!targets.length||!settings.anthropicApiKey) return
    setGenProgress({done:0,total:targets.length})
    for (let i=0;i<targets.length;i++) {
      try {
        const res = await fetch('/api/generate-message',{
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ business:targets[i], mode:'whatsapp', variant:i%4, anthropicApiKey:settings.anthropicApiKey, senderName:settings.senderName, yourWebsite:settings.yourWebsite, yourPortfolio:settings.yourPortfolio, yourPhone:settings.yourPhone, priceFrom:settings.priceFrom, priceTo:settings.priceTo, deliveryDays:settings.deliveryDays }),
        })
        const data = await res.json()
        if (res.ok&&data.whatsapp) updateLead(targets[i].place_id,{generated_whatsapp:data.whatsapp,status:'ready'})
      } catch {}
      setGenProgress({done:i+1,total:targets.length})
      await new Promise(r=>setTimeout(r,700))
    }
    setLeads(getLeads())
    setGenProgress(null)
  }

  const filtered = leads.filter(l => {
    if (filter==='all')     return true
    if (filter==='found')   return l.conversation_stage==='new'||l.conversation_stage==='sent_opening'
    if (filter==='replied') return l.conversation_stage==='replied'||l.conversation_stage==='negotiating'
    if (filter==='demo')    return l.conversation_stage==='demo_sent'||l.demo_status==='ready'
    if (filter==='sent')    return l.status==='sent'
    if (filter==='won')     return l.conversation_stage==='closed_won'
    return true
  })

  const counts = {
    replied: leads.filter(l=>l.conversation_stage==='replied'||l.conversation_stage==='negotiating').length,
    won:     leads.filter(l=>l.conversation_stage==='closed_won').length,
    demo:    leads.filter(l=>l.demo_status==='ready').length,
    sent:    leads.filter(l=>l.status==='sent').length,
  }
  const notGenerated = leads.filter(l=>!l.generated_whatsapp&&l.conversation_stage==='new').length

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#060d1a 0%,#0b1628 60%,#060d1a 100%)' }}>
      {/* Header */}
      <header style={{ background:'rgba(6,13,26,0.95)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(99,179,237,0.08)', padding:'13px 16px', position:'sticky', top:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Link href="/" style={{ color:'#475569', fontSize:13, textDecoration:'none' }}>← Acasă</Link>
          <span style={{ color:'#1e293b' }}>/</span>
          <span style={{ fontWeight:800, color:'#f1f5f9', fontSize:15 }}>Leads</span>
          {counts.replied>0 && (
            <span style={{ background:'rgba(246,173,85,0.2)', color:'#f6ad55', border:'1px solid rgba(246,173,85,0.4)', borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:700, animation:'pulse 2s infinite' }}>
              {counts.replied} răspuns{counts.replied>1?'uri':''}!
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:12, color:'#334155' }}><span style={{ color:'#63b3ed', fontWeight:700 }}>{leads.length}</span> leads</span>
          {leads.length>0 && <button onClick={()=>{if(confirm('Ștergi toate?')){clearLeads();setLeads([])}}} style={{ background:'rgba(252,129,129,0.08)', border:'1px solid rgba(252,129,129,0.2)', color:'#fc8181', borderRadius:8, padding:'5px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>🗑️</button>}
          <Link href="/settings" style={{ background:'rgba(99,179,237,0.1)', border:'1px solid rgba(99,179,237,0.2)', color:'#63b3ed', borderRadius:9, padding:'6px 12px', fontSize:12, fontWeight:700, textDecoration:'none' }}>⚙️ Setări</Link>
        </div>
      </header>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'16px 14px', display:'flex', gap:16, flexWrap:'wrap' }}>
        {/* Sidebar */}
        <div style={{ width:260, flexShrink:0 }}>
          {/* Search */}
          <div style={{ background:'rgba(13,22,41,0.85)', border:'1px solid rgba(99,179,237,0.12)', borderRadius:14, padding:16, marginBottom:12 }}>
            <div style={{ fontWeight:700, color:'#f1f5f9', fontSize:14, marginBottom:14 }}>🔍 Caută leads</div>

            <div style={{ display:'flex', gap:4, marginBottom:12, background:'rgba(0,0,0,0.3)', borderRadius:9, padding:3 }}>
              {(['city','judet'] as const).map(m=>(
                <button key={m} onClick={()=>setSearchMode(m)} style={{ flex:1, padding:'6px 0', borderRadius:7, border:'none', fontWeight:700, fontSize:11, cursor:'pointer', background:searchMode===m?'rgba(99,179,237,0.2)':'transparent', color:searchMode===m?'#63b3ed':'#475569' }}>
                  {m==='city'?'🏙️ Oraș':'🗺️ Județ'}
                </button>
              ))}
            </div>

            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.08em', display:'block', marginBottom:5 }}>{searchMode==='city'?'Oraș':'Județ'}</label>
              {searchMode==='city'
                ? <select value={city} onChange={e=>setCity(e.target.value)} style={{ width:'100%', background:'rgba(6,13,26,0.8)', border:'1px solid rgba(99,179,237,0.15)', borderRadius:9, padding:'9px 12px', color:'#e2e8f0', fontSize:13, outline:'none' }}>
                    {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                : <select value={judet} onChange={e=>setJudet(e.target.value)} style={{ width:'100%', background:'rgba(6,13,26,0.8)', border:'1px solid rgba(99,179,237,0.15)', borderRadius:9, padding:'9px 12px', color:'#e2e8f0', fontSize:13, outline:'none' }}>
                    {Object.keys(JUDETE).map(j=><option key={j} value={j}>{j} ({JUDETE[j].length} orașe)</option>)}
                  </select>
              }
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.08em', display:'block', marginBottom:5 }}>Categorie</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} style={{ width:'100%', background:'rgba(6,13,26,0.8)', border:'1px solid rgba(99,179,237,0.15)', borderRadius:9, padding:'9px 12px', color:'#e2e8f0', fontSize:13, outline:'none' }}>
                <optgroup label="⭐ Conversie maximă">
                  {HIGH_CONVERSION_CATEGORIES.map(k=><option key={k} value={k}>{BUSINESS_CATEGORIES[k]}</option>)}
                </optgroup>
                <optgroup label="Toate">
                  {CATEGORIES.filter(([k])=>!HIGH_CONVERSION_CATEGORIES.includes(k)).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </optgroup>
              </select>
            </div>

            {searchError && <div style={{ background:'rgba(252,129,129,0.1)', border:'1px solid rgba(252,129,129,0.3)', color:'#fc8181', borderRadius:8, padding:'8px 11px', fontSize:12, marginBottom:10 }}>⚠️ {searchError}</div>}

            <button onClick={handleSearch} disabled={searching}
              style={{ width:'100%', padding:'11px', border:'none', borderRadius:10, cursor:'pointer', background:'linear-gradient(135deg,#63b3ed,#3b82f6)', color:'#fff', fontWeight:700, fontSize:13, opacity:searching?0.7:1 }}>
              {searching?'⏳ Caut...':'🔍 Caută afaceri fără site'}
            </button>
          </div>

          {/* Stats */}
          {leads.length>0 && (
            <div style={{ background:'rgba(13,22,41,0.85)', border:'1px solid rgba(99,179,237,0.12)', borderRadius:14, padding:16, marginBottom:12 }}>
              <div style={{ fontWeight:700, color:'#f1f5f9', fontSize:13, marginBottom:12 }}>📊 Pipeline</div>
              {[
                {l:'Total leads',v:leads.length,c:'#63b3ed'},
                {l:'📱 Cu WhatsApp',v:leads.filter(l=>l.whatsapp_link).length,c:'#25D366'},
                {l:'📤 Mesaje trimise',v:counts.sent,c:'#63b3ed'},
                {l:'💬 Au răspuns',v:counts.replied,c:'#f6ad55'},
                {l:'🎨 Demo generat',v:counts.demo,c:'#f6ad55'},
                {l:'✅ Clienți câștigați',v:counts.won,c:'#4ade80'},
              ].map(s=>(
                <div key={s.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize:12, color:'#475569' }}>{s.l}</span>
                  <span style={{ fontWeight:800, fontSize:14, color:s.c }}>{s.v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Generate all */}
          {notGenerated>0 && settings.anthropicApiKey && (
            <div style={{ background:'rgba(13,22,41,0.85)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:14, padding:16 }}>
              <div style={{ fontWeight:700, color:'#25D366', fontSize:13, marginBottom:8 }}>⚡ Generare masivă</div>
              <div style={{ fontSize:12, color:'#475569', marginBottom:12 }}>{notGenerated} leads fără mesaj</div>
              {genProgress && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#64748b', marginBottom:4 }}>
                    <span>Progres</span><span>{genProgress.done}/{genProgress.total}</span>
                  </div>
                  <div style={{ width:'100%', height:3, background:'rgba(37,211,102,0.1)', borderRadius:3 }}>
                    <div style={{ height:3, background:'linear-gradient(90deg,#25D366,#128C7E)', borderRadius:3, transition:'width .3s', width:`${(genProgress.done/genProgress.total)*100}%` }} />
                  </div>
                </div>
              )}
              <button onClick={generateAllMessages} disabled={genProgress!==null}
                style={{ width:'100%', padding:'10px', borderRadius:10, cursor:'pointer', background:'rgba(37,211,102,0.15)', border:'1px solid rgba(37,211,102,0.3)', color:'#25D366', fontWeight:700, fontSize:13, opacity:genProgress?0.6:1 }}>
                {genProgress?`⏳ ${genProgress.done}/${genProgress.total}...`:`⚡ Generează toate (${notGenerated})`}
              </button>
            </div>
          )}
        </div>

        {/* Main */}
        <div style={{ flex:1, minWidth:0 }}>
          {/* Filter tabs */}
          {leads.length>0 && (
            <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
              {([
                {k:'all',   l:`Toate (${leads.length})`},
                {k:'found', l:`Noi (${leads.filter(l=>l.conversation_stage==='new'||l.conversation_stage==='sent_opening').length})`},
                {k:'replied',l:`💬 Răspuns (${counts.replied})`, hot:counts.replied>0},
                {k:'demo',  l:`🎨 Demo (${counts.demo})`},
                {k:'won',   l:`✅ Câștigați (${counts.won})`},
              ] as {k:string,l:string,hot?:boolean}[]).map(f=>(
                <button key={f.k} onClick={()=>setFilter(f.k as typeof filter)}
                  style={{ padding:'6px 12px', borderRadius:20, fontWeight:700, fontSize:12, cursor:'pointer', whiteSpace:'nowrap',
                    background: filter===f.k ? (f.hot?'rgba(246,173,85,0.25)':'rgba(99,179,237,0.2)') : 'rgba(255,255,255,0.04)',
                    color: filter===f.k ? (f.hot?'#f6ad55':'#63b3ed') : '#475569',
                    boxShadow: f.hot&&filter!==f.k ? '0 0 10px rgba(246,173,85,0.2)' : 'none',
                    border: f.hot&&filter!==f.k ? '1px solid rgba(246,173,85,0.3)' : '1px solid transparent' }}>
                  {f.l}
                </button>
              ))}
            </div>
          )}

          {/* Empty */}
          {leads.length===0 && (
            <div style={{ textAlign:'center', paddingTop:60 }}>
              <div style={{ fontSize:56, marginBottom:14 }}>🎯</div>
              <div style={{ fontWeight:800, color:'#f1f5f9', fontSize:20, marginBottom:8 }}>Zero leads momentan</div>
              <div style={{ color:'#475569', fontSize:14, marginBottom:24, lineHeight:1.7 }}>
                Selectează un oraș sau județ + categorie<br/>și apasă Caută afaceri fără site
              </div>
              <div style={{ background:'rgba(13,22,41,0.85)', border:'1px solid rgba(99,179,237,0.12)', borderRadius:14, padding:18, maxWidth:280, margin:'0 auto', textAlign:'left' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#f1f5f9', marginBottom:10 }}>💡 Cel mai bun start azi:</div>
                <div style={{ fontSize:13, color:'#64748b', lineHeight:2 }}>
                  🏘️ <strong style={{ color:'#e2e8f0' }}>Județ Cluj</strong> → toate orașele mici<br/>
                  💄 Categorie: <strong style={{ color:'#e2e8f0' }}>Salon Înfrumusețare</strong><br/>
                  🥐 Sau: <strong style={{ color:'#e2e8f0' }}>Brutărie</strong> (sezon Paști!)
                </div>
              </div>
            </div>
          )}

          {/* Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
            {filtered.map(b=>(
              <LeadCard key={b.place_id} biz={b} settings={settings} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}`}</style>
    </div>
  )
}

