import { useState } from 'react'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import { PRICING_CONFIG } from '../../../config/pricingConfig.js'
import { getItem, setItem } from '../../../shared/utils/storage.js'
import { writeAudit } from '../adminUtils.js'

const DEFAULT_FARES = {
  mini: { base: PRICING_CONFIG.baseFare, perKm: PRICING_CONFIG.perKilometer, perMin: PRICING_CONFIG.perMinute, minimum: PRICING_CONFIG.minimumFare },
  comfort: { base: 128, perKm: 102, perMin: 13, minimum: 320 },
  xl: { base: 162, perKm: 130, perMin: 16, minimum: 405 },
  bike: { base: 72, perKm: 58, perMin: 7, minimum: 180 },
}

export default function PricingPage() {
  const savedPricing = getItem('gr_admin_pricing', {}) ?? {}
  const [fares, setFares] = useState({ ...DEFAULT_FARES, ...(savedPricing.fares ?? {}) })
  const [commission, setCommission] = useState(savedPricing.commission ?? 15)
  const [zones, setZones] = useState(() => getItem('gr_surge_zones', []) ?? [])
  const [promos, setPromos] = useState(() => getItem('gr_promo_codes', []) ?? [])
  const [zoneForm, setZoneForm] = useState({ name: '', multiplier: '1.2', radius: '2', latitude: '', longitude: '' })
  const [editingZone, setEditingZone] = useState(null)
  const [promoForm, setPromoForm] = useState({ code: '', discount: '', expires: '' })

  function saveFares(next) {
    setFares(next)
    setItem('gr_admin_pricing', { ...savedPricing, fares: next, commission })
  }
  function saveCommission(nextValue) {
    const next = Math.max(0, Math.min(100, Number(nextValue) || 0))
    setCommission(next)
    setItem('gr_admin_pricing', { ...savedPricing, fares, commission: next })
  }
  function saveZones(next) {
    setZones(next)
    setItem('gr_surge_zones', next)
  }
  function savePromos(next) {
    setPromos(next)
    setItem('gr_promo_codes', next)
  }
  function submitZone(event) {
    event.preventDefault()
    if (!zoneForm.name.trim()) return
    const zone = { id: editingZone?.id ?? `${Date.now()}`, name: zoneForm.name.trim(), multiplier: Number(zoneForm.multiplier), radius: Number(zoneForm.radius), center: { lat: Number(zoneForm.latitude), lng: Number(zoneForm.longitude) } }
    saveZones(editingZone ? zones.map((item) => item.id === editingZone.id ? zone : item) : [...zones, zone])
    writeAudit(editingZone ? 'Surge zone updated' : 'Surge zone added', zone.name)
    setEditingZone(null)
    setZoneForm({ name: '', multiplier: '1.2', radius: '2', latitude: '', longitude: '' })
  }
  function addPromo(event) {
    event.preventDefault()
    if (!promoForm.code.trim() || !promoForm.discount) return
    const promo = { id: `${Date.now()}`, code: promoForm.code.trim().toUpperCase(), discount: Number(promoForm.discount), expires: promoForm.expires, enabled: true, createdAt: new Date().toISOString() }
    savePromos([promo, ...promos])
    writeAudit('Promo code created', promo.code)
    setPromoForm({ code: '', discount: '', expires: '' })
  }

  return <>
    <div className="admin-page-heading"><div><span className="admin-eyebrow">FARE CONTROLS</span><h1>Pricing</h1><p>Configure base fares, demand zones and promotions.</p></div></div>
    <section className="admin-panel admin-section"><div className="admin-panel-heading"><div><h2>Fare configuration</h2><p>Rates are stored in LKR and apply by vehicle type.</p></div><button className="admin-button admin-button--primary" type="button" onClick={() => writeAudit('Fare configuration updated', 'Vehicle fare rates saved')}>Save rates</button></div><div className="admin-panel-body"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Vehicle type</th><th>Base fare</th><th>Per km</th><th>Per minute</th><th>Minimum fare</th></tr></thead><tbody>{Object.entries(fares).map(([type, values]) => <tr key={type}><td style={{ textTransform: 'capitalize', fontWeight: 700 }}>{type}</td>{['base', 'perKm', 'perMin', 'minimum'].map((field) => <td key={field}><label className="admin-field"><span className="admin-eyebrow" style={{ display: 'none' }}>{field}</span><input aria-label={`${type} ${field}`} min="0" type="number" value={values[field]} onChange={(event) => saveFares({ ...fares, [type]: { ...values, [field]: Number(event.target.value) } })} style={{ width: 105 }} /></label></td>)}</tr>)}</tbody></table></div></div></section>
    <div className="admin-card-grid admin-section"><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Surge zones</h2><p>Manage demand multipliers by map center and radius.</p></div></div><div className="admin-panel-body"><form className="admin-form-grid" onSubmit={submitZone}><label className="admin-field">Zone name<input required value={zoneForm.name} onChange={(event) => setZoneForm({ ...zoneForm, name: event.target.value })} placeholder="e.g. Fort district" /></label><label className="admin-field">Radius (km)<input required min="0.1" step="0.1" type="number" value={zoneForm.radius} onChange={(event) => setZoneForm({ ...zoneForm, radius: event.target.value })} /></label><label className="admin-field">Multiplier<input required min="1" step="0.1" type="number" value={zoneForm.multiplier} onChange={(event) => setZoneForm({ ...zoneForm, multiplier: event.target.value })} /></label><label className="admin-field">Center latitude<input required min="-90" max="90" step="any" type="number" value={zoneForm.latitude} onChange={(event) => setZoneForm({ ...zoneForm, latitude: event.target.value })} /></label><label className="admin-field">Center longitude<input required min="-180" max="180" step="any" type="number" value={zoneForm.longitude} onChange={(event) => setZoneForm({ ...zoneForm, longitude: event.target.value })} /></label><div className="admin-form-actions"><button className="admin-button admin-button--primary" type="submit">{editingZone ? <FiEdit2 /> : <FiPlus />}{editingZone ? 'Save zone' : 'Add zone'}</button></div></form><div className="admin-zone-grid" style={{ marginTop: 14 }}>{zones.map((zone) => <div className="admin-zone-row" key={zone.id}><div><strong>{zone.name}</strong><small>{zone.radius} km radius · {zone.multiplier}× surge · {zone.center?.lat}, {zone.center?.lng}</small></div><div className="admin-row-actions"><button className="admin-icon-button" aria-label={`Edit ${zone.name}`} type="button" onClick={() => { setEditingZone(zone); setZoneForm({ name: zone.name, radius: String(zone.radius), multiplier: String(zone.multiplier), latitude: String(zone.center?.lat ?? ''), longitude: String(zone.center?.lng ?? '') }) }}><FiEdit2 /></button><button className="admin-icon-button" aria-label={`Delete ${zone.name}`} type="button" onClick={() => { saveZones(zones.filter((item) => item.id !== zone.id)); writeAudit('Surge zone deleted', zone.name) }}><FiTrash2 /></button></div></div>)}{!zones.length && <div className="admin-empty">No surge zones configured.</div>}</div></div></section>
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Commission rate</h2><p>Platform share of each completed fare.</p></div></div><div className="admin-panel-body"><div className="admin-commission"><label className="admin-field">Rate (%)<input min="0" max="100" step="0.5" type="number" value={commission} onChange={(event) => saveCommission(event.target.value)} onBlur={() => writeAudit('Commission rate updated', `${commission}%`)} /></label><span className="admin-status admin-status--approved">Applied to completed fares</span></div></div></section></div>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Promo codes</h2><p>Create and manage rider discounts.</p></div></div><div className="admin-panel-body"><form className="admin-promo-form" onSubmit={addPromo}><label className="admin-field">Code<input required value={promoForm.code} onChange={(event) => setPromoForm({ ...promoForm, code: event.target.value })} placeholder="WELCOME10" /></label><label className="admin-field">Discount (%)<input required min="1" max="100" type="number" value={promoForm.discount} onChange={(event) => setPromoForm({ ...promoForm, discount: event.target.value })} /></label><label className="admin-field">Expires<input type="date" value={promoForm.expires} onChange={(event) => setPromoForm({ ...promoForm, expires: event.target.value })} /></label><button className="admin-button admin-button--primary" type="submit"><FiPlus />Create code</button></form><div className="admin-table-wrap" style={{ marginTop: 16 }}><table className="admin-table"><thead><tr><th>Code</th><th>Discount</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead><tbody>{promos.map((promo) => <tr key={promo.id}><td><strong>{promo.code}</strong></td><td>{promo.discount}%</td><td>{promo.expires || 'No expiry'}</td><td><span className={`admin-status admin-status--${promo.enabled ? 'active' : 'suspended'}`}>{promo.enabled ? 'Enabled' : 'Disabled'}</span></td><td><button className="admin-button" type="button" onClick={() => { savePromos(promos.map((item) => item.id === promo.id ? { ...item, enabled: !item.enabled } : item)); writeAudit(promo.enabled ? 'Promo code disabled' : 'Promo code enabled', promo.code) }}>{promo.enabled ? 'Disable' : 'Enable'}</button></td></tr>)}{!promos.length && <tr><td className="admin-empty" colSpan="5">No promo codes created.</td></tr>}</tbody></table></div></div></section>
  </>
}