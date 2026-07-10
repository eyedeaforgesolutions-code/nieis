import { useState, useEffect, useCallback, useRef } from "react";

// ── AI CLIENT ─────────────────────────────────────────────────────────────────
async function callAI(prompt, maxTokens = 800) {
  const res = await fetch("/.netlify/functions/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTokens }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Proxy ${res.status}: ${text}`);
  const data = JSON.parse(text);
  if (data.error) throw new Error(`Anthropic: ${JSON.stringify(data.error)}`);
  const raw = data.content?.map(b => b.text || "").join("") || "";
  return raw.replace(/```json[\s\S]*?```|```/g, "").trim();
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const G = {
  black: "#070809", ink: "#0C0E12", surface: "#111418", raised: "#161B22",
  border: "rgba(255,255,255,0.07)", borderG: "rgba(212,168,67,0.15)",
  gold: "#D4A843", gold2: "#F0C060", red: "#C0392B", redL: "#E74C3C",
  green: "#1E7D4E", greenL: "#27AE60", blue: "#1A5276", blueL: "#2980B9",
  text: "#D8D3CC", muted: "#5A6070", dim: "#3A404E",
};

const PROVINCES = [
  { name: "National Capital District", pop: 420000, nid: 87000, pct: 21, risk: "HIGH", region: "Southern" },
  { name: "Morobe", pop: 870000, nid: 124000, pct: 14, risk: "HIGH", region: "Momase" },
  { name: "Eastern Highlands", pop: 700000, nid: 84000, pct: 12, risk: "HIGH", region: "Highlands" },
  { name: "Western Highlands", pop: 620000, nid: 68000, pct: 11, risk: "CRITICAL", region: "Highlands" },
  { name: "Southern Highlands", pop: 580000, nid: 46000, pct: 8, risk: "CRITICAL", region: "Highlands" },
  { name: "Hela", pop: 330000, nid: 26000, pct: 8, risk: "CRITICAL", region: "Highlands" },
  { name: "Enga", pop: 480000, nid: 38000, pct: 8, risk: "CRITICAL", region: "Highlands" },
  { name: "Chimbu (Simbu)", pop: 360000, nid: 40000, pct: 11, risk: "HIGH", region: "Highlands" },
  { name: "Jiwaka", pop: 350000, nid: 28000, pct: 8, risk: "CRITICAL", region: "Highlands" },
  { name: "Madang", pop: 540000, nid: 70000, pct: 13, risk: "HIGH", region: "Momase" },
  { name: "East Sepik", pop: 490000, nid: 59000, pct: 12, risk: "HIGH", region: "Momase" },
  { name: "West Sepik (Sandaun)", pop: 220000, nid: 22000, pct: 10, risk: "HIGH", region: "Momase" },
  { name: "Central", pop: 144000, nid: 18000, pct: 13, risk: "HIGH", region: "Southern" },
  { name: "Gulf", pop: 130000, nid: 13000, pct: 10, risk: "HIGH", region: "Southern" },
  { name: "Western", pop: 220000, nid: 22000, pct: 10, risk: "HIGH", region: "Southern" },
  { name: "Milne Bay", pop: 250000, nid: 38000, pct: 15, risk: "HIGH", region: "Southern" },
  { name: "Northern (Oro)", pop: 160000, nid: 22000, pct: 14, risk: "HIGH", region: "Southern" },
  { name: "East New Britain", pop: 340000, nid: 68000, pct: 20, risk: "MEDIUM", region: "Islands" },
  { name: "West New Britain", pop: 230000, nid: 41000, pct: 18, risk: "MEDIUM", region: "Islands" },
  { name: "New Ireland", pop: 190000, nid: 42000, pct: 22, risk: "MEDIUM", region: "Islands" },
  { name: "Manus", pop: 60000, nid: 14000, pct: 23, risk: "MEDIUM", region: "Islands" },
  { name: "Bougainville (AROB)", pop: 320000, nid: 64000, pct: 20, risk: "MEDIUM", region: "Islands" },
];

const RISK_COLOR = { CRITICAL: G.redL, HIGH: "#C0A040", MEDIUM: G.greenL };
const RISK_BG = { CRITICAL: "rgba(231,76,60,0.1)", HIGH: "rgba(192,160,64,0.1)", MEDIUM: "rgba(39,174,96,0.1)" };

const SECURITY_LAYERS = [
  { num: "L1", title: "ISO/IEC 30107-3 Level 3 Liveness", desc: "Gold standard anti-spoofing. 0% attack acceptance rate against hyper-realistic silicone masks. Re-certified every 18 months by TÜV-accredited lab.", badge: "MANDATORY", color: G.redL },
  { num: "L2", title: "HSM Camera Attestation", desc: "Hardware security module cryptographically signs every image. Proves image came from physical camera — not virtual injection. Invalid signature = instant rejection.", badge: "MANDATORY", color: G.redL },
  { num: "L3", title: "Multi-Modal Biometric Fusion", desc: "Face + fingerprint required. Defeating both simultaneously is near-impossible. Either modality serves as primary with the other as fallback.", badge: "MANDATORY", color: G.redL },
  { num: "L4", title: "NID Cryptographic Chip", desc: "PKI-secured chip generates one-time challenge response verified against PNGCIR HSM. Cloned or printed NID cards fail instantly.", badge: "MANDATORY", color: G.redL },
  { num: "L5", title: "On-Device Processing", desc: "Face matching happens on device only. Raw image never transmitted. Only signed MATCH/NO-MATCH result leaves device. Eliminates interception attack surface.", badge: "MANDATORY", color: G.redL },
  { num: "L6", title: "Real-Time Anomaly Detection", desc: "AI monitors all transactions. Alerts on: verification <4 seconds, 0% failure rate, population density mismatches. Triggers Electoral Commission notification.", badge: "MANDATORY", color: G.redL },
  { num: "L7", title: "Immutable Audit Blockchain", desc: "Every event written simultaneously to PNGCIR, Electoral Commission, DPC, and civil society observer. No single party can alter records.", badge: "STANDARD", color: G.gold },
  { num: "L8", title: "Offline Cryptographic Pre-Loading", desc: "Encrypted voter records pre-loaded for remote areas. Each record locked to voter's NID chip. Offline results validated against ledger on reconnection.", badge: "STANDARD", color: G.gold },
  { num: "L9", title: "Physical Security Protocol", desc: "Two-official minimum per verification. Parallel paper log. Random audit visits. Community reporters from Wantok Nation at major stations.", badge: "ADVISORY", color: G.greenL },
];

const ATTACKS = [
  { attack: "Photo Print", icon: "🖼️", method: "Printed photo held to camera", defense: "3D depth sensing — flat photo has zero depth, rejected at sensor level before AI analysis" },
  { attack: "Screen Replay", icon: "📱", method: "Video played on screen in front of camera", defense: "Micro-texture analysis + rPPG blood flow detection — screens show no skin texture or blood flow" },
  { attack: "Silicone Mask", icon: "🎭", method: "Custom 3D-printed mask (~$2,000+)", defense: "Active challenge-response — random blink/look/speak commands a static mask cannot comply with in real time" },
  { attack: "Deepfake Injection", icon: "🤖", method: "AI video injected via virtual camera software", defense: "HSM camera attestation — device proves image came from physical camera, virtual injection breaks cryptographic signature" },
  { attack: "Synthetic Identity", icon: "🧬", method: "Entirely AI-generated face for phantom enrollment", defense: "GAN artifact detection + enrollment deduplication — AI-generated faces leave frequency-domain signatures" },
  { attack: "Document Forgery", icon: "📋", method: "Fake NID with attacker's real face", defense: "NID chip cryptographic challenge — forged card has no genuine PKI chip, fails one-time code validation" },
  { attack: "Social Engineering", icon: "👥", method: "Corrupt official bypasses verification", defense: "Dual-official requirement + immutable audit log + anomaly detection + Wantok Nation community observers" },
];

const PHASES = [
  { period: "2024–2025", label: "Foundation", status: "done", title: "Legal & Registry Infrastructure", items: ["CIR Act 2024 passed — legal spine in place", "SevisPass digital ID piloted — 10,000 users", "DGDP 2024 data governance policy adopted", "120 biometric mobile registration kits deployed (Santos)", "2024 Census completed (6 questions — insufficient but a start)", "3.8M NID enrollments — 1.3M cards issued"] },
  { period: "2026", label: "Phase 1 — Now", status: "active", title: "Coverage & Clean Roll", items: ["Emergency NID rollout — mobile teams to all 22 provinces", "Electoral roll cleanse using NID death registry", "Deduplication engine across all 3.8M existing records", "Data Protection Commissioner office established", "GE27 biometric pilot in NCD and Morobe", "Wantok Nation census intelligence layer activated"] },
  { period: "2027–2028", label: "Phase 2", status: "future", title: "First Biometric Election + Audit", items: ["GE27: biometric verification in all urban electorates", "Paper backup in all rural/remote areas — no disenfranchisement", "Real-time anomaly alerts via Wantok Nation integration", "Post-election forensic audit of all biometric transactions", "Pacific Islands Forum electoral observer review", "Constitutional amendment process for biometric permanence"] },
  { period: "2029–2031", label: "Phase 3", status: "future", title: "Full Facial Recognition Integration", items: ["Facial recognition at all polling stations with connectivity", "Offline-capable devices for remote PNG (satellite sync)", "Iris scan as tertiary verification for disputed cases", "Health clinic fingerprint patient ID integration", "95% NID coverage target — failure triggers system review", "Tok Pisin voice interface for citizen consent"] },
  { period: "2032+", label: "Phase 4", status: "future", title: "Fully Sovereign Digital Democracy", items: ["GE32: 100% biometric verification", "Citizen data portal — every PNG citizen sees their own record", "Predictive electoral integrity alerts via Wantok Nation", "Pacific region data sovereignty leadership", "SMS/voice voting pilot for remote communities", "Full economic census integration — per-capita allocation exact"] },
];

const ACCESS_GATES = [
  { useCase: "Electoral Verification", gate1: "Electoral Act + NID Act 2024", gate2: "Identity only — no vote tracking", gate3: "Electoral Commissioner + DPC", citizen: "Request access log; dispute within 30 days", risk: "LOW" },
  { useCase: "Health Service", gate1: "Health Act + CIR Act + patient consent", gate2: "Fingerprint only — no face scan", gate3: "Health Dept auditor + DPC", citizen: "Revoke consent; alternative ID accepted", risk: "LOW" },
  { useCase: "Banking / Financial", gate1: "BPNG regulation + NID Act + consent", gate2: "Face match for account opening only", gate3: "BPNG supervision + DPC", citizen: "Consent revocable; transaction logs accessible", risk: "MEDIUM" },
  { useCase: "Law Enforcement", gate1: "Court warrant required", gate2: "Individual ID only — not mass surveillance", gate3: "Court oversight — high barrier by design", citizen: "Notified within 30 days unless court-sealed", risk: "HIGH" },
  { useCase: "Wantok Nation Platform", gate1: "User consent only — no legal mandate", gate2: "Province/district metadata only — NO biometrics", gate3: "DPC registration + annual audit", citizen: "Delete account = immediate full data removal", risk: "LOW" },
  { useCase: "Foreign Government", gate1: "Parliamentary resolution required", gate2: "Individual consent required regardless", gate3: "DPC + Parliament + judicial review", citizen: "Cannot be waived without individual consent", risk: "BLOCKED" },
];

// ── GLOBAL CSS ────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&family=Space+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:#070809;color:#D8D3CC;font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.65;overflow-x:hidden;-webkit-font-smoothing:antialiased;}
body::after{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px);pointer-events:none;z-index:9999;opacity:0.3;}
::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(212,168,67,.2);}
button,input,textarea{font-family:'DM Sans',sans-serif;outline:none;}
@keyframes sweep{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(212,168,67,.4)}70%{box-shadow:0 0 0 8px rgba(212,168,67,0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes loadBar{from{width:0}to{width:100%}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes dataLoad{from{width:0}to{width:var(--w,0%)}}
.scan-sweep{position:fixed;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#D4A843,transparent);animation:sweep 8s linear infinite;opacity:0.25;z-index:998;}
`;

// ── PRIMITIVES ────────────────────────────────────────────────────────────────
function Spinner() {
  return <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,.07)", borderTopColor: G.gold, borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block", flexShrink: 0 }} />;
}

function Tag({ children, color = G.gold }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 2, fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color, background: `${color}14`, border: `1px solid ${color}40` }}>{children}</span>;
}

function SLabel({ children }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'Space Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: G.gold, marginBottom: 12 }}><div style={{ width: 20, height: 1, background: G.gold, opacity: .6 }} />{children}</div>;
}

function StatCard({ value, label, sub, color = G.gold }) {
  return (
    <div style={{ background: G.surface, border: `1px solid ${G.border}`, padding: 16 }}>
      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: G.text, fontWeight: 500, marginTop: 5 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: G.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function RiskPill({ risk }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", fontFamily: "'Space Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: RISK_COLOR[risk], background: RISK_BG[risk], border: `1px solid ${RISK_COLOR[risk]}40` }}>{risk}</span>;
}

// ── SECTIONS ──────────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "100px 28px 60px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${G.border} 1px,transparent 1px),linear-gradient(90deg,${G.border} 1px,transparent 1px)`, backgroundSize: "48px 48px", maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 0%,transparent 100%)" }} />
      <div style={{ maxWidth: 900, position: "relative", zIndex: 2, animation: "slideUp .5s ease" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, border: `1px solid ${G.gold}`, padding: "5px 14px", marginBottom: 32, fontFamily: "'Space Mono',monospace", fontSize: 10, color: G.gold, letterSpacing: ".15em", textTransform: "uppercase" }}>
          PNG National Intelligence Framework — 2026 Edition
        </div>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(32px,5.5vw,68px)", fontWeight: 900, lineHeight: 1, letterSpacing: "-.03em", marginBottom: 8 }}>
          The Nation Knows<br /><span style={{ color: G.gold }}>Who You Are.</span>
        </h1>
        <p style={{ fontSize: 16, color: G.muted, maxWidth: 620, margin: "24px 0 40px", lineHeight: 1.8, fontWeight: 300 }}>
          Papua New Guinea has <strong style={{ color: G.text }}>10.2 million people</strong> and does not accurately know where any of them live, whether they are alive, or whether their vote was theirs. This is the forensic blueprint to fix that — permanently — with dignity, sovereignty, and constitutional protection.
        </p>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "rgba(192,57,43,.08)", border: "1px solid rgba(192,57,43,.3)", borderLeft: `3px solid ${G.red}`, padding: "14px 18px", maxWidth: 680, marginBottom: 40, fontSize: 13, lineHeight: 1.6, color: "#C07070" }}>
          <div><strong style={{ color: G.redL }}>RUTHLESS TRUTH:</strong> PNG's 2022 election saw ballot boxes burned, phantom voter rolls, 50+ deaths, and incumbents re-elected at rates statisticians cannot explain. The 2024 Census had only 6 questions — below UN standards. The 2027 biometric voting target has zero disbursed funding as of 2026. This is the ground reality from which we build.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 1, background: G.border, maxWidth: 680 }}>
          {[["6", "Census Questions", "UN minimum is 20+"],["1.3M", "NID Cards Issued", "13% of 10.2M population"],["50+", "2022 Election Deaths", "Ballot boxes burned"],["K0", "Biometric Funding", "Zero disbursed for GE27"]].map(([v,l,s])=>(
            <div key={l} style={{ background: G.surface, padding: "14px 16px" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: v === "1.3M" ? G.gold : G.redL }}>{v}</div>
              <div style={{ fontSize: 11, color: G.text, fontWeight: 500, marginTop: 4 }}>{l}</div>
              <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProvinceSection() {
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("pct");
  const sorted = [...PROVINCES]
    .filter(p => filter === "All" || p.risk === filter || p.region === filter)
    .sort((a, b) => sort === "pct" ? b.pct - a.pct : sort === "pop" ? b.pop - a.pop : a.name.localeCompare(b.name));
  const totalPop = PROVINCES.reduce((s, p) => s + p.pop, 0);
  const totalNid = PROVINCES.reduce((s, p) => s + p.nid, 0);
  const avgPct = Math.round(totalNid / totalPop * 100);
  return (
    <div style={{ padding: "80px 28px", maxWidth: 1200, margin: "0 auto" }}>
      <SLabel>Province Intelligence</SLabel>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 700, letterSpacing: "-.02em", marginBottom: 8 }}>NID Coverage — All 22 Provinces</h2>
      <p style={{ color: G.muted, marginBottom: 28, fontSize: 13, maxWidth: 600 }}>National ID registration progress by province. Target: 95% enrolled before GE27. Current national average: {avgPct}%.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: G.border, marginBottom: 20 }}>
        <StatCard value={`${totalPop.toLocaleString()}`} label="Total Population" sub="Estimated 2024" />
        <StatCard value={`${totalNid.toLocaleString()}`} label="NID Enrolled" sub="3.8M processed" />
        <StatCard value={`${avgPct}%`} label="National Average" sub="Target: 95%" color={G.redL} />
        <StatCard value="GE27" label="Next Election" sub="Writs: Apr 29, 2027" color={G.gold} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["All", "CRITICAL", "HIGH", "MEDIUM", "Highlands", "Momase", "Southern", "Islands"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", borderRadius: 2, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'Space Mono',monospace", letterSpacing: ".06em", background: filter === f ? "rgba(212,168,67,.12)" : "transparent", border: `1px solid ${filter === f ? "rgba(212,168,67,.4)" : G.border}`, color: filter === f ? G.gold : G.muted, transition: "all .15s" }}>{f}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {[["pct", "% Coverage"], ["pop", "Population"], ["name", "Name"]].map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} style={{ padding: "5px 12px", borderRadius: 2, cursor: "pointer", fontSize: 11, background: sort === k ? G.surface : "transparent", border: `1px solid ${sort === k ? G.border : "transparent"}`, color: sort === k ? G.text : G.muted }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, border: `1px solid ${G.border}` }}>
        {sorted.map((p, i) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 0, padding: "10px 14px", borderBottom: i < sorted.length - 1 ? `1px solid ${G.border}` : "none", background: i % 2 === 0 ? G.surface : G.ink }}>
            <div style={{ width: 200, fontSize: 12, color: G.text, fontWeight: 500, flexShrink: 0 }}>{p.name}</div>
            <div style={{ flex: 1, height: 4, background: G.raised, margin: "0 16px" }}>
              <div style={{ height: "100%", width: `${p.pct}%`, background: RISK_COLOR[p.risk], transition: "width .8s ease" }} />
            </div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: G.muted, width: 100, textAlign: "right", flexShrink: 0 }}>{p.nid.toLocaleString()} NID</div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: G.muted, width: 40, textAlign: "right", flexShrink: 0 }}>{p.pct}%</div>
            <div style={{ width: 100, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}><RiskPill risk={p.risk} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecuritySection() {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ padding: "80px 28px", maxWidth: 1200, margin: "0 auto", borderTop: `1px solid ${G.border}` }}>
      <SLabel>Biometric Security</SLabel>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 700, letterSpacing: "-.02em", marginBottom: 8 }}>9-Layer Security Stack</h2>
      <p style={{ color: G.muted, marginBottom: 28, fontSize: 13, maxWidth: 600 }}>Every vendor contracted for PNG's biometric system must certify compliance with all nine layers. No exceptions.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, border: `1px solid ${G.border}`, marginBottom: 48 }}>
        {SECURITY_LAYERS.map((layer, i) => (
          <div key={layer.num} onClick={() => setSelected(selected === i ? null : i)} style={{ padding: "14px 18px", borderBottom: i < SECURITY_LAYERS.length - 1 ? `1px solid ${G.border}` : "none", cursor: "pointer", background: selected === i ? G.raised : "transparent", transition: "background .15s" }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "start" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: G.gold, fontWeight: 700, paddingTop: 2 }}>{layer.num}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: G.text, marginBottom: selected === i ? 6 : 0 }}>{layer.title}</div>
                {selected === i && <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.65, animation: "slideUp .2s ease" }}>{layer.desc}</div>}
              </div>
              <Tag color={layer.color}>{layer.badge}</Tag>
            </div>
          </div>
        ))}
      </div>
      <SLabel>Attack vs Defence Matrix</SLabel>
      <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Every Attack Type — Every Counter</h3>
      <p style={{ color: G.muted, marginBottom: 20, fontSize: 13 }}>Deepfake fraud surged 1,100% in 2025. Deepfake-as-a-Service costs $10–$50 per attack. Here is exactly how the system defeats each vector.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 8 }}>
        {ATTACKS.map(a => (
          <div key={a.attack} style={{ background: G.surface, border: `1px solid ${G.border}`, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: G.text }}>{a.attack}</div>
              <Tag color={G.redL}>ATTACK</Tag>
            </div>
            <div style={{ fontSize: 11, color: "#C07070", marginBottom: 8, lineHeight: 1.5 }}>⚠ {a.method}</div>
            <div style={{ height: 1, background: G.border, marginBottom: 8 }} />
            <div style={{ fontSize: 11, color: G.greenL, lineHeight: 1.5 }}>✓ {a.defense}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoadmapSection() {
  return (
    <div style={{ padding: "80px 28px", maxWidth: 1200, margin: "0 auto", borderTop: `1px solid ${G.border}` }}>
      <SLabel>Implementation Roadmap</SLabel>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 700, letterSpacing: "-.02em", marginBottom: 8 }}>5-Phase Build — 2024 to 2032</h2>
      <p style={{ color: G.muted, marginBottom: 36, fontSize: 13, maxWidth: 600 }}>Every upgrade designed into the architecture from day one. Phase 4 never requires replacing Phase 1. They stack.</p>
      <div style={{ position: "relative", paddingLeft: 32 }}>
        <div style={{ position: "absolute", left: 8, top: 8, bottom: 8, width: 1, background: G.border }} />
        {PHASES.map((phase, i) => (
          <div key={phase.period} style={{ position: "relative", marginBottom: 32 }}>
            <div style={{ position: "absolute", left: -26, top: 2, width: 14, height: 14, border: `1px solid ${phase.status === "done" ? G.greenL : phase.status === "active" ? G.gold : G.border}`, background: phase.status === "done" ? G.greenL : phase.status === "active" ? G.gold : G.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: phase.status === "done" ? G.black : phase.status === "active" ? G.black : G.muted, fontWeight: 700 }}>{phase.status === "done" ? "✓" : phase.status === "active" ? "→" : ""}</div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: phase.status === "active" ? G.gold : G.muted, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 4 }}>{phase.period} — {phase.label}</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: G.text, marginBottom: 8 }}>{phase.title}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 4 }}>
              {phase.items.map(item => (
                <div key={item} style={{ display: "flex", gap: 7, fontSize: 12, color: G.muted, alignItems: "flex-start" }}>
                  <span style={{ color: phase.status === "done" ? G.greenL : G.gold, flexShrink: 0, fontSize: 10, paddingTop: 2 }}>{phase.status === "done" ? "✓" : "→"}</span>{item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccessGatesSection() {
  return (
    <div style={{ padding: "80px 28px", maxWidth: 1200, margin: "0 auto", borderTop: `1px solid ${G.border}` }}>
      <SLabel>Conditional Access</SLabel>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 700, letterSpacing: "-.02em", marginBottom: 8 }}>Triple-Gate Access Structure</h2>
      <p style={{ color: G.muted, marginBottom: 28, fontSize: 13, maxWidth: 600 }}>Biometric data exists and is protected. Access for any purpose requires three gates to open — not blanket access, not ministerial discretion.</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${G.border}`, fontSize: 12 }}>
          <thead>
            <tr>{["Use Case", "Gate 1 — Legal Authority", "Gate 2 — Purpose Limit", "Gate 3 — Oversight", "Citizen Right"].map(h => (
              <th key={h} style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: G.muted, textAlign: "left", padding: "10px 12px", borderBottom: `1px solid ${G.border}`, background: G.surface }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {ACCESS_GATES.map((row, i) => {
              const rColor = row.risk === "BLOCKED" ? G.redL : row.risk === "HIGH" ? "#C0A040" : row.risk === "MEDIUM" ? G.gold : G.greenL;
              return (
                <tr key={row.useCase} style={{ background: i % 2 === 0 ? G.ink : G.surface }}>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${G.border}`, fontWeight: 600, color: G.text, whiteSpace: "nowrap" }}>
                    <div>{row.useCase}</div>
                    <Tag color={rColor}>{row.risk}</Tag>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${G.border}`, color: G.muted, lineHeight: 1.5 }}>{row.gate1}</td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${G.border}`, color: G.muted, lineHeight: 1.5 }}>{row.gate2}</td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${G.border}`, color: G.muted, lineHeight: 1.5 }}>{row.gate3}</td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${G.border}`, color: G.greenL, lineHeight: 1.5, fontSize: 11 }}>{row.citizen}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AITerminalSection() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([
    { q: "nieis --province=Central --subject=electoral_roll", a: `Querying Central Province electoral data...\n✓ Population (2024 Census): 144,200\n✓ Registered voters (current roll): 98,400\n✓ NID enrolled: 18,200 (12.6%)\n⚠ Roll/Population ratio: 68.2% — statistically anomalous\n⚠ Deceased entries estimated: 8,400–12,000\n→ Recommendation: Priority NID rollout. Roll cleanse before GE27.` }
  ]);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const run = async () => {
    if (!query.trim() || loading) return;
    const q = query.trim();
    setQuery("");
    setLoading(true);
    setError(null);
    try {
      const result = await callAI(`You are the PNG NIEIS (National Identity & Electoral Intelligence System) query terminal.

Query: "${q}"

Real PNG facts you know:
- 2024 Census: 10.2M population, only 6 questions (below UN standards)
- NID enrolled: 3.8M people, 1.3M cards issued (13% of population)
- 2022 election: 50+ deaths, phantom voter rolls, ballot boxes burned
- Biometric voting target: 2027 but zero funds disbursed as of 2026
- CIR Act 2024 passed December 2024
- DGDP 2024 data governance policy adopted
- SevisPass digital ID piloted 2024 — 10,000 users
- Electoral Commissioner confirmed country not ready for biometric voting (2025)
- GE27 tentative writ dates: April 29, 2027
- Province risk ratings: Hela, Southern Highlands, Enga, Jiwaka, Western Highlands = CRITICAL

Respond in terminal style. Use ✓ for positives, ⚠ for warnings, → for recommendations. Factual, data-driven, honest. Max 120 words. Plain text only.`, 400);
      setHistory(h => [...h, { q: `nieis query -- "${q}"`, a: result }]);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div style={{ padding: "80px 28px", maxWidth: 1200, margin: "0 auto", borderTop: `1px solid ${G.border}` }}>
      <SLabel>Intelligence Terminal</SLabel>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 700, letterSpacing: "-.02em", marginBottom: 8 }}>NIEIS Query Terminal</h2>
      <p style={{ color: G.muted, marginBottom: 24, fontSize: 13, maxWidth: 600 }}>Ask anything about PNG electoral data, NID coverage, biometric security, or electoral integrity. Powered by Claude.</p>
      <div style={{ background: G.ink, border: `1px solid ${G.border}`, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${G.border}` }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: G.gold, letterSpacing: ".12em" }}>⚡ NIEIS INTELLIGENCE QUERY TERMINAL v2.0</div>
          <Tag color={G.gold}>AI POWERED</Tag>
        </div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, lineHeight: 1.85, maxHeight: 400, overflowY: "auto" }}>
          {history.map((h, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ color: G.gold }}>$ {h.q}</div>
              <div style={{ color: "#A8C0A0", paddingLeft: 16, marginTop: 4, whiteSpace: "pre-line" }}>{h.a}</div>
            </div>
          ))}
          {loading && <div style={{ color: G.gold }}>$ {query || "..."}<br /><span style={{ color: "#A8C0A0" }}>Querying intelligence engine...</span></div>}
          {error && <div style={{ color: G.redL, marginTop: 8 }}>⚠ {error}</div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${G.border}` }}>
          <input style={{ flex: 1, background: "rgba(255,255,255,.04)", border: `1px solid ${G.border}`, padding: "10px 14px", color: G.text, fontFamily: "'Space Mono',monospace", fontSize: 12 }} placeholder='Ask about any province, policy, or electoral data...' value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && run()} />
          <button onClick={run} disabled={!query.trim() || loading} style={{ background: "rgba(212,168,67,.15)", border: `1px solid rgba(212,168,67,.3)`, color: G.gold, padding: "10px 18px", fontFamily: "'Space Mono',monospace", fontSize: 11, cursor: "pointer", opacity: (!query.trim() || loading) ? .4 : 1 }}>{loading ? "..." : "RUN →"}</button>
        </div>
        <div style={{ marginTop: 10, fontSize: 10, color: G.muted, fontFamily: "'Space Mono',monospace" }}>Powered by Claude · Responses based on verified PNG public data</div>
      </div>
    </div>
  );
}

function WantokIntegrationSection() {
  const ACCESS = [
    { icon: "✓", label: "Province of residence (user-provided)", color: G.greenL },
    { icon: "✓", label: "Life connections (user opt-in)", color: G.greenL },
    { icon: "✓", label: "Anonymous aggregate census data (NSO public)", color: G.greenL },
    { icon: "✓", label: "Electoral roll updates (province-level, not individual)", color: G.greenL },
    { icon: "✓", label: "MP voting records (Parliament Hansard — public)", color: G.greenL },
    { icon: "✓", label: "Land registry public records", color: G.greenL },
  ];
  const NEVER = [
    { icon: "✗", label: "NID number or biometric data", color: G.redL },
    { icon: "✗", label: "Facial faceprint or photograph", color: G.redL },
    { icon: "✗", label: "Who a person voted for", color: G.redL },
    { icon: "✗", label: "Individual electoral roll entry", color: G.redL },
    { icon: "✗", label: "Health or medical records", color: G.redL },
    { icon: "✗", label: "Clan, ethnicity, or religion data", color: G.redL },
  ];
  const CONTRIBUTES = [
    { icon: "→", label: "Real-time anomaly alerts during elections", color: G.gold },
    { icon: "→", label: "Community verification of published results", color: G.gold },
    { icon: "→", label: "Violence alerts to Electoral Commission", color: G.gold },
    { icon: "→", label: "NID enrollment drive notifications", color: G.gold },
    { icon: "→", label: "Candidate information to every connected voter", color: G.gold },
    { icon: "→", label: "Post-election petition tracker", color: G.gold },
  ];
  return (
    <div style={{ padding: "80px 28px", maxWidth: 1200, margin: "0 auto", borderTop: `1px solid ${G.border}` }}>
      <SLabel>Platform Integration</SLabel>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 700, letterSpacing: "-.02em", marginBottom: 8 }}>Wantok Nation × NIEIS</h2>
      <p style={{ color: G.muted, marginBottom: 28, fontSize: 13, maxWidth: 600 }}>Wantok Nation is the civic intelligence layer. NIEIS is the identity and electoral infrastructure. Together they form the complete picture.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: G.border, marginBottom: 32 }}>
        {[[ACCESS, "What Wantok Nation ACCESSES", G.text], [NEVER, "What It NEVER Accesses", G.redL], [CONTRIBUTES, "What It CONTRIBUTES", G.gold]].map(([items, title, color]) => (
          <div key={title} style={{ background: G.surface, padding: "18px 20px" }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color, marginBottom: 12 }}>{title}</div>
            {items.map(item => (
              <div key={item.label} style={{ display: "flex", gap: 8, fontSize: 12, color: G.muted, marginBottom: 7, alignItems: "flex-start" }}>
                <span style={{ color: item.color, flexShrink: 0, fontWeight: 700 }}>{item.icon}</span>{item.label}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ background: G.surface, border: `1px solid ${G.borderG}`, padding: 32, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: 200, background: "radial-gradient(circle,rgba(212,168,67,.05) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: G.gold, letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 16 }}>The End State — Papua New Guinea in 2032</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div>
            <p style={{ fontSize: 15, color: G.text, lineHeight: 1.8, marginBottom: 14 }}>Every citizen has a National ID. Every ID holds a biometric record. Every election is verified — not by a stranger checking a name on a list, but by mathematics that cannot lie.</p>
            <p style={{ fontSize: 15, color: G.text, lineHeight: 1.8 }}>Every province knows its population exactly. Every clinic knows how many patients to plan for. Every DSIP allocation is based on real people with real needs.</p>
          </div>
          <div>
            <p style={{ fontSize: 15, color: G.muted, lineHeight: 1.8, marginBottom: 14 }}>None of this requires surrendering privacy. The data belongs to citizens, not to government. The government is the custodian, not the owner.</p>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, color: G.gold, lineHeight: 1.6, borderLeft: `2px solid ${G.gold}`, paddingLeft: 14 }}>
              "The goal is not to build a surveillance state. The goal is to build a state where the government cannot lie about who voted."
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
const NAV_TABS = [
  { id: "overview", label: "Overview" },
  { id: "provinces", label: "Provinces" },
  { id: "security", label: "Security" },
  { id: "roadmap", label: "Roadmap" },
  { id: "access", label: "Access Gates" },
  { id: "terminal", label: "AI Terminal" },
  { id: "integration", label: "Wantok Nation" },
];

export default function NIEIS() {
  const [tab, setTab] = useState("overview");
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("en-PG", { hour12: false }) + " PGT");
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const SCREENS = {
    overview: <HeroSection />,
    provinces: <ProvinceSection />,
    security: <SecuritySection />,
    roadmap: <RoadmapSection />,
    access: <AccessGatesSection />,
    terminal: <AITerminalSection />,
    integration: <WantokIntegrationSection />,
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="scan-sweep" />
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "rgba(7,8,9,.96)", borderBottom: `1px solid ${G.border}`, backdropFilter: "blur(20px)", zIndex: 900 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, border: `1px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Mono',monospace", fontSize: 10, color: G.gold, fontWeight: 700 }}>PNG</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", color: G.gold }}>NIEIS — National Identity & Electoral Intelligence System</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: "'Space Mono',monospace", fontSize: 10, color: G.muted }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: G.gold }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: G.gold, animation: "pulse 2s ease-in-out infinite" }} />
            SYSTEM LIVE
          </div>
          <span>CLASSIFICATION: OPEN POLICY</span>
          <span>{clock}</span>
        </div>
      </nav>
      <div style={{ position: "fixed", top: 52, left: 0, right: 0, zIndex: 890, background: "rgba(7,8,9,.94)", borderBottom: `1px solid ${G.border}`, display: "flex", gap: 0, overflowX: "auto", backdropFilter: "blur(12px)" }}>
        {NAV_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, color: tab === t.id ? G.gold : G.muted, background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? G.gold : "transparent"}`, cursor: "pointer", whiteSpace: "nowrap", transition: "all .15s", fontFamily: "'DM Sans',sans-serif" }}>{t.label}</button>
        ))}
      </div>
      <div style={{ paddingTop: 92, minHeight: "100vh", background: G.black }}>
        {SCREENS[tab] || SCREENS.overview}
      </div>
      <footer style={{ borderTop: `1px solid ${G.border}`, padding: "32px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: G.muted, lineHeight: 1.8 }}>
          PNG NIEIS — National Identity & Electoral Intelligence System<br />
          EyedeaForge Solutions · Policy Framework Document<br />
          Classification: Open · For Public Consultation
        </div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: G.gold, textAlign: "right" }}>
          Built for Papua New Guinea · 2026<br />
          GE27: April 29, 2027<br />
          <a href="https://wantok-nation.netlify.app" style={{ color: G.gold }}>← Wantok Nation</a>
        </div>
      </footer>
    </>
  );
}
