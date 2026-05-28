import React, { useCallback, useEffect, useMemo, useState } from 'react';

const TEMPORAL_BASE = '/api/temporal-relations';
const BEDRIJF_UID = 'api::bedrijf.bedrijf';
const OPEN_END = '2999-12-31';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d) {
  if (!d || d === '0001-01-01' || d === OPEN_END) return 'Open';
  return d;
}

function statusBadge(link) {
  const now = todayIso();
  const start = link.start_date || '0001-01-01';
  const end = link.end_date || OPEN_END;
  if (now < start) return { label: 'Toekomstig', color: '#7B79FF', bg: '#EEEEFE' };
  if (end !== OPEN_END && now > end) return { label: 'Verlopen', color: '#B72B1A', bg: '#FCECEA' };
  return { label: 'Actief', color: '#328048', bg: '#EAFBE7' };
}

const s = {
  panel: { background: '#fff', border: '1px solid #DCDCE4', borderRadius: 4, overflow: 'hidden' },
  header: { padding: '10px 16px', borderBottom: '1px solid #DCDCE4', background: '#F6F6F9', fontWeight: 600, fontSize: 13, color: '#32324D' },
  body: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 },
  typeBlock: { border: '1px solid #EAEAEF', borderRadius: 4, padding: 10, background: '#FAFAFB' },
  typeTitle: { fontSize: 12, fontWeight: 700, color: '#32324D', marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#666687', textTransform: 'uppercase', letterSpacing: 0.4, margin: '6px 0 4px' },
  row: { border: '1px solid #EAEAEF', borderRadius: 4, background: '#fff', padding: '7px 8px', marginBottom: 4 },
  rowTop: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 12, fontWeight: 600, color: '#32324D' },
  dates: { fontSize: 11, color: '#8E8EA9' },
  badge: { fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '1px 6px' },
  empty: { color: '#8E8EA9', fontSize: 12 },
  addWrap: { display: 'flex', gap: 6, alignItems: 'end', marginTop: 8, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 10, fontWeight: 700, color: '#666687', textTransform: 'uppercase' },
  input: { width: 110, padding: '6px 8px', border: '1px solid #DCDCE4', borderRadius: 4, fontSize: 12, background: '#fff', boxSizing: 'border-box' },
  select: { width: 210, padding: '6px 8px', border: '1px solid #DCDCE4', borderRadius: 4, fontSize: 12, background: '#fff', boxSizing: 'border-box' },
  addBtn: { background: '#4945FF', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
};

function normalizeEntity(item, labelField) {
  return {
    id: item.external_id ?? item.id,
    label: item[labelField] || `${labelField} ${item.external_id ?? item.id}`,
  };
}

function uidLabel(uid) {
  const right = String(uid || '').split('::')[1] || '';
  const parts = right.split('.');
  return (parts[parts.length - 1] || 'item').toLowerCase();
}

function TypeSection({ type, bedrijfId, getEntityLabel, getEntityOptions, onRefreshAll }) {
  const [outgoing, setOutgoing] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [newTargetId, setNewTargetId] = useState('');
  const [newSourceId, setNewSourceId] = useState('');
  const [newStart, setNewStart] = useState(todayIso());
  const [newEnd, setNewEnd] = useState('');
  const [newIncomingStart, setNewIncomingStart] = useState(todayIso());
  const [newIncomingEnd, setNewIncomingEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const companyIsSource = type.source_uid === BEDRIJF_UID;
  const companyIsTarget = type.target_uid === BEDRIJF_UID;

  const outgoingCounterpartUid = type.target_uid;
  const incomingCounterpartUid = type.source_uid;
  const sameTableLink = type.source_uid === type.target_uid;

  const outgoingHeading = sameTableLink ? `Geeft aan (${uidLabel(outgoingCounterpartUid)})` : uidLabel(outgoingCounterpartUid);
  const incomingHeading = sameTableLink ? `Ontvangt van (${uidLabel(incomingCounterpartUid)})` : uidLabel(incomingCounterpartUid);

  const load = useCallback(async () => {
    const requests = [];

    if (companyIsSource) {
      requests.push(fetch(`${TEMPORAL_BASE}/links/source-history?linkType=${type.name}&sourceId=${bedrijfId}`));
    } else {
      requests.push(Promise.resolve({ ok: true, json: async () => ({ data: [] }) }));
    }

    if (companyIsTarget) {
      requests.push(fetch(`${TEMPORAL_BASE}/links/target-history?linkType=${type.name}&targetId=${bedrijfId}`));
    } else {
      requests.push(Promise.resolve({ ok: true, json: async () => ({ data: [] }) }));
    }

    const [outRes, inRes] = await Promise.all(requests);
    const [outJson, inJson] = await Promise.all([outRes.json(), inRes.json()]);

    setOutgoing(outJson.data || []);
    setIncoming(inJson.data || []);
  }, [type.name, bedrijfId, companyIsSource, companyIsTarget]);

  useEffect(() => {
    load();
  }, [load]);

  const addOutgoing = async () => {
    if (!newTargetId || !companyIsSource) return;
    setSaving(true);
    try {
      await fetch(`${TEMPORAL_BASE}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkType: type.name,
          sourceId: Number(bedrijfId),
          targetId: Number(newTargetId),
          startDate: newStart,
          endDate: newEnd || OPEN_END,
        }),
      });
      setNewTargetId('');
      setNewStart(todayIso());
      setNewEnd('');
      await load();
      onRefreshAll();
    } finally {
      setSaving(false);
    }
  };

  const addIncoming = async () => {
    if (!newSourceId || !companyIsTarget) return;
    setSaving(true);
    try {
      await fetch(`${TEMPORAL_BASE}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkType: type.name,
          sourceId: Number(newSourceId),
          targetId: Number(bedrijfId),
          startDate: newIncomingStart,
          endDate: newIncomingEnd || OPEN_END,
        }),
      });
      setNewSourceId('');
      setNewIncomingStart(todayIso());
      setNewIncomingEnd('');
      await load();
      onRefreshAll();
    } finally {
      setSaving(false);
    }
  };

  const outgoingOptions = getEntityOptions(outgoingCounterpartUid);
  const incomingOptions = getEntityOptions(incomingCounterpartUid);

  return (
    <div style={s.typeBlock}>
      <div style={s.typeTitle}>{type.name}</div>

      {companyIsSource && (
        <>
          <div style={s.sectionTitle}>{outgoingHeading}</div>
          {outgoing.length === 0 && <div style={s.empty}>Geen uitgaande links.</div>}
          {outgoing.map((link) => {
            const badge = statusBadge(link);
            return (
              <div key={`out-${link.id}`} style={s.row}>
                <div style={s.rowTop}>
                  <span style={s.name}>{getEntityLabel(outgoingCounterpartUid, link.target_id)}</span>
                  <span style={{ ...s.badge, color: badge.color, background: badge.bg }}>{badge.label}</span>
                </div>
                <div style={s.dates}>{fmtDate(link.start_date)} -> {fmtDate(link.end_date)}</div>
              </div>
            );
          })}

          <div style={s.addWrap}>
            <div>
              <label style={s.label}>Nieuwe {uidLabel(outgoingCounterpartUid)}</label>
              <select style={s.select} value={newTargetId} onChange={(e) => setNewTargetId(e.target.value)}>
                <option value="">Selecteer</option>
                {outgoingOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={s.label}>Start</label>
              <input style={s.input} type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Einde</label>
              <input style={s.input} type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
            </div>
            <button style={s.addBtn} onClick={addOutgoing} disabled={!newTargetId || saving}>{saving ? 'Opslaan...' : '+ Toevoegen'}</button>
          </div>
        </>
      )}

      {companyIsTarget && (
        <>
          <div style={s.sectionTitle}>{incomingHeading}</div>
          {incoming.length === 0 && <div style={s.empty}>Geen inkomende links.</div>}
          {incoming.map((link) => {
            const badge = statusBadge(link);
            return (
              <div key={`in-${link.id}`} style={s.row}>
                <div style={s.rowTop}>
                  <span style={s.name}>{getEntityLabel(incomingCounterpartUid, link.source_id)}</span>
                  <span style={{ ...s.badge, color: badge.color, background: badge.bg }}>{badge.label}</span>
                </div>
                <div style={s.dates}>{fmtDate(link.start_date)} -> {fmtDate(link.end_date)}</div>
              </div>
            );
          })}

          <div style={s.addWrap}>
            <div>
              <label style={s.label}>Nieuwe {uidLabel(incomingCounterpartUid)}</label>
              <select style={s.select} value={newSourceId} onChange={(e) => setNewSourceId(e.target.value)}>
                <option value="">Selecteer</option>
                {incomingOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={s.label}>Start</label>
              <input style={s.input} type="date" value={newIncomingStart} onChange={(e) => setNewIncomingStart(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Einde</label>
              <input style={s.input} type="date" value={newIncomingEnd} onChange={(e) => setNewIncomingEnd(e.target.value)} />
            </div>
            <button style={s.addBtn} onClick={addIncoming} disabled={!newSourceId || saving}>{saving ? 'Opslaan...' : '+ Toevoegen'}</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TemporalBedrijfToBedrijfPanel({ bedrijfNumericId }) {
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState([]);
  const [entityOptions, setEntityOptions] = useState({
    'api::bedrijf.bedrijf': [],
    'api::groep.groep': [],
    'api::persoon.persoon': [],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, bedrijvenRes, groepenRes, personenRes] = await Promise.all([
        fetch(`${TEMPORAL_BASE}/link-types`),
        fetch(`${TEMPORAL_BASE}/bedrijven`),
        fetch(`${TEMPORAL_BASE}/groepen`),
        fetch(`${TEMPORAL_BASE}/personen`),
      ]);

      const [typesJson, bedrijvenJson, groepenJson, personenJson] = await Promise.all([
        typesRes.json(),
        bedrijvenRes.json(),
        groepenRes.json(),
        personenRes.json(),
      ]);

      const allTypes = typesJson.data || [];
      const bedrijfRelatedTypes = allTypes.filter((t) => t.source_uid === BEDRIJF_UID || t.target_uid === BEDRIJF_UID);
      setTypes(bedrijfRelatedTypes);

      setEntityOptions({
        'api::bedrijf.bedrijf': (bedrijvenJson.data || []).map((b) => normalizeEntity(b, 'naam')),
        'api::groep.groep': (groepenJson.data || []).map((g) => normalizeEntity(g, 'naam')),
        'api::persoon.persoon': (personenJson.data || []).map((p) => normalizeEntity(p, 'username')),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getEntityOptions = useCallback((uid) => {
    return entityOptions[uid] || [];
  }, [entityOptions]);

  const getEntityLabel = useCallback((uid, id) => {
    const options = entityOptions[uid] || [];
    const found = options.find((o) => Number(o.id) === Number(id));
    if (found) return found.label;
    return `ID ${id}`;
  }, [entityOptions]);

  if (!bedrijfNumericId) return null;

  if (loading) {
    return (
      <div style={s.panel}>
        <div style={s.header}>Relaties (tijdgebonden)</div>
        <div style={s.body}><span style={s.empty}>Laden...</span></div>
      </div>
    );
  }

  if (!types.length) {
    return (
      <div style={s.panel}>
        <div style={s.header}>Relaties (tijdgebonden)</div>
        <div style={s.body}><span style={s.empty}>Nog geen link types waar Bedrijf voorkomt.</span></div>
      </div>
    );
  }

  return (
    <div style={s.panel}>
      <div style={s.header}>Relaties (tijdgebonden)</div>
      <div style={s.body}>
        {types.map((type) => (
          <TypeSection
            key={type.name}
            type={type}
            bedrijfId={bedrijfNumericId}
            getEntityLabel={getEntityLabel}
            getEntityOptions={getEntityOptions}
            onRefreshAll={load}
          />
        ))}
      </div>
    </div>
  );
}
