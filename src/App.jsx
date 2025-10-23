import React, { useEffect, useMemo, useState } from "react";

const cx = (...a) => a.filter(Boolean).join(" ");
const todayISO = new Date().toISOString().slice(0, 10);

// 👉 Optional starter data (you can delete or edit these)
const seed = [
  { id: crypto.randomUUID(), name: "Alex", start: todayISO, end: todayISO, type: "Vacation", notes: "Day off" },
  // example: multi-day OOO with coverage needs
  { id: crypto.randomUUID(), name: "Priya", start: isoNDaysFromNow(1), end: isoNDaysFromNow(3), type: "Sick Leave", notes: "Handover to Mike", coverage: ["Deal: ACME Q4 renewals", "Support: Tier-2 backlog triage"] },
];

function isoNDaysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function App() {
  // -------- state
  const [entries, setEntries] = useState(seed);
  const [form, setForm] = useState({ name: "", start: todayISO, end: todayISO, type: "Vacation", notes: "" });
  const [filter, setFilter] = useState({ query: "", type: "All" });
  const [tab, setTab] = useState("calendar"); // "calendar" | "requests" | "coverage"

  // -------- persistence (optional)
  useEffect(() => {
    const saved = localStorage.getItem("ooo_entries");
    if (saved) {
      try { setEntries(JSON.parse(saved)); } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("ooo_entries", JSON.stringify(entries));
  }, [entries]);

  // -------- computed
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const text = [e.name, e.type, e.notes, ...(e.coverage || [])].join(" ").toLowerCase();
      const q = (filter.query || "").toLowerCase();
      const matchesText = !q || text.includes(q);
      const matchesType = filter.type === "All" || e.type === filter.type;
      return matchesText && matchesType;
    });
  }, [entries, filter]);

  const todaysOOO = useMemo(() => {
    const t = new Date(todayISO);
    return entries.filter((e) => new Date(e.start) <= t && t <= new Date(e.end));
  }, [entries]);

  // -------- actions
  function addEntry(ev) {
    ev.preventDefault();
    const s = new Date(form.start), e = new Date(form.end);
    if (e < s) { alert("End date cannot be before start date."); return; }
    setEntries((prev) => [...prev, { id: crypto.randomUUID(), ...form }]);
    setForm((f) => ({ ...f, notes: "" }));
    setTab("calendar");
  }
  const removeEntry = (id) => setEntries((prev) => prev.filter((e) => e.id !== id));

  return (
    <div className="min-h-screen text-gray-900">
      {/* HEADER with icon + tabs */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="flex items-center gap-3">
            {/* calendar icon */}
            <svg width="28" height="28" viewBox="0 0 24 24" className="text-indigo-600">
              <path fill="currentColor" d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1m12 6H5v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1zM5 7h14V6a1 1 0 0 0-1-1h-1v1a1 1 0 1 1-2 0V5H8v1a1 1 0 1 1-2 0V5H5a1 1 0 0 0-1 1z"/>
            </svg>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-indigo-700">
              Team OOO Tracker
            </h1>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-6 text-sm">
            <TabButton active={tab==="calendar"} onClick={() => setTab("calendar")}>Calendar View</TabButton>
            <TabButton active={tab==="requests"} onClick={() => setTab("requests")}>My Requests & Coverage</TabButton>
            <TabButton active={tab==="coverage"} onClick={() => setTab("coverage")}>Coverage Needed</TabButton>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      {tab === "calendar" && (
        <main className="mx-auto max-w-6xl px-4 py-6 grid gap-6 md:grid-cols-2">
          {/* Left card: form + connect */}
          <section className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-lg font-semibold mb-2">Google Calendar Integration</h2>
            <p className="text-sm text-gray-600 mb-4">The app is set up for manual entry. Connect for automatic sync (mock).</p>
            <button
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
              type="button"
              onClick={() => alert("Mock connect")}
            >
              Connect & Sync from Google Calendar (Mock)
            </button>

            <h2 className="text-lg font-semibold mt-6 mb-2">Submit Time Off Request</h2>
            <form className="grid gap-4" onSubmit={addEntry}>
              <div className="grid gap-1">
                <label className="text-sm font-medium">Your Name</label>
                <input
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-indigo-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Nikhil"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1">
                  <label className="text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    className="border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-indigo-500"
                    value={form.start}
                    onChange={(e) => setForm({ ...form, start: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    className="border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-indigo-500"
                    value={form.end}
                    onChange={(e) => setForm({ ...form, end: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-sm font-medium">Type</label>
                <select
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-indigo-500"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option>Vacation</option>
                  <option>Sick Leave</option>
                  <option>Public Holiday</option>
                  <option>Training</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="grid gap-1">
                <label className="text-sm font-medium">Coverage & Handoff Notes</label>
                <textarea
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-indigo-500"
                  rows="3"
                  placeholder="e.g., Contact Mike for support. Q3 report is on Drive."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <button
                className="rounded-xl bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700 active:bg-indigo-800"
                type="submit"
              >
                Submit Request
              </button>
            </form>
          </section>

          {/* Right card: filter + list + today's OOO */}
          <section className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-lg font-semibold mb-4">Search & Filter</h2>
            <input
              className="border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-indigo-500 w-full"
              placeholder="Search by name, note, or type…"
              value={filter.query}
              onChange={(e) => setFilter({ ...filter, query: e.target.value })}
            />
            <div className="flex gap-2 flex-wrap mt-3">
              {["All", "Vacation", "Sick Leave", "Public Holiday", "Training", "Other"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={cx(
                    "px-3 py-1.5 rounded-full border text-sm",
                    filter.type === t ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50"
                  )}
                  onClick={() => setFilter({ ...filter, type: t })}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Today's OOO summary */}
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Today’s OOO</h3>
              {todaysOOO.length === 0 && <div className="text-sm text-gray-500">No one is OOO today.</div>}
              <div className="flex flex-wrap gap-2">
                {todaysOOO.map((e) => (
                  <span key={e.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-sm">
                    <Dot className="text-red-500" /> {e.name} <span className="text-gray-500">({e.type})</span>
                  </span>
                ))}
              </div>
            </div>

            <h3 className="font-semibold mt-6 mb-2">Team Calendar View</h3>
            <ul className="divide-y">
              {filtered.length === 0 && (
                <li className="py-6 text-gray-500 text-sm">No entries yet.</li>
              )}
              {filtered.map((e) => (
                <li key={e.id} className="py-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-sm text-gray-600">{e.type} • {e.start} → {e.end}</div>
                    {e.notes && <div className="text-sm mt-1">{e.notes}</div>}
                    {Array.isArray(e.coverage) && e.coverage.length > 0 && (
                      <ul className="mt-2 text-sm list-disc pl-5 text-indigo-700">
                        {e.coverage.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    )}
                  </div>
                  <button className="text-red-600 hover:text-red-700 text-sm" onClick={() => removeEntry(e.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Mini calendar with month name */}
          <section className="md:col-span-2 bg-white rounded-2xl shadow p-5">
            <MiniCalendar entries={entries} />
          </section>
        </main>
      )}

      {tab === "requests" && (
        <main className="mx-auto max-w-6xl px-4 py-6">
          <section className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-lg font-semibold mb-4">My Requests & Coverage</h2>
            <p className="text-sm text-gray-600 mb-4">A simple list of your submissions. (In a real app, we’d filter by the signed-in user.)</p>
            <ul className="divide-y">
              {entries.map((e) => (
                <li key={e.id} className="py-4">
                  <div className="font-medium">{e.name} — {e.type}</div>
                  <div className="text-sm text-gray-600">{e.start} → {e.end}</div>
                  {e.notes && <div className="text-sm mt-1">{e.notes}</div>}
                  {Array.isArray(e.coverage) && e.coverage.length > 0 && (
                    <ul className="mt-2 text-sm list-disc pl-5 text-indigo-700">
                      {e.coverage.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </main>
      )}

      {tab === "coverage" && (
        <main className="mx-auto max-w-6xl px-4 py-6">
          <section className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-lg font-semibold mb-4">Coverage Needed</h2>
            <p className="text-sm text-gray-600 mb-4">
              Aggregated items from everyone’s requests (e.g., deals, support queues, approvals).
            </p>
            <CoverageBoard entries={entries} />
          </section>
        </main>
      )}
    </div>
  );
}

/* ---------------- components ---------------- */

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "relative px-3 py-2 rounded-lg",
        active
          ? "text-indigo-700 font-semibold bg-indigo-50"
          : "text-gray-500 hover:text-indigo-700 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  );
}

function Dot({ className }) {
  return <span className={cx("inline-block w-2 h-2 rounded-full bg-current", className)} />;
}

function MiniCalendar({ entries }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const monthName = now.toLocaleString(undefined, { month: "long", year: "numeric" });
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startWeekday = first.getDay(); // 0=Sun
  const daysInMonth = last.getDate();

  // build map: ISO date -> array of people OOO
  const byDate = new Map();
  for (const e of entries) {
    const s = new Date(e.start);
    const ed = new Date(e.end);
    const start = new Date(Math.max(+s, +first));
    const end = new Date(Math.min(+ed, +last));
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      if (!byDate.has(iso)) byDate.set(iso, []);
      byDate.get(iso).push(e.name);
    }
  }

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Mini Calendar ({monthName})</h2>
        {/* little legend */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block w-3 h-3 rounded bg-indigo-100 border border-indigo-300" />
          <span>OOO</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
          <div key={w} className="text-center text-xs font-semibold text-gray-600">{w}</div>
        ))}
        {cells.map((d, idx) => {
          const date = d
            ? new Date(year, month, d).toISOString().slice(0, 10)
            : "";
          const people = d ? byDate.get(date) || [] : [];
          const isOOO = people.length > 0;

          return (
            <div
              key={idx}
              title={isOOO ? `${date}: ${people.join(", ")}` : date}
              className={cx(
                "aspect-square rounded-xl border flex items-center justify-center text-sm relative",
                d ? "bg-white" : "bg-transparent border-transparent",
                isOOO && "bg-indigo-100 border-indigo-300"
              )}
            >
              {d ?? ""}

              {/* count bubble */}
              {isOOO && (
                <span className="absolute -top-1 -right-1 text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-indigo-600 text-white">
                  {people.length}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function CoverageBoard({ entries }) {
  // flatten all coverage items across entries
  const items = [];
  for (const e of entries) {
    if (Array.isArray(e.coverage)) {
      for (const c of e.coverage) {
        items.push({ by: e.name, item: c, range: `${e.start} → ${e.end}` });
      }
    }
  }

  if (items.length === 0) {
    return <div className="text-sm text-gray-500">No coverage items yet.</div>;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((x, i) => (
        <div key={i} className="border rounded-xl p-4 bg-gray-50">
          <div className="text-sm text-gray-500 mb-1">Owner OOO: <span className="font-medium text-gray-800">{x.by}</span></div>
          <div className="font-medium">{x.item}</div>
          <div className="text-xs text-gray-500 mt-1">{x.range}</div>
        </div>
      ))}
    </div>
  );
}
