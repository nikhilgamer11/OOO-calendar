import React, { useMemo, useState } from "react";

function cx(...a) { return a.filter(Boolean).join(" "); }
const today = new Date().toISOString().slice(0, 10);

export default function App() {
  const [entries, setEntries] = useState([
    { id: crypto.randomUUID(), name: "Alex", start: today, end: today, type: "Vacation", notes: "Day off" },
  ]);
  const [form, setForm] = useState({ name: "", start: today, end: today, type: "Vacation", notes: "" });
  const [filter, setFilter] = useState({ query: "", type: "All" });

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const t = (s) => (s || "").toLowerCase();
      const text = [e.name, e.type, e.notes].join(" ");
      const matchesText = !filter.query || t(text).includes(t(filter.query));
      const matchesType = filter.type === "All" || e.type === filter.type;
      return matchesText && matchesType;
    });
  }, [entries, filter]);

  function addEntry(ev) {
    ev.preventDefault();
    const s = new Date(form.start), e = new Date(form.end);
    if (e < s) { alert("End date cannot be before start date."); return; }
    setEntries((prev) => [...prev, { id: crypto.randomUUID(), ...form }]);
    setForm((f) => ({ ...f, notes: "" }));
  }

  function removeEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="min-h-screen text-gray-900">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Team OOO & Coverage Tracker</h1>
          <span className="text-xs text-gray-500">Vite + React + Tailwind</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 grid gap-6 md:grid-cols-2">
        {/* left */}
        <section className="bg-white rounded-2xl shadow-soft p-5">
          <h2 className="text-lg font-semibold mb-2">Google Calendar Integration</h2>
          <p className="text-sm text-gray-600 mb-4">
            The app is set up for manual entry. Connect for automatic sync (mock).
          </p>
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
                className="border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-blue-500"
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
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-blue-500"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium">End Date</label>
                <input
                  type="date"
                  className="border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-blue-500"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium">Type</label>
              <select
                className="border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-blue-500"
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
                className="border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-blue-500"
                rows="3"
                placeholder="e.g., Contact Mike for support. Q3 report is on Drive."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <button
              className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700 active:bg-blue-800"
              type="submit"
            >
              Submit Request
            </button>
          </form>
        </section>

        {/* right */}
        <section className="bg-white rounded-2xl shadow-soft p-5">
          <h2 className="text-lg font-semibold mb-4">Search & Filter</h2>
          <input
            className="border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-blue-500 w-full"
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
                </div>
                <button className="text-red-600 hover:text-red-700 text-sm" onClick={() => removeEntry(e.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="md:col-span-2 bg-white rounded-2xl shadow-soft p-5">
          <h2 className="text-lg font-semibold mb-3">Mini Calendar (current month)</h2>
          <MiniCalendar entries={entries} />
        </section>
      </main>
    </div>
  );
}

function MiniCalendar({ entries }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startWeekday = first.getDay();
  const daysInMonth = last.getDate();

  const marked = new Set();
  for (const e of entries) {
    const s = new Date(e.start);
    const ed = new Date(e.end);
    const start = new Date(Math.max(s, first));
    const end = new Date(Math.min(ed, last));
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      marked.add(d.toISOString().slice(0, 10));
    }
  }

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="grid grid-cols-7 gap-2">
      {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((w) => (
        <div key={w} className="text-center text-xs font-semibold text-gray-600">{w}</div>
      ))}
      {cells.map((d, i) => {
        const iso = d
          ? new Date(new Date().getFullYear(), new Date().getMonth(), d).toISOString().slice(0, 10)
          : "";
        const isMarked = d && marked.has(iso);
        return (
          <div
            key={i}
            className={cx(
              "aspect-square rounded-xl border flex items-center justify-center text-sm",
              d ? "bg-white" : "bg-transparent border-transparent",
              isMarked && "bg-blue-50 border-blue-300"
            )}
            title={iso}
          >
            {d ?? ""}
          </div>
        );
      })}
    </div>
  );
}
