import React, { useState, useEffect, useCallback } from "react";

const API_BASE = "/api/temporal-relations";
const OPEN_START = "0001-01-01";
const OPEN_END = "2999-12-31";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}
const apiGet  = (path) => apiFetch(path);
const apiPost = (path, body) => apiFetch(path, { method: "POST", body: JSON.stringify(body) });
const apiDel  = (path) => apiFetch(path, { method: "DELETE" });

function today() { return new Date().toISOString().slice(0, 10); }

const s = {
  page:        { fontFamily: "sans-serif", padding: 24, maxWidth: 1100, margin: "0 auto" },
  tabs:        { display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #e0e0e0" },
  tab:         { padding: "8px 20px", cursor: "pointer", border: "none", background: "none", fontSize: 14 },
  tabActive:   { borderBottom: "2px solid #4945ff", color: "#4945ff", fontWeight: 700 },
  card:        { background: "#fff", borderRadius: 8, border: "1px solid #e0e0e0", padding: 20, marginBottom: 16 },
  row:         { display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 },
  label:       { display: "block", fontSize: 12, color: "#666", marginBottom: 4 },
  input:       { border: "1px solid #ccc", borderRadius: 4, padding: "6px 10px", fontSize: 14, minWidth: 160 },
  select:      { border: "1px solid #ccc", borderRadius: 4, padding: "6px 10px", fontSize: 14 },
  btn:         { padding: "7px 16px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 14 },
  btnPrimary:  { background: "#4945ff", color: "#fff" },
  btnDanger:   { background: "#d02b20", color: "#fff" },
  btnGhost:    { background: "#f0f0ff", color: "#4945ff", border: "1px solid #4945ff" },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:          { textAlign: "left", padding: "8px 10px", background: "#f6f6f9", borderBottom: "1px solid #e0e0e0" },
  td:          { padding: "7px 10px", borderBottom: "1px solid #f0f0f0", verticalAlign: "top" },
  badgeOpen:   { display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: "#d3f0cc", color: "#1a7a10" },
  badgeClosed: { display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: "#ffe0de", color: "#8a1d10" },
  badgeFuture: { display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: "#ffefd6", color: "#8a5a10" },
  error:       { color: "#d02b20", background: "#fff4f3", border: "1px solid #d02b20", borderRadius: 4, padding: "8px 12px", marginBottom: 12 },
  success:     { color: "#1a7a10", background: "#d3f0cc", border: "1px solid #1a7a10", borderRadius: 4, padding: "8px 12px", marginBottom: 12 },
};

function Field({ label, children }) {
  return <div><label style={s.label}>{label}</label>{children}</div>;
}

function Btn({ variant = "primary", onClick, children, disabled }) {
  const vs = variant === "danger" ? s.btnDanger : variant === "ghost" ? s.btnGhost : s.btnPrimary;
  return <button style={{ ...s.btn, ...vs, opacity: disabled ? 0.5 : 1 }} onClick={onClick} disabled={disabled}>{children}</button>;
}

function StatusBadge({ startDate, endDate }) {
  const now = today();
  if (endDate < now) return <span style={s.badgeClosed}>expired</span>;
  if (startDate > now) return <span style={s.badgeFuture}>future</span>;
  return <span style={s.badgeOpen}>active</span>;
}

function displayDate(value, boundary) {
  if (boundary === "start" && value === OPEN_START) return "-∞";
  if (boundary === "end" && value === OPEN_END) return "∞";
  return value || "-";
}

function LinkTypesTab() {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ name: "", sourceUid: "", targetUid: "", sourceLabel: "", targetLabel: "", description: "" });
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const res = await apiGet("/link-types");
    setTypes(res.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  function setField(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function handleCreate() {
    try {
      await apiPost("/link-types", form);
      setMsg({ type: "success", text: `Created "${form.name}"` });
      setForm({ name: "", sourceUid: "", targetUid: "", sourceLabel: "", targetLabel: "", description: "" });
      load();
    } catch (error) {
      setMsg({ type: "error", text: error.message });
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete relation type "${name}"?`)) return;
    try {
      await apiDel(`/link-types/${id}`);
      setMsg({ type: "success", text: `Deleted "${name}"` });
      load();
    } catch (error) {
      setMsg({ type: "error", text: error.message });
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Relation Types</h2>
      <p style={{ color: "#666", fontSize: 13 }}>
        Define which two content types are related with a time-bounded link.<br />
        Example: <code>bedrijven_groepen_range</code> links <em>bedrijven</em> ↔ <em>bedrijven_groepen</em>.
      </p>
      <div style={s.card}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>New relation type</h3>
        {msg && <div style={msg.type === "error" ? s.error : s.success}>{msg.text}</div>}
        <div style={s.row}>
          <Field label="Machine name *"><input style={s.input} placeholder="bedrijven_groepen_range" value={form.name} onChange={(e) => setField("name", e.target.value)} /></Field>
          <Field label="Source UID *"><input style={s.input} placeholder="api::bedrijf.bedrijf" value={form.sourceUid} onChange={(e) => setField("sourceUid", e.target.value)} /></Field>
          <Field label="Target UID *"><input style={s.input} placeholder="api::groep.groep" value={form.targetUid} onChange={(e) => setField("targetUid", e.target.value)} /></Field>
          <Field label="Source label"><input style={s.input} placeholder="Bedrijf" value={form.sourceLabel} onChange={(e) => setField("sourceLabel", e.target.value)} /></Field>
          <Field label="Target label"><input style={s.input} placeholder="Groep" value={form.targetLabel} onChange={(e) => setField("targetLabel", e.target.value)} /></Field>
        </div>
        <div style={s.row}>
          <Field label="Description"><input style={{ ...s.input, minWidth: 400 }} value={form.description} onChange={(e) => setField("description", e.target.value)} /></Field>
          <Btn onClick={handleCreate} disabled={!form.name || !form.sourceUid || !form.targetUid}>Create</Btn>
        </div>
      </div>
      <div style={s.card}>
        {types.length === 0 ? <p style={{ color: "#999" }}>No relation types defined yet.</p> : (
          <table style={s.table}>
            <thead><tr>
              <th style={s.th}>Name</th><th style={s.th}>Source UID</th><th style={s.th}>Target UID</th>
              <th style={s.th}>Labels (source ↔ target)</th><th style={s.th}>Description</th><th style={s.th}></th>
            </tr></thead>
            <tbody>{types.map((type) => (
              <tr key={type.id}>
                <td style={s.td}><strong>{type.name}</strong></td>
                <td style={s.td}><code style={{ fontSize: 11 }}>{type.source_uid}</code></td>
                <td style={s.td}><code style={{ fontSize: 11 }}>{type.target_uid}</code></td>
                <td style={s.td}>{type.source_label} ↔ {type.target_label}</td>
                <td style={s.td}>{type.description}</td>
                <td style={s.td}><Btn variant="danger" onClick={() => handleDelete(type.id, type.name)}>Delete</Btn></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function LinksTab() {
  const [linkTypes, setLinkTypes] = useState([]);
  const [links, setLinks] = useState([]);
  const [pagination, setPagination] = useState({});
  const [query, setQuery] = useState({ linkType: "", direction: "all", entityId: "", date: today() });
  const [createForm, setCreateForm] = useState({ linkType: "", sourceId: "", targetId: "", startDate: "", endDate: "", metadata: "" });
  const [importText, setImportText] = useState("");
  const [importLinkType, setImportLinkType] = useState("");
  const [msg, setMsg] = useState(null);
  const [subTab, setSubTab] = useState("query");

  const loadTypes = useCallback(async () => {
    const res = await apiGet("/link-types");
    setLinkTypes(res.data || []);
  }, []);

  useEffect(() => { loadTypes(); }, [loadTypes]);

  async function runQuery() {
    setMsg(null);
    try {
      const { linkType, direction, entityId, date } = query;
      if (!linkType) {
        setMsg({ type: "error", text: "Choose a relation type first." });
        return;
      }

      let res;
      if (direction === "all") {
        res = await apiGet(`/links?linkType=${linkType}`);
        setLinks(res.results || []);
        setPagination(res.pagination || {});
      } else if (direction === "source") {
        res = await apiGet(`/links/from-source?linkType=${linkType}&sourceId=${entityId}&date=${date}`);
        setLinks(res.data || []);
        setPagination({});
      } else if (direction === "target") {
        res = await apiGet(`/links/from-target?linkType=${linkType}&targetId=${entityId}&date=${date}`);
        setLinks(res.data || []);
        setPagination({});
      } else if (direction === "source-history") {
        res = await apiGet(`/links/source-history?linkType=${linkType}&sourceId=${entityId}`);
        setLinks(res.data || []);
        setPagination({});
      } else if (direction === "target-history") {
        res = await apiGet(`/links/target-history?linkType=${linkType}&targetId=${entityId}`);
        setLinks(res.data || []);
        setPagination({});
      }
    } catch (error) {
      setMsg({ type: "error", text: error.message });
    }
  }

  async function handleCreate() {
    try {
      const metadata = createForm.metadata.trim() ? JSON.parse(createForm.metadata) : null;
      await apiPost("/links", { ...createForm, metadata });
      setMsg({ type: "success", text: "Link created." });
    } catch (error) {
      setMsg({ type: "error", text: error.message });
    }
  }

  async function handleImport() {
    try {
      const lines = importText.trim().split("\n").filter(Boolean);
      const items = lines.map((line) => {
        const [sourceId, targetId, startDate, endDate, metadataText] = line.split("\t").map((value) => value.trim());
        return {
          sourceId: Number(sourceId),
          targetId: Number(targetId),
          startDate,
          endDate,
          metadata: metadataText ? JSON.parse(metadataText) : undefined,
        };
      });
      const res = await apiPost("/links/import", { linkType: importLinkType, links: items });
      setMsg({ type: "success", text: `Imported: ${res.created} created, ${res.updated} updated, ${(res.errors || []).length} errors.` });
    } catch (error) {
      setMsg({ type: "error", text: error.message });
    }
  }

  async function handleTerminate(id) {
    const endDate = window.prompt("Set end_date (YYYY-MM-DD):", today());
    if (!endDate) return;
    try {
      await apiPost(`/links/${id}/terminate`, { endDate });
      setMsg({ type: "success", text: `Link ${id} terminated on ${endDate}.` });
      runQuery();
    } catch (error) {
      setMsg({ type: "error", text: error.message });
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Permanently delete this link?")) return;
    try {
      await apiDel(`/links/${id}`);
      setMsg({ type: "success", text: `Deleted link ${id}.` });
      runQuery();
    } catch (error) {
      setMsg({ type: "error", text: error.message });
    }
  }

  const needsEntity = ["source", "target", "source-history", "target-history"].includes(query.direction);
  const needsDate = ["source", "target"].includes(query.direction);
  const selectedType = linkTypes.find((type) => type.name === query.linkType);
  const sourceLabel = selectedType?.source_label || "Source";
  const targetLabel = selectedType?.target_label || "Target";

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Links</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["query", "Query"], ["create", "+ Create link"], ["import", "⬆ Bulk import"]].map(([key, label]) => (
          <button key={key} style={{ ...s.btn, ...(subTab === key ? s.btnPrimary : s.btnGhost) }} onClick={() => setSubTab(key)}>{label}</button>
        ))}
      </div>
      {msg && <div style={msg.type === "error" ? s.error : s.success}>{msg.text}</div>}

      {subTab === "query" && (
        <div style={s.card}>
          <div style={s.row}>
            <Field label="Relation type *">
              <select style={s.select} value={query.linkType} onChange={(e) => setQuery((current) => ({ ...current, linkType: e.target.value }))}>
                <option value="">— choose —</option>
                {linkTypes.map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}
              </select>
            </Field>
            <Field label="Direction">
              <select style={s.select} value={query.direction} onChange={(e) => setQuery((current) => ({ ...current, direction: e.target.value, entityId: "" }))}>
                <option value="all">All links (paginated)</option>
                <option value="source">Source → Target  (active on date)</option>
                <option value="target">Target → Sources  (active on date)  ↔ bidirectional</option>
                <option value="source-history">Source full history</option>
                <option value="target-history">Target full history</option>
              </select>
            </Field>
            {needsEntity && (
              <Field label={query.direction.startsWith("source") ? `${sourceLabel} ID` : `${targetLabel} ID`}>
                <input style={s.input} type="number" placeholder="e.g. 214" value={query.entityId} onChange={(e) => setQuery((current) => ({ ...current, entityId: e.target.value }))} />
              </Field>
            )}
            {needsDate && (
              <Field label="On date">
                <input style={s.input} type="date" value={query.date} onChange={(e) => setQuery((current) => ({ ...current, date: e.target.value }))} />
              </Field>
            )}
            <Btn onClick={runQuery}>Search</Btn>
          </div>
          {links.length === 0 ? <p style={{ color: "#999" }}>No results yet. Choose a relation type and press Search.</p> : (
            <>
              <table style={s.table}>
                <thead><tr>
                  <th style={s.th}>ID</th>
                  <th style={s.th}>{sourceLabel} ID</th>
                  <th style={s.th}>{targetLabel} ID</th>
                  <th style={s.th}>Start date</th>
                  <th style={s.th}>End date</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Actions</th>
                </tr></thead>
                <tbody>{links.map((link) => (
                  <tr key={link.id}>
                    <td style={s.td}>{link.id}</td>
                    <td style={s.td}>{link.source_id}</td>
                    <td style={s.td}>{link.target_id}</td>
                    <td style={s.td}>{displayDate(link.start_date, "start")}</td>
                    <td style={s.td}>{displayDate(link.end_date, "end")}</td>
                    <td style={s.td}><StatusBadge startDate={link.start_date} endDate={link.end_date} /></td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn variant="ghost" onClick={() => handleTerminate(link.id)}>Terminate</Btn>
                        <Btn variant="danger" onClick={() => handleDelete(link.id)}>Delete</Btn>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
              {pagination.total && <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>{pagination.total} total</div>}
            </>
          )}
        </div>
      )}

      {subTab === "create" && (
        <div style={s.card}>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Create a link</h3>
          <div style={s.row}>
            <Field label="Relation type *">
              <select style={s.select} value={createForm.linkType} onChange={(e) => setCreateForm((current) => ({ ...current, linkType: e.target.value }))}>
                <option value="">— choose —</option>
                {linkTypes.map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}
              </select>
            </Field>
            <Field label={linkTypes.find((type) => type.name === createForm.linkType)?.source_label || "Source ID"}>
              <input style={s.input} type="number" placeholder="e.g. 214" value={createForm.sourceId} onChange={(e) => setCreateForm((current) => ({ ...current, sourceId: e.target.value }))} />
            </Field>
            <Field label={linkTypes.find((type) => type.name === createForm.linkType)?.target_label || "Target ID"}>
              <input style={s.input} type="number" placeholder="e.g. 78" value={createForm.targetId} onChange={(e) => setCreateForm((current) => ({ ...current, targetId: e.target.value }))} />
            </Field>
            <Field label="Start date (-∞ when empty)">
              <input style={s.input} type="date" value={createForm.startDate} onChange={(e) => setCreateForm((current) => ({ ...current, startDate: e.target.value }))} />
            </Field>
            <Field label="End date (∞ when empty)">
              <input style={s.input} type="date" value={createForm.endDate} onChange={(e) => setCreateForm((current) => ({ ...current, endDate: e.target.value }))} />
            </Field>
            <Field label="Metadata JSON (optional)">
              <input style={{ ...s.input, minWidth: 260 }} placeholder='{"tekenbevoegd": false}' value={createForm.metadata} onChange={(e) => setCreateForm((current) => ({ ...current, metadata: e.target.value }))} />
            </Field>
            <Btn onClick={handleCreate} disabled={!createForm.linkType || !createForm.sourceId || !createForm.targetId}>Create</Btn>
          </div>
        </div>
      )}

      {subTab === "import" && (
        <div style={s.card}>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Bulk import</h3>
          <p style={{ fontSize: 13, color: "#666" }}>
            Paste tab-separated rows: <code>sourceId ⇥ targetId ⇥ startDate ⇥ endDate ⇥ metadataJson</code><br />
            Matches the SQL INSERT pattern. Existing rows (same sourceId + targetId + startDate) are updated.
          </p>
          <div style={s.row}>
            <Field label="Relation type *">
              <select style={s.select} value={importLinkType} onChange={(e) => setImportLinkType(e.target.value)}>
                <option value="">— choose —</option>
                {linkTypes.map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}
              </select>
            </Field>
          </div>
          <textarea
            style={{ width: "100%", height: 160, fontFamily: "monospace", fontSize: 13, border: "1px solid #ccc", borderRadius: 4, padding: 10, boxSizing: "border-box" }}
            placeholder={'214\t78\t2025-04-01\t2999-12-31\t{"tekenbevoegd":false}\n208\t1\t\t\t{"tekenbevoegd":false}'}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <div style={{ marginTop: 12 }}>
            <Btn onClick={handleImport} disabled={!importLinkType || !importText.trim()}>Import</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("types");

  return (
    <div style={s.page}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Temporal Relations</h1>
      <p style={{ color: "#666", marginBottom: 20, fontSize: 14 }}>
        Bidirectional, time-bounded relationships between content types with optional per-link metadata.
      </p>
      <div style={s.tabs}>
        {[["types", "Relation Types"], ["links", "Links"]].map(([key, label]) => (
          <button key={key} style={{ ...s.tab, ...(activeTab === key ? s.tabActive : {}) }} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </div>
      {activeTab === "types" ? <LinkTypesTab /> : <LinksTab />}
    </div>
  );
}