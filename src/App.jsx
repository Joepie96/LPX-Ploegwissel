import React, { useEffect, useMemo, useState } from "react";
import {
  Download,
  Printer,
  Save,
  Trash2,
  Upload,
  ClipboardCheck,
  ShieldAlert,
  Settings2,
} from "lucide-react";

/**
 * Ploegwissel Tablet Checklist – Melkpoederproductie
 * - Tablet/desktop friendly
 * - Offline autosave in localStorage
 * - Logo upload (lokaal opgeslagen)
 * - Print/PDF: robust (opent print-tab met eigen HTML)
 */

const LS_KEY = "ploegwissel_checklist_v1";
const LS_LOGO_KEY = "ploegwissel_logo_v1";
const LS_COMPANY_KEY = "ploegwissel_company_v1";

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function clampText(s = "", max = 2000) {
  return String(s).slice(0, max);
}

function BigCheck({ id, label, checked, onChange, hint }) {
  return (
    <label className="bigcheck" htmlFor={id}>
      <input id={id} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="text">
        <div className="title">{label}</div>
        {hint ? <div className="hint">{hint}</div> : null}
      </div>
    </label>
  );
}

function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default function App() {
  const [companyName, setCompanyName] = useState("Zuivelfabriek – Melkpoeders");
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [tab, setTab] = useState("tech");

  const defaultData = useMemo(
    () => ({
      meta: { date: todayISO(), time: nowTime(), shift: "Ochtend", operator: "", leader: "" },
      prod: { product: "", batch: "", status: "In productie", stable: null, notes: "" },
      tech: {
        ok: { "Spray dryer": false, Indamper: false, Zeef: false, Verpakking: false, Silos: false, Utilities: false },
        hasIssue: null,
        issueNotes: "",
      },
      qa: { sampleTaken: false, sampleSent: false, deviation: null, blocked: null, notes: "" },
      hyg: { cip: false, manual: false, cleanArea: false, openTasks: null, openNotes: "" },
      safe: { incident: null, incidentNotes: "", risk: null },
      plan: {
        items: { "Productie loopt door": false, "Batchwissel gepland": false, "Reiniging gepland": false, "Onderhoud gepland": false },
        actions: "",
      },
      sign: { fromName: "", fromSign: "", toName: "", toSign: "", handoverDone: false },
    }),
    []
  );

  const [data, setData] = useState(defaultData);

  useEffect(() => {
    const saved = loadJSON(LS_KEY, null);
    if (saved) setData((p) => ({ ...p, ...saved }));
    const savedLogo = localStorage.getItem(LS_LOGO_KEY);
    if (savedLogo) setLogoDataUrl(savedLogo);
    const savedCompany = localStorage.getItem(LS_COMPANY_KEY);
    if (savedCompany) setCompanyName(savedCompany);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        localStorage.setItem(LS_COMPANY_KEY, companyName);
        setLastSaved(new Date());
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(t);
  }, [data, companyName]);

  const update = (path, value) => {
    setData((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const toggleInMap = (path, key) => {
    setData((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let cur = next;
      for (const k of keys) cur = cur[k];
      cur[key] = !cur[key];
      return next;
    });
  };

  const onUploadLogo = (file) => {
    if (!file) return;
    const okTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!okTypes.includes(file.type)) {
      alert("Upload een PNG/JPG/WEBP/SVG logo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setLogoDataUrl(result);
      try {
        localStorage.setItem(LS_LOGO_KEY, result);
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const resetAll = () => {
    setData({ ...defaultData, meta: { ...defaultData.meta, date: todayISO(), time: nowTime() } });
    setLastSaved(null);
    setTab("tech");
  };

  const hardClear = () => {
    if (!confirm("Alles wissen (ook opgeslagen data)?")) return;
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_LOGO_KEY);
    localStorage.removeItem(LS_COMPANY_KEY);
    setLogoDataUrl(null);
    setCompanyName("Zuivelfabriek – Melkpoeders");
    resetAll();
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify({ companyName, data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ploegwissel_${data.meta.date}_${data.meta.shift}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const completion = useMemo(() => {
    let total = 0;
    let done = 0;
    const inc = (v) => {
      total += 1;
      if (v) done += 1;
    };

    inc(!!data.meta.shift);
    inc(!!data.meta.operator);
    inc(!!data.meta.leader);
    inc(!!data.prod.product);
    inc(!!data.prod.batch);
    inc(!!data.prod.status);
    inc(data.prod.stable !== null);

    Object.values(data.tech.ok).forEach((v) => inc(v));
    inc(data.tech.hasIssue !== null);

    inc(data.qa.deviation !== null);
    inc(data.qa.blocked !== null);

    inc(data.hyg.cip || data.hyg.manual || data.hyg.cleanArea);
    inc(data.hyg.openTasks !== null);

    inc(data.safe.incident !== null);
    inc(data.safe.risk !== null);

    inc(!!data.sign.fromName);
    inc(!!data.sign.toName);
    inc(data.sign.handoverDone);

    const pct = total ? Math.round((done / total) * 100) : 0;
    return { done, total, pct };
  }, [data]);

  const printPDF = () => {
    const yesNo = (v) => (v === null ? "-" : v ? "Ja" : "Nee");
    const joinChecked = (obj) =>
      Object.entries(obj || {})
        .filter(([, v]) => !!v)
        .map(([k]) => k)
        .join(", ") || "-";

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Ploegwissel_${escapeHtml(data.meta.date)}_${escapeHtml(data.meta.shift)}</title>
<style>
  :root { --fg:#111; --muted:#666; --border:#ddd; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: var(--fg); margin: 24px; }
  .row { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
  .brand { display:flex; align-items:center; gap:14px; }
  .logo { height:48px; width:auto; }
  .title { font-size:20px; font-weight:700; }
  .subtitle { color: var(--muted); font-size:13px; margin-top:2px; }
  .meta { font-size:13px; color: var(--fg); }
  .meta div { margin: 2px 0; }
  .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top:18px; }
  .card { border:1px solid var(--border); border-radius:12px; padding:12px; }
  .card h3 { font-size:14px; margin:0 0 10px 0; }
  .kv { font-size:13px; margin:4px 0; }
  .k { color: var(--muted); }
  .pre { white-space: pre-wrap; }
  .span2 { grid-column: span 2; }
  .footer { margin-top:18px; font-size:11px; color: var(--muted); }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
  <div class="row">
    <div class="brand">
      ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="Logo" />` : `<div style="height:48px;width:96px;border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:11px;">LOGO</div>`}
      <div>
        <div class="title">${escapeHtml(companyName || "Ploegwissel Checklist")}</div>
        <div class="subtitle">Melkpoederproductie – Overdracht</div>
      </div>
    </div>
    <div class="meta">
      <div><span class="k">Datum:</span> ${escapeHtml(data.meta.date)}</div>
      <div><span class="k">Tijd:</span> ${escapeHtml(data.meta.time)}</div>
      <div><span class="k">Ploeg:</span> ${escapeHtml(data.meta.shift)}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Basis</h3>
      <div class="kv"><span class="k">Operator:</span> ${escapeHtml(data.meta.operator || "-")}</div>
      <div class="kv"><span class="k">Ploegleider:</span> ${escapeHtml(data.meta.leader || "-")}</div>
      <div class="kv"><span class="k">Product:</span> ${escapeHtml(data.prod.product || "-")}</div>
      <div class="kv"><span class="k">Batch:</span> ${escapeHtml(data.prod.batch || "-")}</div>
      <div class="kv"><span class="k">Processtatus:</span> ${escapeHtml(data.prod.status || "-")}</div>
      <div class="kv"><span class="k">Stabiel:</span> ${yesNo(data.prod.stable)}</div>
      <div class="kv pre"><span class="k">Notities:</span> ${escapeHtml(data.prod.notes || "-")}</div>
    </div>

    <div class="card">
      <h3>Installaties</h3>
      <div class="kv"><span class="k">OK:</span> ${escapeHtml(joinChecked(data.tech.ok))}</div>
      <div class="kv"><span class="k">Storingen:</span> ${yesNo(data.tech.hasIssue)}</div>
      <div class="kv pre"><span class="k">Details:</span> ${escapeHtml(data.tech.issueNotes || "-")}</div>
    </div>

    <div class="card">
      <h3>Kwaliteit</h3>
      <div class="kv"><span class="k">Monster genomen:</span> ${data.qa.sampleTaken ? "Ja" : "Nee"}</div>
      <div class="kv"><span class="k">Verzonden QC:</span> ${data.qa.sampleSent ? "Ja" : "Nee"}</div>
      <div class="kv"><span class="k">Afwijking:</span> ${yesNo(data.qa.deviation)}</div>
      <div class="kv"><span class="k">Blokkade:</span> ${yesNo(data.qa.blocked)}</div>
      <div class="kv pre"><span class="k">Notities:</span> ${escapeHtml(data.qa.notes || "-")}</div>
    </div>

    <div class="card">
      <h3>Hygiëne & Veiligheid</h3>
      <div class="kv"><span class="k">CIP:</span> ${data.hyg.cip ? "Ja" : "Nee"}</div>
      <div class="kv"><span class="k">Handreiniging:</span> ${data.hyg.manual ? "Ja" : "Nee"}</div>
      <div class="kv"><span class="k">Werkplek schoon:</span> ${data.hyg.cleanArea ? "Ja" : "Nee"}</div>
      <div class="kv"><span class="k">Openstaande reiniging:</span> ${yesNo(data.hyg.openTasks)}</div>
      <div class="kv pre"><span class="k">Reiniging details:</span> ${escapeHtml(data.hyg.openNotes || "-")}</div>
      <hr style="border:none;border-top:1px solid var(--border);margin:10px 0;" />
      <div class="kv"><span class="k">Incident:</span> ${yesNo(data.safe.incident)}</div>
      <div class="kv pre"><span class="k">Incident details:</span> ${escapeHtml(data.safe.incidentNotes || "-")}</div>
      <div class="kv"><span class="k">Risico aanwezig:</span> ${yesNo(data.safe.risk)}</div>
    </div>

    <div class="card span2">
      <h3>Planning & Acties</h3>
      <div class="kv"><span class="k">Planning:</span> ${escapeHtml(joinChecked(data.plan.items))}</div>
      <div class="kv pre"><span class="k">Acties volgende ploeg:</span> ${escapeHtml(data.plan.actions || "-")}</div>
    </div>

    <div class="card">
      <h3>Overdragend</h3>
      <div class="kv"><span class="k">Naam:</span> ${escapeHtml(data.sign.fromName || "-")}</div>
      <div class="kv"><span class="k">Handtekening:</span> ${escapeHtml(data.sign.fromSign || "-")}</div>
    </div>

    <div class="card">
      <h3>Ontvangend</h3>
      <div class="kv"><span class="k">Naam:</span> ${escapeHtml(data.sign.toName || "-")}</div>
      <div class="kv"><span class="k">Handtekening:</span> ${escapeHtml(data.sign.toSign || "-")}</div>
      <div class="kv"><span class="k">Besproken:</span> ${data.sign.handoverDone ? "Ja" : "Nee"}</div>
    </div>
  </div>

  <div class="footer">Gegenereerd via Ploegwissel Webapp • Print/PDF archivering</div>
</body>
</html>`;

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      alert("Pop-up geblokkeerd. Sta pop-ups toe voor deze site en probeer opnieuw.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      w.focus();
      w.print();
    };
  };

  return (
    <div>
      <div className="topbar no-print">
        <div className="topbar-inner">
          <div className="brand">
            <div className="iconbox" aria-hidden="true">
              <ClipboardCheck size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="brand-title">Ploegwissel Checklist</div>
              <div className="brand-sub">Tablet • Melkpoederproductie</div>
            </div>
          </div>

          <div className="actions">
            <span className="badge">{completion.pct}% compleet</span>
            <button className="btn small" onClick={downloadJSON} type="button">
              <Download size={16} /> JSON
            </button>
            <button className="btn small" onClick={printPDF} type="button">
              <Printer size={16} /> Print/PDF
            </button>
            <button className="btn small danger" onClick={hardClear} type="button">
              <Trash2 size={16} /> Wis
            </button>
          </div>
        </div>
      </div>

      {/* Printable fallback area (kept for completeness) */}
      <div className="print-area">
        <div style={{ padding: 24 }}>
          <strong>Print wordt geopend in een nieuw tabblad.</strong>
        </div>
      </div>

      <div className="container no-print">
        <div className="card">
          <div className="card-content" style={{ paddingTop: 16 }}>
            <div className="row2">
              <div>
                <div className="label">Bedrijfsnaam</div>
                <input className="input" value={companyName} onChange={(e) => setCompanyName(clampText(e.target.value, 80))} />
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "end", justifyContent: "space-between", flexWrap: "wrap" }}>
                <label className="filepill" title="Upload logo">
                  <Upload size={16} />
                  <span>Logo upload</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => onUploadLogo(e.target.files?.[0])} />
                </label>
                <button className="btn" onClick={resetAll} type="button">
                  <Trash2 size={16} /> Nieuwe checklist
                </button>
              </div>
            </div>

            <div className="pills">
              <span className="pill">Datum: {data.meta.date}</span>
              <span className="pill">Tijd: {data.meta.time}</span>
              <span className="pill">Ploeg: {data.meta.shift}</span>
              <span className="pill">{lastSaved ? `Autosave: ${lastSaved.toLocaleTimeString()}` : "Autosave actief"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-3" style={{ marginTop: 14 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Settings2 size={18}/> Basisgegevens</div>
            </div>
            <div className="card-content">
              <div className="row2">
                <div>
                  <div className="label">Datum</div>
                  <input className="input" type="date" value={data.meta.date} onChange={(e) => update("meta.date", e.target.value)} />
                </div>
                <div>
                  <div className="label">Tijd</div>
                  <input className="input" type="time" value={data.meta.time} onChange={(e) => update("meta.time", e.target.value)} />
                </div>
              </div>

              <div className="row3" style={{ marginTop: 12 }}>
                <div>
                  <div className="label">Ploeg</div>
                  <select className="select" value={data.meta.shift} onChange={(e) => update("meta.shift", e.target.value)}>
                    <option>Ochtend</option>
                    <option>Middag</option>
                    <option>Nacht</option>
                  </select>
                </div>
                <div>
                  <div className="label">Operator</div>
                  <input className="input" value={data.meta.operator} onChange={(e) => update("meta.operator", clampText(e.target.value, 60))} />
                </div>
                <div>
                  <div className="label">Ploegleider</div>
                  <input className="input" value={data.meta.leader} onChange={(e) => update("meta.leader", clampText(e.target.value, 60))} />
                </div>
              </div>

              <div className="hr" />

              <div className="row3">
                <div>
                  <div className="label">Product</div>
                  <input className="input" value={data.prod.product} onChange={(e) => update("prod.product", clampText(e.target.value, 80))} placeholder="Bijv. mager melkpoeder" />
                </div>
                <div>
                  <div className="label">Batch/lot</div>
                  <input className="input" value={data.prod.batch} onChange={(e) => update("prod.batch", clampText(e.target.value, 40))} placeholder="Bijv. MP-240207-01" />
                </div>
                <div>
                  <div className="label">Processtatus</div>
                  <select className="select" value={data.prod.status} onChange={(e) => update("prod.status", e.target.value)}>
                    <option>Opstart</option>
                    <option>In productie</option>
                    <option>Reiniging (CIP)</option>
                    <option>Stilstand</option>
                    <option>Onderhoud</option>
                  </select>
                </div>
              </div>

              <div className="hr" />

              <div className="notice">
                <div className="kpi">
                  <div>
                    <div className="notice-title">Installatie draait stabiel</div>
                    <div className="notice-desc">Kies Ja/Nee. Bij Nee: toelichten in notities.</div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className={`btn ${data.prod.stable === true ? "primary" : ""}`} type="button" onClick={() => update("prod.stable", true)}>Ja</button>
                    <button className={`btn ${data.prod.stable === false ? "primary" : ""}`} type="button" onClick={() => update("prod.stable", false)}>Nee</button>
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div className="label">Notities productie</div>
                  <textarea className="textarea" value={data.prod.notes} onChange={(e) => update("prod.notes", clampText(e.target.value))} />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title"><ShieldAlert size={18}/> Status</div>
            </div>
            <div className="card-content">
              <div className="notice">
                <div className="notice-title">Voortgang</div>
                <div className="notice-desc">{completion.done} / {completion.total} items bevestigd • {completion.pct}%</div>
              </div>

              <div className="hr" />

              <button className="btn primary" style={{ width: "100%" }} onClick={printPDF} type="button">
                <Printer size={16} /> Print / Opslaan als PDF
              </button>
              <div style={{ height: 10 }} />
              <button className="btn" style={{ width: "100%" }} onClick={downloadJSON} type="button">
                <Download size={16} /> Download JSON
              </button>
              <div style={{ height: 10 }} />
              <button className="btn danger" style={{ width: "100%" }} onClick={hardClear} type="button">
                <Trash2 size={16} /> Alles wissen
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14 }} className="card">
          <div className="card-content" style={{ paddingTop: 16 }}>
            <div className="tabs">
              <button className={`tab ${tab === "tech" ? "active" : ""}`} onClick={() => setTab("tech")}>Installaties</button>
              <button className={`tab ${tab === "qa" ? "active" : ""}`} onClick={() => setTab("qa")}>Kwaliteit</button>
              <button className={`tab ${tab === "hyg" ? "active" : ""}`} onClick={() => setTab("hyg")}>Hygiëne</button>
              <button className={`tab ${tab === "safe" ? "active" : ""}`} onClick={() => setTab("safe")}>Veiligheid</button>
              <button className={`tab ${tab === "sign" ? "active" : ""}`} onClick={() => setTab("sign")}>Overdracht</button>
            </div>

            {tab === "tech" ? (
              <div style={{ marginTop: 14 }}>
                <div className="row2">
                  {Object.keys(data.tech.ok).map((k) => (
                    <BigCheck
                      key={k}
                      id={`tech-${k}`}
                      label={`${k} OK`}
                      checked={data.tech.ok[k]}
                      onChange={() => toggleInMap("tech.ok", k)}
                      hint="Vink af als gecontroleerd en OK."
                    />
                  ))}
                </div>

                <div className="hr" />

                <div className="notice">
                  <div className="kpi">
                    <div>
                      <div className="notice-title">Storingen aanwezig?</div>
                      <div className="notice-desc">Kies Nee/Ja en beschrijf bij Ja.</div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className={`btn ${data.tech.hasIssue === false ? "primary" : ""}`} type="button" onClick={() => update("tech.hasIssue", false)}>Nee</button>
                      <button className={`btn ${data.tech.hasIssue === true ? "primary" : ""}`} type="button" onClick={() => update("tech.hasIssue", true)}>Ja</button>
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div className="label">Storingsdetails / aandachtspunten</div>
                    <textarea className="textarea" value={data.tech.issueNotes} onChange={(e) => update("tech.issueNotes", clampText(e.target.value))} />
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "qa" ? (
              <div style={{ marginTop: 14 }}>
                <div className="row2">
                  <BigCheck
                    id="qa-sampleTaken"
                    label="Monster genomen"
                    checked={data.qa.sampleTaken}
                    onChange={(v) => update("qa.sampleTaken", v)}
                    hint="Conform bemonsteringsplan."
                  />
                  <BigCheck
                    id="qa-sampleSent"
                    label="Monster verzonden naar QC"
                    checked={data.qa.sampleSent}
                    onChange={(v) => update("qa.sampleSent", v)}
                    hint="Label + registratie afgerond."
                  />
                </div>

                <div className="hr" />

                <div className="row2">
                  <div className="notice">
                    <div className="kpi">
                      <div>
                        <div className="notice-title">Afwijking gemeld?</div>
                        <div className="notice-desc">Kies Nee/Ja</div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button className={`btn ${data.qa.deviation === false ? "primary" : ""}`} type="button" onClick={() => update("qa.deviation", false)}>Nee</button>
                        <button className={`btn ${data.qa.deviation === true ? "primary" : ""}`} type="button" onClick={() => update("qa.deviation", true)}>Ja</button>
                      </div>
                    </div>
                  </div>

                  <div className="notice">
                    <div className="kpi">
                      <div>
                        <div className="notice-title">Product geblokkeerd?</div>
                        <div className="notice-desc">Kies Nee/Ja</div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button className={`btn ${data.qa.blocked === false ? "primary" : ""}`} type="button" onClick={() => update("qa.blocked", false)}>Nee</button>
                        <button className={`btn ${data.qa.blocked === true ? "primary" : ""}`} type="button" onClick={() => update("qa.blocked", true)}>Ja</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div className="label">QC notities</div>
                  <textarea className="textarea" value={data.qa.notes} onChange={(e) => update("qa.notes", clampText(e.target.value))} />
                </div>
              </div>
            ) : null}

            {tab === "hyg" ? (
              <div style={{ marginTop: 14 }}>
                <div className="row3">
                  <BigCheck id="hyg-cip" label="CIP uitgevoerd" checked={data.hyg.cip} onChange={(v) => update("hyg.cip", v)} />
                  <BigCheck id="hyg-manual" label="Handreiniging OK" checked={data.hyg.manual} onChange={(v) => update("hyg.manual", v)} />
                  <BigCheck id="hyg-cleanArea" label="Werkplek schoon" checked={data.hyg.cleanArea} onChange={(v) => update("hyg.cleanArea", v)} />
                </div>

                <div className="hr" />

                <div className="notice">
                  <div className="kpi">
                    <div>
                      <div className="notice-title">Openstaande reiniging?</div>
                      <div className="notice-desc">Kies Nee/Ja en beschrijf bij Ja.</div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className={`btn ${data.hyg.openTasks === false ? "primary" : ""}`} type="button" onClick={() => update("hyg.openTasks", false)}>Nee</button>
                      <button className={`btn ${data.hyg.openTasks === true ? "primary" : ""}`} type="button" onClick={() => update("hyg.openTasks", true)}>Ja</button>
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div className="label">Details openstaande reiniging</div>
                    <textarea className="textarea" value={data.hyg.openNotes} onChange={(e) => update("hyg.openNotes", clampText(e.target.value))} />
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "safe" ? (
              <div style={{ marginTop: 14 }}>
                <div className="notice">
                  <div className="kpi">
                    <div>
                      <div className="notice-title">Incidenten tijdens ploeg?</div>
                      <div className="notice-desc">Kies Nee/Ja en beschrijf bij Ja.</div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className={`btn ${data.safe.incident === false ? "primary" : ""}`} type="button" onClick={() => update("safe.incident", false)}>Nee</button>
                      <button className={`btn ${data.safe.incident === true ? "primary" : ""}`} type="button" onClick={() => update("safe.incident", true)}>Ja</button>
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div className="label">Incident details</div>
                    <textarea className="textarea" value={data.safe.incidentNotes} onChange={(e) => update("safe.incidentNotes", clampText(e.target.value))} />
                  </div>
                </div>

                <div style={{ height: 12 }} />

                <div className="notice">
                  <div className="kpi">
                    <div>
                      <div className="notice-title">Veiligheidsrisico aanwezig?</div>
                      <div className="notice-desc">Kies Nee/Ja</div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className={`btn ${data.safe.risk === false ? "primary" : ""}`} type="button" onClick={() => update("safe.risk", false)}>Nee</button>
                      <button className={`btn ${data.safe.risk === true ? "primary" : ""}`} type="button" onClick={() => update("safe.risk", true)}>Ja</button>
                    </div>
                  </div>
                </div>

                <div className="hr" />

                <div className="notice">
                  <div className="notice-title">Planning & acties</div>
                  <div className="notice-desc">Vink planning aan en noteer acties voor de volgende ploeg.</div>

                  <div style={{ marginTop: 10 }} className="row2">
                    {Object.keys(data.plan.items).map((k) => (
                      <BigCheck key={k} id={`plan-${k}`} label={k} checked={data.plan.items[k]} onChange={() => toggleInMap("plan.items", k)} />
                    ))}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div className="label">Acties volgende ploeg</div>
                    <textarea className="textarea" value={data.plan.actions} onChange={(e) => update("plan.actions", clampText(e.target.value))} />
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "sign" ? (
              <div style={{ marginTop: 14 }}>
                <div className="row2">
                  <div className="notice">
                    <div className="notice-title">Overdragende ploeg</div>
                    <div style={{ marginTop: 10 }}>
                      <div className="label">Naam</div>
                      <input className="input" value={data.sign.fromName} onChange={(e) => update("sign.fromName", clampText(e.target.value, 60))} />
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <div className="label">Handtekening (typ)</div>
                      <input className="input" value={data.sign.fromSign} onChange={(e) => update("sign.fromSign", clampText(e.target.value, 120))} />
                    </div>
                  </div>

                  <div className="notice">
                    <div className="notice-title">Ontvangende ploeg</div>
                    <div style={{ marginTop: 10 }}>
                      <div className="label">Naam</div>
                      <input className="input" value={data.sign.toName} onChange={(e) => update("sign.toName", clampText(e.target.value, 60))} />
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <div className="label">Handtekening (typ)</div>
                      <input className="input" value={data.sign.toSign} onChange={(e) => update("sign.toSign", clampText(e.target.value, 120))} />
                    </div>
                  </div>
                </div>

                <div className="hr" />

                <div className="notice">
                  <div className="kpi">
                    <div>
                      <div className="notice-title">Overdracht volledig besproken</div>
                      <div className="notice-desc">Vink aan als alle punten zijn doorgenomen.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.sign.handoverDone}
                      onChange={(e) => update("sign.handoverDone", e.target.checked)}
                      style={{ width: 22, height: 22 }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn primary" onClick={printPDF} type="button">
                    <Printer size={16} /> Print / PDF archiveren
                  </button>
                  <button className="btn" onClick={downloadJSON} type="button">
                    <Save size={16} /> Export (JSON)
                  </button>
                  <button className="btn danger" onClick={resetAll} type="button">
                    <Trash2 size={16} /> Nieuwe checklist
                  </button>
                </div>

                <div style={{ marginTop: 10, color: "var(--sub)", fontSize: 13 }}>
                  Tip: als print niets doet, sta pop-ups toe voor dit domein (Chrome blokkeert soms het print-tabblad).
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 14, color: "var(--sub)", fontSize: 12 }}>
          • Later uitbreiden: login, opslag in Supabase, batchhistorie, QR op lijn, afwijking-workflow.
        </div>
      </div>
    </div>
  );
}
