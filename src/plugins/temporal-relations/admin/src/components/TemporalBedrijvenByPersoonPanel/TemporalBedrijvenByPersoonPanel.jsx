import React, { useState, useEffect, useCallback } from 'react';

const LINK_TYPE = 'koppeling_persoon_bedrijf';
const TEMPORAL_BASE = '/api/temporal-relations';
const OPEN_END = '2999-12-31';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function statusBadge(link) {
  const now = todayIso();
  const start = link.start_date || '0001-01-01';
  const end = link.end_date || OPEN_END;
  if (now < start) return { label: 'Toekomstig', color: '#7B79FF', bg: '#EEEEFE' };
  if (end !== OPEN_END && now > end) return { label: 'Verlopen', color: '#B72B1A', bg: '#FCECEA' };
  return { label: 'Actief', color: '#328048', bg: '#EAFBE7' };
}

function fmtDate(d) {
  if (!d || d === OPEN_END || d === '0001-01-01') return 'Open';
  return d;
}

function entityKey(item) {
  return item?.external_id ?? item?.id;
}

const s = {
  panel: { background: '#fff', border: '1px solid #DCDCE4', borderRadius: 4, marginBottom: 16, overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #DCDCE4', background: '#F6F6F9' },
  title: { fontWeight: 600, fontSize: 13, color: '#32324D', display: 'flex', alignItems: 'center', gap: 8 },
  count: { background: '#DCDCE4', borderRadius: 10, fontSize: 11, padding: '1px 7px', color: '#666687', fontWeight: 500 },
  addBtn: { background: 'transparent', border: '1px solid #4945FF', borderRadius: 4, color: '#4945FF', fontSize: 12, padding: '4px 10px', cursor: 'pointer', fontWeight: 600, lineHeight: 1.4 },
  body: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 32 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 4, border: '1px solid #EAEAEF', background: '#FAFAFB' },
  rowLeft: { display: 'flex', flexDirection: 'column', gap: 2 },
  rowActions: { display: 'flex', gap: 4, flexShrink: 0 },
  name: { fontSize: 13, fontWeight: 500, color: '#32324D' },
  badge: { fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '1px 6px' },
  dates: { fontSize: 11, color: '#8E8EA9' },
  meta: { fontSize: 11, color: '#666687' },
  iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#666687', fontSize: 14, padding: '2px 5px', borderRadius: 4, lineHeight: 1 },
  addForm: { padding: '12px 16px', borderBottom: '1px solid #DCDCE4', background: '#FAFAFB' },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#32324D', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  select: { width: '100%', padding: '8px 10px', border: '1px solid #DCDCE4', borderRadius: 4, fontSize: 13, color: '#32324D', background: '#fff', boxSizing: 'border-box' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #DCDCE4', borderRadius: 4, fontSize: 13, color: '#32324D', background: '#fff', boxSizing: 'border-box' },
  checkboxWrap: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: '#32324D' },
  saveBtn: { marginTop: 10, background: '#4945FF', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' },
  saveBtnDisabled: { marginTop: 10, background: '#C0C0CF', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'not-allowed', width: '100%' },
};

function PanelBody({ persoonNumericId }) {
  const [links, setLinks] = useState([]);
  const [bedrijven, setBedrijven] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newBedrijfId, setNewBedrijfId] = useState('');
  const [newStart, setNewStart] = useState(todayIso());
  const [newEnd, setNewEnd] = useState('');
  const [newTekenbevoegd, setNewTekenbevoegd] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchLinks = useCallback(async () => {
    const res = await fetch(`${TEMPORAL_BASE}/links/source-history?linkType=${LINK_TYPE}&sourceId=${persoonNumericId}`);
    const json = await res.json();
    setLinks(json.data || []);
  }, [persoonNumericId]);

  const fetchBedrijven = useCallback(async () => {
    const res = await fetch(`${TEMPORAL_BASE}/bedrijven`);
    const json = await res.json();
    setBedrijven(json.data || []);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchLinks(), fetchBedrijven()]).finally(() => setLoading(false));
  }, [fetchLinks, fetchBedrijven]);

  const bedrijfById = useCallback((id) => bedrijven.find((b) => entityKey(b) === id), [bedrijven]);

  const handleAdd = async () => {
    if (!newBedrijfId) return;
    setSaving(true);
    try {
      await fetch(`${TEMPORAL_BASE}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkType: LINK_TYPE,
          sourceId: persoonNumericId,
          targetId: Number(newBedrijfId),
          startDate: newStart,
          endDate: newEnd || OPEN_END,
          metadata: { tekenbevoegd: newTekenbevoegd },
        }),
      });
      setShowAdd(false);
      setNewBedrijfId('');
      setNewStart(todayIso());
      setNewEnd('');
      setNewTekenbevoegd(false);
      await fetchLinks();
    } finally {
      setSaving(false);
    }
  };

  const handleTerminate = async (linkId) => {
    await fetch(`${TEMPORAL_BASE}/links/${linkId}/terminate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endDate: todayIso() }),
    });
    await fetchLinks();
  };

  const handleDelete = async (linkId) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Weet je zeker dat je deze koppeling permanent wilt verwijderen?')) return;
    await fetch(`${TEMPORAL_BASE}/links/${linkId}`, { method: 'DELETE' });
    await fetchLinks();
  };

  const goToBedrijf = (documentId) => {
    window.location.href = `/admin/content-manager/collection-types/api::bedrijf.bedrijf/${documentId}`;
  };

  const sortOrder = { Actief: 0, Toekomstig: 1, Verlopen: 2 };
  const sorted = [...links].sort((a, b) => (sortOrder[statusBadge(a).label] ?? 3) - (sortOrder[statusBadge(b).label] ?? 3));

  if (loading) {
    return <div style={s.panel}><div style={s.header}><span style={s.title}>Bedrijven (tijdgebonden)</span></div><div style={s.body}><span style={{ color: '#8E8EA9', fontSize: 13 }}>Laden…</span></div></div>;
  }

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.title}>Bedrijven (tijdgebonden)<span style={s.count}>{links.length}</span></span>
        <button style={s.addBtn} onClick={() => setShowAdd((v) => !v)}>{showAdd ? '✕ Annuleren' : '+ Toevoegen'}</button>
      </div>

      {showAdd && (
        <div style={s.addForm}>
          <label style={s.label}>Bedrijf</label>
          <select style={s.select} value={newBedrijfId} onChange={(e) => setNewBedrijfId(e.target.value)}>
            <option value="">— Selecteer een bedrijf —</option>
            {bedrijven.map((b) => <option key={b.id} value={entityKey(b)}>{b.naam || `Bedrijf #${entityKey(b)}`}</option>)}
          </select>

          <label style={s.checkboxWrap}>
            <input type="checkbox" checked={newTekenbevoegd} onChange={(e) => setNewTekenbevoegd(e.target.checked)} />
            Tekenbevoegd
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Startdatum</label>
              <input style={s.input} type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Einddatum (leeg = open)</label>
              <input style={s.input} type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
            </div>
          </div>

          <button style={newBedrijfId && !saving ? s.saveBtn : s.saveBtnDisabled} onClick={handleAdd} disabled={!newBedrijfId || saving}>
            {saving ? 'Opslaan…' : 'Koppeling opslaan'}
          </button>
        </div>
      )}

      <div style={s.body}>
        {sorted.length === 0 && <span style={{ color: '#8E8EA9', fontSize: 13 }}>Geen bedrijfkoppelingen gevonden.</span>}
        {sorted.map((link) => {
          const bedrijf = bedrijfById(link.target_id);
          const badge = statusBadge(link);
          const tekenbevoegd = Boolean(link.metadata?.tekenbevoegd);
          return (
            <div key={link.id} style={s.row}>
              <div style={s.rowLeft}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={s.name}>{bedrijf ? bedrijf.naam || `Bedrijf #${entityKey(bedrijf)}` : `Bedrijf ID ${link.target_id}`}</span>
                  <span style={{ ...s.badge, color: badge.color, background: badge.bg }}>{badge.label}</span>
                </div>
                <span style={s.dates}>{fmtDate(link.start_date)} -> {fmtDate(link.end_date)}</span>
                <span style={s.meta}>Tekenbevoegd: {tekenbevoegd ? 'Ja' : 'Nee'}</span>
              </div>
              <div style={s.rowActions}>
                {bedrijf?.documentId && <button style={{ ...s.iconBtn, color: '#4945FF' }} title="Ga naar bedrijf" onClick={() => goToBedrijf(bedrijf.documentId)}>↗</button>}
                {badge.label === 'Actief' && <button style={{ ...s.iconBtn, color: '#c06219' }} title="Beëindigen" onClick={() => handleTerminate(link.id)}>■</button>}
                <button style={{ ...s.iconBtn, color: '#B72B1A' }} title="Permanent verwijderen" onClick={() => handleDelete(link.id)}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TemporalBedrijvenByPersoonPanel({ persoonNumericId }) {
  if (!persoonNumericId) return null;
  return <PanelBody key={persoonNumericId} persoonNumericId={persoonNumericId} />;
}
