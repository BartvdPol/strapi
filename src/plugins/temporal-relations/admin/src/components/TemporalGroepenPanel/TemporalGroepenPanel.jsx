import React, { useState, useEffect, useCallback } from 'react';

const LINK_TYPE = 'bedrijven_groepen_range';
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
  panel: {
    background: '#fff',
    border: '1px solid #DCDCE4',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
    fontFamily: 'inherit',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid #DCDCE4',
    background: '#F6F6F9',
  },
  title: {
    fontWeight: 600,
    fontSize: 13,
    color: '#32324D',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    background: '#DCDCE4',
    borderRadius: 10,
    fontSize: 11,
    padding: '1px 7px',
    color: '#666687',
    fontWeight: 500,
  },
  addBtn: {
    background: 'transparent',
    border: '1px solid #4945FF',
    borderRadius: 4,
    color: '#4945FF',
    fontSize: 12,
    padding: '4px 10px',
    cursor: 'pointer',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  body: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minHeight: 32,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 10px',
    borderRadius: 4,
    border: '1px solid #EAEAEF',
    background: '#FAFAFB',
  },
  rowLeft: { display: 'flex', flexDirection: 'column', gap: 2 },
  rowActions: { display: 'flex', gap: 4, flexShrink: 0 },
  groepName: { fontSize: 13, fontWeight: 500, color: '#32324D' },
  badge: { fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '1px 6px' },
  dates: { fontSize: 11, color: '#8E8EA9' },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#666687',
    fontSize: 14,
    padding: '2px 5px',
    borderRadius: 4,
    lineHeight: 1,
  },
  addForm: {
    padding: '12px 16px',
    borderBottom: '1px solid #DCDCE4',
    background: '#FAFAFB',
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#32324D',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #DCDCE4',
    borderRadius: 4,
    fontSize: 13,
    color: '#32324D',
    background: '#fff',
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #DCDCE4',
    borderRadius: 4,
    fontSize: 13,
    color: '#32324D',
    background: '#fff',
    boxSizing: 'border-box',
  },
  saveBtn: {
    marginTop: 10,
    background: '#4945FF',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  saveBtnDisabled: {
    marginTop: 10,
    background: '#C0C0CF',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'not-allowed',
    width: '100%',
  },
};

function PanelBody({ bedrijfNumericId }) {
  const [links, setLinks] = useState([]);
  const [groepen, setGroepen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newGroepId, setNewGroepId] = useState('');
  const [newStart, setNewStart] = useState(todayIso());
  const [newEnd, setNewEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLinks = useCallback(async () => {
    const res = await fetch(
      `${TEMPORAL_BASE}/links/source-history?linkType=${LINK_TYPE}&sourceId=${bedrijfNumericId}`
    );
    const json = await res.json();
    setLinks(json.data || []);
  }, [bedrijfNumericId]);

  const fetchGroepen = useCallback(async () => {
    const res = await fetch(`${TEMPORAL_BASE}/groepen`);
    const json = await res.json();
    setGroepen(json.data || []);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchLinks(), fetchGroepen()]).finally(() => setLoading(false));
  }, [fetchLinks, fetchGroepen]);

  const groepById = useCallback((id) => groepen.find((g) => entityKey(g) === id), [groepen]);

  const handleAdd = async () => {
    if (!newGroepId) return;
    setSaving(true);
    try {
      await fetch(`${TEMPORAL_BASE}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkType: LINK_TYPE,
          sourceId: bedrijfNumericId,
          targetId: Number(newGroepId),
          startDate: newStart,
          endDate: newEnd || OPEN_END,
        }),
      });
      setShowAdd(false);
      setNewGroepId('');
      setNewStart(todayIso());
      setNewEnd('');
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

  const goToGroep = (documentId) => {
    window.location.href = `/admin/content-manager/collection-types/api::groep.groep/${documentId}`;
  };

  // Sort: active → future → expired
  const sortOrder = { Actief: 0, Toekomstig: 1, Verlopen: 2 };
  const sorted = [...links].sort(
    (a, b) => (sortOrder[statusBadge(a).label] ?? 3) - (sortOrder[statusBadge(b).label] ?? 3)
  );

  if (loading) {
    return (
      <div style={s.panel}>
        <div style={s.header}><span style={s.title}>Groepen (tijdgebonden)</span></div>
        <div style={s.body}><span style={{ color: '#8E8EA9', fontSize: 13 }}>Laden…</span></div>
      </div>
    );
  }

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.title}>
          Groepen (tijdgebonden)
          <span style={s.count}>{links.length}</span>
        </span>
        <button style={s.addBtn} onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? '✕ Annuleren' : '+ Toevoegen'}
        </button>
      </div>

      {showAdd && (
        <div style={s.addForm}>
          <label style={s.label}>Groep</label>
          <select
            style={s.select}
            value={newGroepId}
            onChange={(e) => setNewGroepId(e.target.value)}
          >
            <option value="">— Selecteer een groep —</option>
            {groepen.map((g) => (
              <option key={g.id} value={entityKey(g)}>
                {g.naam || `Groep #${entityKey(g)}`}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Startdatum</label>
              <input
                style={s.input}
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Einddatum (leeg = open)</label>
              <input
                style={s.input}
                type="date"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                placeholder="Open einde"
              />
            </div>
          </div>

          <button
            style={newGroepId && !saving ? s.saveBtn : s.saveBtnDisabled}
            onClick={handleAdd}
            disabled={!newGroepId || saving}
          >
            {saving ? 'Opslaan…' : 'Koppeling opslaan'}
          </button>
        </div>
      )}

      <div style={s.body}>
        {sorted.length === 0 && (
          <span style={{ color: '#8E8EA9', fontSize: 13 }}>
            Geen groepkoppelingen gevonden.
          </span>
        )}
        {sorted.map((link) => {
          const groep = groepById(link.target_id);
          const badge = statusBadge(link);
          return (
            <div key={link.id} style={s.row}>
              <div style={s.rowLeft}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={s.groepName}>
                    {groep ? groep.naam || `Groep #${entityKey(groep)}` : `Groep ID ${link.target_id}`}
                  </span>
                  <span style={{ ...s.badge, color: badge.color, background: badge.bg }}>
                    {badge.label}
                  </span>
                </div>
                <span style={s.dates}>
                  {fmtDate(link.start_date)} → {fmtDate(link.end_date)}
                </span>
              </div>
              <div style={s.rowActions}>
                {groep?.documentId && (
                  <button
                    style={{ ...s.iconBtn, color: '#4945FF' }}
                    title="Ga naar groep"
                    onClick={() => goToGroep(groep.documentId)}
                  >
                    ↗
                  </button>
                )}
                {badge.label === 'Actief' && (
                  <button
                    style={{ ...s.iconBtn, color: '#c06219' }}
                    title="Beëindigen (stel einddatum in op vandaag)"
                    onClick={() => handleTerminate(link.id)}
                  >
                    ■
                  </button>
                )}
                <button
                  style={{ ...s.iconBtn, color: '#B72B1A' }}
                  title="Permanent verwijderen"
                  onClick={() => handleDelete(link.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Outer wrapper: only renders inside a bedrijf edit view (not create, not other types)
export default function TemporalGroepenPanel({ bedrijfNumericId }) {
  if (!bedrijfNumericId) return null;
  return <PanelBody key={bedrijfNumericId} bedrijfNumericId={bedrijfNumericId} />;
}
