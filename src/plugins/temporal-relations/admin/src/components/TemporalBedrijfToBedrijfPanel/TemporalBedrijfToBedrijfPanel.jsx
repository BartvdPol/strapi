import React, { useCallback, useEffect, useMemo, useState } from 'react';

const TEMPORAL_BASE = '/api/temporal-relations';
const BEDRIJF_UID = 'api::bedrijf.bedrijf';
const OPEN_END = '2999-12-31';
const ORDER_KEY = 'temporal-relations-bedrijf-panel-order-v1';
const BEREKEND_OP_OPTIONS = ['Brutowinst', 'Nettowinst', 'Restant winst'];
const WINSTGERECHTIGDE_TYPE_OPTIONS = ['Aandeelhouder', 'Beherend vennoot', 'Commanditair vennoot'];

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

function uidLabel(uid) {
  const right = String(uid || '').split('::')[1] || '';
  const parts = right.split('.');
  return (parts[parts.length - 1] || 'item').toLowerCase();
}

function normalizeEntity(item, labelField) {
  return {
    id: item.external_id ?? item.id,
    label: item[labelField] || `${labelField} ${item.external_id ?? item.id}`,
    documentId: item.documentId || null,
    uid: null,
  };
}

function isProfitType(type) {
  return /winst|profit/i.test(type?.name || '');
}

function isTekenbevoegdType(type) {
  return /koppeling_persoon_bedrijf/i.test(type?.name || '');
}

function metadataToForm(type, metadata) {
  const m = metadata && typeof metadata === 'object' ? metadata : {};
  return {
    winstgerechtigdenId: m.winstgerechtigdenId ?? '',
    berekendOp: m.berekendOp ?? 'Nettowinst',
    percentageEersteSchaal: m.percentageEersteSchaal ?? '',
    bedragEersteSchaal: m.bedragEersteSchaal ?? '',
    restantPercentage: m.restantPercentage ?? '',
    winstgerechtigdeType: m.winstgerechtigdeType ?? '',
    tekenbevoegd: Boolean(m.tekenbevoegd),
  };
}

function metadataFromForm(type, state) {
  if (isProfitType(type)) {
    return {
      winstgerechtigdenId: state.winstgerechtigdenId === '' ? null : Number(state.winstgerechtigdenId),
      berekendOp: state.berekendOp || 'Nettowinst',
      percentageEersteSchaal: state.percentageEersteSchaal === '' ? null : Number(state.percentageEersteSchaal),
      bedragEersteSchaal: state.bedragEersteSchaal === '' ? null : Number(state.bedragEersteSchaal),
      restantPercentage: state.restantPercentage === '' ? null : Number(state.restantPercentage),
      winstgerechtigdeType: state.winstgerechtigdeType || null,
    };
  }

  if (isTekenbevoegdType(type)) {
    return { tekenbevoegd: Boolean(state.tekenbevoegd) };
  }

  return null;
}

function metadataSummary(type, metadata) {
  if (!metadata || typeof metadata !== 'object') return null;

  if (isProfitType(type)) {
    const parts = [];
    if (metadata.berekendOp) parts.push(String(metadata.berekendOp));
    if (metadata.winstgerechtigdeType) parts.push(String(metadata.winstgerechtigdeType));
    if (metadata.percentageEersteSchaal !== null && metadata.percentageEersteSchaal !== undefined) {
      parts.push(`${metadata.percentageEersteSchaal}%`);
    }
    return parts.join(' | ') || null;
  }

  if (isTekenbevoegdType(type)) {
    return `Tekenbevoegd: ${metadata.tekenbevoegd ? 'Ja' : 'Nee'}`;
  }

  return null;
}

const s = {
  panel: { background: '#fff', border: '1px solid #DCDCE4', borderRadius: 4, overflow: 'hidden' },
  header: { padding: '10px 16px', borderBottom: '1px solid #DCDCE4', background: '#F6F6F9', fontWeight: 600, fontSize: 13, color: '#32324D' },
  body: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 },
  typeBlock: { border: '1px solid #EAEAEF', borderRadius: 4, padding: 10, background: '#FAFAFB' },
  typeHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeTitle: { fontSize: 12, fontWeight: 700, color: '#32324D' },
  moveButtons: { display: 'flex', gap: 4 },
  moveBtn: { border: '1px solid #DCDCE4', background: '#fff', borderRadius: 4, fontSize: 11, padding: '2px 6px', cursor: 'pointer' },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#666687', textTransform: 'uppercase', letterSpacing: 0.4, margin: '6px 0 4px' },
  row: { border: '1px solid #EAEAEF', borderRadius: 4, background: '#fff', padding: '7px 8px', marginBottom: 4 },
  rowTop: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 12, fontWeight: 600, color: '#32324D' },
  badge: { fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '1px 6px' },
  dates: { fontSize: 11, color: '#8E8EA9' },
  meta: { fontSize: 11, color: '#666687' },
  actions: { display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  actionBtn: { border: '1px solid #DCDCE4', background: '#fff', borderRadius: 4, fontSize: 11, padding: '3px 7px', cursor: 'pointer' },
  empty: { color: '#8E8EA9', fontSize: 12 },
  addWrap: { marginTop: 6 },
  toggleBtn: { border: '1px dashed #B9B9D1', background: '#fff', color: '#4945FF', borderRadius: 4, fontSize: 11, fontWeight: 700, padding: '4px 8px', cursor: 'pointer' },
  formRow: { display: 'flex', gap: 6, alignItems: 'end', marginTop: 6, flexWrap: 'wrap' },
  label: { display: 'block', fontSize: 10, fontWeight: 700, color: '#666687', textTransform: 'uppercase' },
  input: { width: 120, padding: '6px 8px', border: '1px solid #DCDCE4', borderRadius: 4, fontSize: 12, background: '#fff', boxSizing: 'border-box' },
  select: { width: 210, padding: '6px 8px', border: '1px solid #DCDCE4', borderRadius: 4, fontSize: 12, background: '#fff', boxSizing: 'border-box' },
  saveBtn: { background: '#4945FF', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  secondaryBtn: { border: '1px solid #DCDCE4', background: '#fff', borderRadius: 4, padding: '6px 10px', fontSize: 12, cursor: 'pointer' },
};

function MetadataFields({ type, state, setState }) {
  const onField = (key, value) => setState((prev) => ({ ...prev, [key]: value }));

  if (isProfitType(type)) {
    return (
      <>
        <div>
          <label style={s.label}>Berekend op</label>
          <select style={s.input} value={state.berekendOp} onChange={(e) => onField('berekendOp', e.target.value)}>
            {BEREKEND_OP_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={s.label}>Winstgerechtigde type</label>
          <select style={{ ...s.input, width: 170 }} value={state.winstgerechtigdeType} onChange={(e) => onField('winstgerechtigdeType', e.target.value)}>
            <option value="">Selecteer</option>
            {WINSTGERECHTIGDE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={s.label}>% eerste schaal</label>
          <input style={s.input} type="number" step="0.0001" value={state.percentageEersteSchaal} onChange={(e) => onField('percentageEersteSchaal', e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Bedrag eerste schaal</label>
          <input style={s.input} type="number" step="0.01" value={state.bedragEersteSchaal} onChange={(e) => onField('bedragEersteSchaal', e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Restant %</label>
          <input style={s.input} type="number" step="0.0001" value={state.restantPercentage} onChange={(e) => onField('restantPercentage', e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Winstgerechtigden ID</label>
          <input style={s.input} type="number" value={state.winstgerechtigdenId} onChange={(e) => onField('winstgerechtigdenId', e.target.value)} />
        </div>
      </>
    );
  }

  if (isTekenbevoegdType(type)) {
    return (
      <div>
        <label style={s.label}>Tekenbevoegd</label>
        <select style={s.input} value={state.tekenbevoegd ? 'true' : 'false'} onChange={(e) => onField('tekenbevoegd', e.target.value === 'true')}>
          <option value="false">Nee</option>
          <option value="true">Ja</option>
        </select>
      </div>
    );
  }

  return null;
}

function TypeSection({
  type,
  bedrijfId,
  getEntityRecord,
  getEntityOptions,
  onRefreshAll,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) {
  const [outgoing, setOutgoing] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [saving, setSaving] = useState(false);

  const [addOutgoingOpen, setAddOutgoingOpen] = useState(false);
  const [newTargetId, setNewTargetId] = useState('');
  const [newStart, setNewStart] = useState(todayIso());
  const [newEnd, setNewEnd] = useState('');
  const [newOutgoingMeta, setNewOutgoingMeta] = useState(() => metadataToForm(type, null));

  const [addIncomingOpen, setAddIncomingOpen] = useState(false);
  const [newSourceId, setNewSourceId] = useState('');
  const [newIncomingStart, setNewIncomingStart] = useState(todayIso());
  const [newIncomingEnd, setNewIncomingEnd] = useState('');
  const [newIncomingMeta, setNewIncomingMeta] = useState(() => metadataToForm(type, null));

  const [editingId, setEditingId] = useState(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editMeta, setEditMeta] = useState(() => metadataToForm(type, null));

  const companyIsSource = type.source_uid === BEDRIJF_UID;
  const companyIsTarget = type.target_uid === BEDRIJF_UID;
  const sameTableLink = type.source_uid === type.target_uid;

  const outgoingCounterpartUid = type.target_uid;
  const incomingCounterpartUid = type.source_uid;

  const outgoingHeading = sameTableLink ? 'Geeft aan' : uidLabel(outgoingCounterpartUid);
  const incomingHeading = sameTableLink ? 'Ontvangt van' : uidLabel(incomingCounterpartUid);

  const load = useCallback(async () => {
    const requests = [];

    if (companyIsSource) {
      requests.push(fetch(`${TEMPORAL_BASE}/links/source-history?linkType=${type.name}&sourceId=${bedrijfId}`));
    } else {
      requests.push(Promise.resolve({ json: async () => ({ data: [] }) }));
    }

    if (companyIsTarget) {
      requests.push(fetch(`${TEMPORAL_BASE}/links/target-history?linkType=${type.name}&targetId=${bedrijfId}`));
    } else {
      requests.push(Promise.resolve({ json: async () => ({ data: [] }) }));
    }

    const [outRes, inRes] = await Promise.all(requests);
    const [outJson, inJson] = await Promise.all([outRes.json(), inRes.json()]);

    setOutgoing(outJson.data || []);
    setIncoming(inJson.data || []);
  }, [companyIsSource, companyIsTarget, type.name, bedrijfId]);

  useEffect(() => {
    load();
  }, [load]);

  const resetOutgoingForm = () => {
    setNewTargetId('');
    setNewStart(todayIso());
    setNewEnd('');
    setNewOutgoingMeta(metadataToForm(type, null));
    setAddOutgoingOpen(false);
  };

  const resetIncomingForm = () => {
    setNewSourceId('');
    setNewIncomingStart(todayIso());
    setNewIncomingEnd('');
    setNewIncomingMeta(metadataToForm(type, null));
    setAddIncomingOpen(false);
  };

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
          metadata: metadataFromForm(type, newOutgoingMeta),
        }),
      });
      resetOutgoingForm();
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
          metadata: metadataFromForm(type, newIncomingMeta),
        }),
      });
      resetIncomingForm();
      await load();
      onRefreshAll();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (link) => {
    setEditingId(link.id);
    setEditStart(link.start_date === '0001-01-01' ? '' : (link.start_date || ''));
    setEditEnd(link.end_date === OPEN_END ? '' : (link.end_date || ''));
    setEditMeta(metadataToForm(type, link.metadata));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditStart('');
    setEditEnd('');
    setEditMeta(metadataToForm(type, null));
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      await fetch(`${TEMPORAL_BASE}/links/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: editStart || null,
          endDate: editEnd || null,
          metadata: metadataFromForm(type, editMeta),
        }),
      });
      cancelEdit();
      await load();
      onRefreshAll();
    } finally {
      setSaving(false);
    }
  };

  const deleteLink = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Weet je zeker dat je deze koppeling wilt verwijderen?')) return;
    setSaving(true);
    try {
      await fetch(`${TEMPORAL_BASE}/links/${id}`, { method: 'DELETE' });
      await load();
      onRefreshAll();
    } finally {
      setSaving(false);
    }
  };

  const openLinkedItem = (uid, id) => {
    const rec = getEntityRecord(uid, id);
    if (!rec?.documentId) return;
    window.location.href = `/admin/content-manager/collection-types/${uid}/${rec.documentId}`;
  };

  const renderRow = (link, counterpartUid, counterpartId, keyPrefix) => {
    const b = statusBadge(link);
    const rec = getEntityRecord(counterpartUid, counterpartId);
    const meta = metadataSummary(type, link.metadata);
    const isEditing = editingId === link.id;

    return (
      <div key={`${keyPrefix}-${link.id}`} style={s.row}>
        <div style={s.rowTop}>
          <span style={s.name}>{rec?.label || `ID ${counterpartId}`}</span>
          <span style={{ ...s.badge, color: b.color, background: b.bg }}>{b.label}</span>
        </div>

        {!isEditing && (
          <>
            <div style={s.dates}>{fmtDate(link.start_date)} {'->'} {fmtDate(link.end_date)}</div>
            {meta && <div style={s.meta}>{meta}</div>}
            <div style={s.actions}>
              <button style={s.actionBtn} onClick={() => startEdit(link)} disabled={saving}>Bewerk</button>
              <button style={s.actionBtn} onClick={() => deleteLink(link.id)} disabled={saving}>Verwijder</button>
              {rec?.documentId && (
                <button style={s.actionBtn} onClick={() => openLinkedItem(counterpartUid, counterpartId)}>
                  Open item
                </button>
              )}
            </div>
          </>
        )}

        {isEditing && (
          <div style={s.formRow}>
            <div>
              <label style={s.label}>Start</label>
              <input style={s.input} type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Einde</label>
              <input style={s.input} type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
            </div>
            <MetadataFields type={type} state={editMeta} setState={setEditMeta} />
            <button style={s.saveBtn} onClick={() => saveEdit(link.id)} disabled={saving}>Opslaan</button>
            <button style={s.secondaryBtn} onClick={cancelEdit} disabled={saving}>Annuleer</button>
          </div>
        )}
      </div>
    );
  };

  const outgoingOptions = getEntityOptions(outgoingCounterpartUid);
  const incomingOptions = getEntityOptions(incomingCounterpartUid);

  return (
    <div style={s.typeBlock}>
      <div style={s.typeHeader}>
        <div style={s.typeTitle}>{type.name}</div>
        <div style={s.moveButtons}>
          <button style={s.moveBtn} onClick={onMoveUp} disabled={!canMoveUp}>↑</button>
          <button style={s.moveBtn} onClick={onMoveDown} disabled={!canMoveDown}>↓</button>
        </div>
      </div>

      {companyIsSource && (
        <>
          <div style={s.sectionTitle}>{outgoingHeading}</div>
          {outgoing.length === 0 && <div style={s.empty}>Geen uitgaande links.</div>}
          {outgoing.map((link) => renderRow(link, outgoingCounterpartUid, link.target_id, 'out'))}

          <div style={s.addWrap}>
            {!addOutgoingOpen && (
              <button style={s.toggleBtn} onClick={() => setAddOutgoingOpen(true)}>+ Toevoegen</button>
            )}
            {addOutgoingOpen && (
              <div style={s.formRow}>
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
                <MetadataFields type={type} state={newOutgoingMeta} setState={setNewOutgoingMeta} />
                <button style={s.saveBtn} onClick={addOutgoing} disabled={!newTargetId || saving}>Opslaan</button>
                <button style={s.secondaryBtn} onClick={resetOutgoingForm}>Annuleer</button>
              </div>
            )}
          </div>
        </>
      )}

      {companyIsTarget && (
        <>
          <div style={s.sectionTitle}>{incomingHeading}</div>
          {incoming.length === 0 && <div style={s.empty}>Geen inkomende links.</div>}
          {incoming.map((link) => renderRow(link, incomingCounterpartUid, link.source_id, 'in'))}

          <div style={s.addWrap}>
            {!addIncomingOpen && (
              <button style={s.toggleBtn} onClick={() => setAddIncomingOpen(true)}>+ Toevoegen</button>
            )}
            {addIncomingOpen && (
              <div style={s.formRow}>
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
                <MetadataFields type={type} state={newIncomingMeta} setState={setNewIncomingMeta} />
                <button style={s.saveBtn} onClick={addIncoming} disabled={!newSourceId || saving}>Opslaan</button>
                <button style={s.secondaryBtn} onClick={resetIncomingForm}>Annuleer</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function loadTypeOrder() {
  try {
    const raw = window.localStorage.getItem(ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTypeOrder(order) {
  try {
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    // ignore storage errors
  }
}

function sortTypesBySavedOrder(types) {
  const order = loadTypeOrder();
  if (!order.length) return [...types].sort((a, b) => a.name.localeCompare(b.name));
  const rank = new Map(order.map((name, idx) => [name, idx]));
  return [...types].sort((a, b) => {
    const ra = rank.has(a.name) ? rank.get(a.name) : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(b.name) ? rank.get(b.name) : Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
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
      setTypes(sortTypesBySavedOrder(bedrijfRelatedTypes));

      setEntityOptions({
        'api::bedrijf.bedrijf': (bedrijvenJson.data || []).map((b) => ({ ...normalizeEntity(b, 'naam'), uid: 'api::bedrijf.bedrijf' })),
        'api::groep.groep': (groepenJson.data || []).map((g) => ({ ...normalizeEntity(g, 'naam'), uid: 'api::groep.groep' })),
        'api::persoon.persoon': (personenJson.data || []).map((p) => ({ ...normalizeEntity(p, 'username'), uid: 'api::persoon.persoon' })),
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

  const getEntityRecord = useCallback((uid, id) => {
    const options = entityOptions[uid] || [];
    return options.find((o) => Number(o.id) === Number(id)) || null;
  }, [entityOptions]);

  const moveType = (index, direction) => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= types.length) return;
    const next = [...types];
    const [picked] = next.splice(index, 1);
    next.splice(target, 0, picked);
    setTypes(next);
    saveTypeOrder(next.map((t) => t.name));
  };

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
        {types.map((type, idx) => (
          <TypeSection
            key={type.name}
            type={type}
            bedrijfId={bedrijfNumericId}
            getEntityRecord={getEntityRecord}
            getEntityOptions={getEntityOptions}
            onRefreshAll={load}
            onMoveUp={() => moveType(idx, 'up')}
            onMoveDown={() => moveType(idx, 'down')}
            canMoveUp={idx > 0}
            canMoveDown={idx < types.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
