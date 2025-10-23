import React, { useState, useEffect, useMemo } from "react";

// Helper function to concatenate class names
const cx = (...a) => a.filter(Boolean).join(" ");
const todayISO = new Date().toISOString().slice(0, 10);

// Helper function for date calculations
function isoNDaysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// 👉 Starter data with structured coverage items
const seed = [
  {
    id: crypto.randomUUID(),
    name: "Alex",
    start: todayISO,
    end: todayISO,
    type: "Vacation",
    notes: "Day off",
    coverage: []
  },
  {
    id: crypto.randomUUID(),
    name: "Priya",
    start: isoNDaysFromNow(1),
    end: isoNDaysFromNow(3),
    type: "Sick Leave",
    notes: "Handover to Mike",
    coverage: [
      {
        id: crypto.randomUUID(),
        title: "Deal: ACME Q4 renewals",
        link: "https://example.com/deal/006XXXXXXXXXXXX",
        notes: "Renewal due EOM. Confirm pricing w/ finance.",
        tasks: [
          { id: crypto.randomUUID(), text: "Email decision-maker", done: false },
          { id: crypto.randomUUID(), text: "Update next steps in CRM", done: true }
        ]
      },
    ]
  }
];

// Helper component for displaying messages
function StatusMessage({ message, type }) {
  if (!message) return null;
  const classes = type === 'error'
    ? 'bg-red-100 text-red-800 border-red-200'
    : 'bg-green-100 text-green-800 border-green-200';

  return (
    <div className={cx("p-3 rounded-xl border text-sm font-medium", classes)}>
      {message}
    </div>
  );
}


/* ==============================================================================
 * GOOGLE CALENDAR INTEGRATION SHELL
 * ============================================================================== */

async function connectToGoogleCalendar(setMessage, setEntries) {
  setMessage({ text: "Initiating Google Calendar connection...", type: 'success' });

  // WARNING: The following steps require client-side OAuth 2.0 implementation
  // and cannot be fully executed in this environment.
  // This structure shows where your final code would go:

  try {
    // 1. AUTHENTICATION (OAuth Flow)
    // You would use the Google Identity Services client library (gapi.client or Google Sign-In)
    // to prompt the user for permission (e.g., calendar.events.readonly scope)
    // and retrieve an access token.
    console.log("Step 1: Authenticating user and obtaining access token...");
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate loading

    // 2. API REQUEST
    // Use the obtained access token to fetch events from the Calendar API (events:list).
    // You would filter for events tagged as 'OOO' or 'Vacation' within a set date range.
    console.log("Step 2: Fetching OOO events from Google Calendar...");
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate loading
    
    // --- Mock Data Retrieval ---
    const mockGoogleEvents = [
        { name: "John Doe", start: isoNDaysFromNow(10), end: isoNDaysFromNow(12), type: "Vacation", notes: "Via GCal" },
        { name: "Jane Smith", start: isoNDaysFromNow(15), end: isoNDaysFromNow(15), type: "Sick Leave", notes: "Via GCal" },
    ];
    // ---------------------------

    // 3. DATA PROCESSING
    // Merge the retrieved data (mockGoogleEvents) with the existing entries
    setEntries(prevEntries => {
        const existingNames = new Set(prevEntries.map(e => e.name));
        const newEntries = mockGoogleEvents
            .filter(g => !prevEntries.some(p => p.start === g.start && p.name === g.name)) // Simple de-duplication
            .map(g => ({
                id: crypto.randomUUID(),
                ...g,
                coverage: [],
            }));
        return [...prevEntries, ...newEntries];
    });

    setMessage({ text: "Successfully connected and synced 2 mock events from Google Calendar!", type: 'success' });

  } catch (error) {
    console.error("Google Calendar connection failed:", error);
    setMessage({ text: "Error connecting to Google Calendar. Please check console.", type: 'error' });
  }
}


/* ==============================================================================
 * MAIN APPLICATION COMPONENT
 * ============================================================================== */

export default function App() {
  // -------- state
  const [entries, setEntries] = useState(seed);
  const [form, setForm] = useState({ name: "", start: todayISO, end: todayISO, type: "Vacation", notes: "" });
  const [filter, setFilter] = useState({ query: "", type: "All" });
  const [tab, setTab] = useState("calendar"); // "calendar" | "requests" | "coverage"
  const [message, setMessage] = useState(null); // Status message state (for form errors)

  // ---- month navigation
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  function prevMonth() {
    if (viewMonth > 0) {
      setViewMonth(viewMonth - 1);
    } else {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    }
  }

  function nextMonth() {
    if (viewMonth < 11) {
      setViewMonth(viewMonth + 1);
    } else {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    }
  }

  // -------- persistence (using localStorage)
  useEffect(() => {
    const saved = localStorage.getItem("ooo_entries");
    if (saved) {
      try { setEntries(JSON.parse(saved)); } catch (e) { console.error("Failed to load state from localStorage", e); }
    }
  }, []);

  useEffect(() => {
    // Only save after a short delay to prevent thrashing
    const handler = setTimeout(() => {
      localStorage.setItem("ooo_entries", JSON.stringify(entries));
    }, 50); 
    return () => clearTimeout(handler);
  }, [entries]);

  // -------- computed
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      // Collect text from notes and coverage items
      const coverageText = Array.isArray(e.coverage)
        ? e.coverage.map(c => [c.title, c.notes, ...(c.tasks || []).map(t => t.text)]).flat()
        : [];
      
      const text = [e.name, e.type, e.notes, ...coverageText].join(" ").toLowerCase();
      const q = (filter.query || "").toLowerCase();
      const matchesText = !q || text.includes(q);
      const matchesType = filter.type === "All" || e.type === filter.type;
      return matchesText && matchesType;
    }).sort((a, b) => new Date(a.start) - new Date(b.start)); // Sort by start date
  }, [entries, filter]);

  const todaysOOO = useMemo(() => {
    const t = new Date(todayISO);
    return entries.filter((e) => new Date(e.start) <= t && t <= new Date(e.end));
  }, [entries]);

  // -------- actions
  function addEntry(ev) {
    ev.preventDefault();
    const s = new Date(form.start), e = new Date(form.end);
    setMessage(null); // Clear previous message
    
    if (!form.name || !form.start || !form.end) {
      setMessage({ text: "Please fill in all required fields (Name, Start/End Date).", type: 'error' });
      return;
    }
    
    if (e < s) {
      setMessage({ text: "End date cannot be before start date.", type: 'error' });
      return;
    }
    
    setEntries((prev) => [...prev, { id: crypto.randomUUID(), ...form, coverage: [] }]);
    setForm((f) => ({ ...f, notes: "" }));
    setMessage({ text: "Request submitted successfully!", type: 'success' });
    setTab("requests"); // Switch to my requests after submitting
  }
  
  const removeEntry = (id) => setEntries((prev) => prev.filter((e) => e.id !== id));

  return (
    <div className="min-h-screen text-gray-900 bg-gray-50 font-sans">
      {/* HEADER with logo and tabs */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center gap-3">
            {/* LearnUpon Logo Placeholder */}
            <img 
                src="https://placehold.co/48x48/00b2e8/ffffff?text=LU" 
                alt="LearnUpon Logo" 
                className="rounded-full shadow-md"
            />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-800">
              Team OOO & Coverage
            </h1>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-6 text-sm border-t pt-4">
            <TabButton active={tab==="calendar"} onClick={() => setTab("calendar")}>Calendar View</TabButton>
            <TabButton active={tab==="requests"} onClick={() => setTab("requests")}>My Requests & Coverage</TabButton>
            <TabButton active={tab==="coverage"} onClick={() => setTab("coverage")}>Coverage Needed</TabButton>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {message && <StatusMessage message={message.text} type={message.type} />}

        {tab === "calendar" && (
          <main className="grid gap-6 md:grid-cols-2">
            {/* Left card: form + connect */}
            <section className="bg-white rounded-2xl shadow-xl p-6 h-fit border border-gray-100">
              <h2 className="text-lg font-bold mb-2 text-indigo-700">Google Calendar Integration</h2>
              <p className="text-sm text-gray-600 mb-4">Click below to pull existing time-off events from your calendar into the tracker. (Requires OAuth authentication)</p>
              <button
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors focus:ring-2 ring-blue-300"
                type="button"
                onClick={() => connectToGoogleCalendar(setMessage, setEntries)}
              >
                Connect & Sync Google Calendar
              </button>

              <h2 className="text-lg font-bold mt-6 mb-2 border-t pt-4 text-indigo-700">Submit New Time Off Request</h2>
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
                  <label className="text-sm font-medium">Coverage & Handoff Notes (Basic)</label>
                  <textarea
                    className="border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-indigo-500"
                    rows="3"
                    placeholder="e.g., Contact Mike for support. Detailed tasks can be added in the 'My Requests' tab."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                <button
                  className="rounded-xl bg-indigo-600 text-white px-4 py-3 font-medium hover:bg-indigo-700 active:bg-indigo-800 shadow-md transition-colors"
                  type="submit"
                >
                  Submit Request
                </button>
              </form>
            </section>

            {/* Right card: filter + list + today's OOO */}
            <section className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h2 className="text-lg font-bold mb-4">Search & Filter</h2>
              <input
                className="border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-indigo-500 w-full"
                placeholder="Search by name, note, or coverage item…"
                value={filter.query}
                onChange={(e) => setFilter({ ...filter, query: e.target.value })}
              />
              <div className="flex gap-2 flex-wrap mt-3">
                {["All", "Vacation", "Sick Leave", "Public Holiday", "Training", "Other"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={cx(
                      "px-3 py-1.5 rounded-full border text-sm transition-colors",
                      filter.type === t ? "bg-gray-900 text-white border-gray-900 shadow-md" : "bg-white hover:bg-gray-50"
                    )}
                    onClick={() => setFilter({ ...filter, type: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Today's OOO summary */}
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold mb-2">Today’s OOO ({todaysOOO.length})</h3>
                {todaysOOO.length === 0 && <div className="text-sm text-gray-500">No one is OOO today.</div>}
                <div className="flex flex-wrap gap-2">
                  {todaysOOO.map((e) => (
                    <span key={e.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-sm">
                      <Dot className="text-red-500" /> {e.name} <span className="text-gray-500">({e.type})</span>
                    </span>
                  ))}
                </div>
              </div>

              <h3 className="font-semibold mt-6 mb-2 border-t pt-4">Upcoming Time Off</h3>
              <ul className="divide-y">
                {filtered.length === 0 && (
                  <li className="py-4 text-gray-500 text-sm">No entries match your filter.</li>
                )}
                {filtered.map((e) => (
                  <li key={e.id} className="py-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{e.name}</div>
                      <div className="text-sm text-gray-600">{e.type} • {e.start} → {e.end}</div>
                      {e.notes && <div className="text-sm mt-1 text-gray-700 truncate">{e.notes}</div>}
                    </div>
                    <button className="text-red-600 hover:text-red-700 text-sm shrink-0 p-1 rounded-full hover:bg-red-50" onClick={() => removeEntry(e.id)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Mini calendar with month name */}
            <section className="md:col-span-2 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <MiniCalendar
                year={viewYear}
                month={viewMonth}
                entries={entries}
                onPrev={prevMonth}
                onNext={nextMonth}
              />
            </section>
          </main>
        )}

        {tab === "requests" && (
          <main className="mx-auto max-w-6xl py-6">
            <section className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-indigo-700">My Requests & Coverage Setup</h2>
              <p className="text-sm text-gray-600 mb-6">
                Use this view to review and structure the detailed coverage items (tasks, links) for each time off entry.
              </p>
              <ul className="divide-y">
                {entries.length === 0 && <li className="py-6 text-gray-500 italic">No time-off requests submitted yet.</li>}
                {/* FIX: Use entries list instead of filtered list here */}
                {entries.map((e) => ( 
                  <li key={e.id} className="py-4">
                    <RequestItem entry={e} setEntries={setEntries} removeEntry={removeEntry} />
                  </li>
                ))}
              </ul>
            </section>
          </main>
        )}

        {tab === "coverage" && (
          <main className="mx-auto max-w-6xl py-6">
            <section className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-indigo-700">Active Coverage Board</h2>
              <p className="text-sm text-gray-600 mb-6">
                Aggregated, actionable coverage items (deals, tasks) from everyone’s current time-off requests. Items can be edited and checked off here.
              </p>
              <CoverageBoard entries={entries} setEntries={setEntries} />
            </section>
          </main>
        )}
      </div>
    </div>
  );
}

/* ---------------- APPLICATION COMPONENTS ---------------- */

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "relative px-3 py-2 rounded-lg transition-colors",
        active
          ? "text-indigo-700 font-semibold bg-indigo-100 shadow-inner"
          : "text-gray-500 hover:text-indigo-700 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  );
}

function Dot({ className }) {
  return <span className={cx("inline-block w-2 h-2 rounded-full", className)} />;
}

function RequestItem({ entry, setEntries, removeEntry }) {
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newLink, setNewLink] = useState("");

  const coverageItems = Array.isArray(entry.coverage) ? entry.coverage : [];

  const handleUpdate = (patch) => {
    setEntries(prevEntries => prevEntries.map(e => {
      if (e.id === entry.id) {
        return { ...e, ...patch };
      }
      return e;
    }));
  };
  
  const handleAddCoverage = (e) => {
    e.preventDefault();
    if (!newTitle) return;

    const newCoverageItem = {
      id: crypto.randomUUID(),
      title: newTitle,
      link: newLink,
      notes: newNotes,
      tasks: []
    };

    handleUpdate({ 
      coverage: [...coverageItems, newCoverageItem] 
    });
    setNewTitle("");
    setNewNotes("");
    setNewLink("");
  };

  return (
    <div className="border p-4 rounded-xl bg-gray-50 shadow-md">
      <div className="flex justify-between items-start mb-3 border-b pb-3">
        <div>
          <div className="font-bold text-lg text-indigo-700">{entry.name} - {entry.type}</div>
          <div className="text-sm text-gray-600">
            {entry.start} → {entry.end}
          </div>
        </div>
        <button 
          className="text-red-600 hover:text-red-700 text-sm shrink-0 p-1 rounded-full hover:bg-red-100" 
          onClick={() => removeEntry(entry.id)}
        >
          Remove
        </button>
      </div>

      <div className="text-sm text-gray-700 italic mb-4">
        Basic Notes: {entry.notes || 'None provided.'}
      </div>

      <h4 className="font-semibold text-gray-800 mb-2 mt-4 border-t pt-4">Structured Handoff Items ({coverageItems.length})</h4>
      
      {/* Existing Coverage List */}
      <ul className="space-y-3">
        {coverageItems.map((c) => (
          <li key={c.id} className="border p-3 rounded-lg bg-white shadow-sm">
            <div className="font-medium text-indigo-600">
              {c.title}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {c.notes || 'No notes.'}
            </div>
            <div className="mt-2 flex items-center gap-4">
                {c.link && (
                    <a href={c.link} target="_blank" rel="noreferrer" className="text-indigo-500 text-xs hover:underline">View Link</a>
                )}
                <span className="text-xs text-gray-500 ml-auto">
                    {c.tasks.filter(t => t.done).length} / {c.tasks.length} tasks completed
                </span>
            </div>
          </li>
        ))}
      </ul>
      
      {/* Add New Coverage Form */}
      <div className="mt-4 border-t pt-4">
        <h4 className="text-sm font-semibold mb-2">Add New Coverage Item:</h4>
        <form onSubmit={handleAddCoverage} className="space-y-2">
            <input 
                type="text" 
                placeholder="Title (e.g., Q3 Client Renewal)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-indigo-500"
            />
             <input 
                type="url" 
                placeholder="Link (e.g., Salesforce, Drive, Trello)"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-indigo-500"
            />
            <textarea 
                placeholder="Detailed context/notes..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows="2"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-indigo-500"
            />
            <button
                type="submit"
                className="w-full bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-600 shadow-md"
            >
                Add Structured Item
            </button>
        </form>
      </div>
    </div>
  );
}

function MiniCalendar({ year, month, entries, onPrev, onNext }) {
  const monthName = new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startWeekday = first.getDay(); // 0=Sun
  const daysInMonth = last.getDate();
  const todayIso = new Date().toISOString().slice(0, 10);

  // Map ISO date -> unique people OOO (for the shown month)
  const byDate = new Map();
  for (const e of entries) {
    const s = new Date(e.start);
    const ed = new Date(e.end);
    const start = new Date(Math.max(+s, +first));
    const end = new Date(Math.min(+ed, +last));
    if (end < first || start > last) continue;
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      if (!byDate.has(iso)) byDate.set(iso, new Set());
      byDate.get(iso).add(e.name);
    }
  }

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="px-2 py-1 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            title="Previous month"
          >
            ‹
          </button>
          <h2 className="text-lg font-semibold min-w-[12ch] text-center">{monthName}</h2>
          <button
            type="button"
            onClick={onNext}
            className="px-2 py-1 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            title="Next month"
          >
            ›
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-indigo-100 border border-indigo-300" />
            <span>OOO day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded ring-2 ring-indigo-500" />
            <span>Today</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((w) => (
          <div key={w} className="text-center text-xs font-semibold text-gray-600">{w}</div>
        ))}

        {cells.map((d, idx) => {
          const iso = d ? new Date(year, month, d).toISOString().slice(0, 10) : "";
          const peopleSet = d ? byDate.get(iso) : null;
          const people = peopleSet ? Array.from(peopleSet) : [];
          const isOOO = people.length > 0;
          const isToday = iso === todayIso;

          const visible = people.slice(0, 3);
          const more = Math.max(people.length - visible.length, 0);

          return (
            <div
              key={idx}
              title={isOOO ? `${iso}: ${people.join(", ")}` : iso}
              className={cx(
                "aspect-square rounded-xl border p-2 flex flex-col text-sm relative transition-shadow duration-100",
                d ? "bg-white" : "bg-transparent border-transparent",
                isOOO && "bg-indigo-50 border-indigo-300 shadow-sm",
                isToday && "ring-2 ring-indigo-500 shadow-md"
              )}
            >
              <div className="text-xs text-gray-500">{d ?? ""}</div>

              {isOOO && (
                <div className="mt-1 flex flex-wrap gap-1 overflow-hidden">
                  {visible.map((name) => (
                    <span
                      key={name}
                      className="px-2 py-0.5 rounded-full bg-white border text-[11px] leading-4 text-indigo-700 shadow-sm"
                    >
                      {name}
                    </span>
                  ))}
                  {more > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white border text-[11px] leading-4 text-indigo-700 shadow-sm">
                      +{more}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}


/* ---------------- COVERAGE BOARD COMPONENT ---------------- */

function CoverageBoard({ entries, setEntries }) {
  // Helper: normalize a single entry's coverage array to objects
  function normalizedCoverageArray(entry) {
    const list = Array.isArray(entry.coverage) ? entry.coverage : [];
    return list.map((c) => {
      // If it's the old string format, convert it
      if (typeof c === "string") {
        return { id: crypto.randomUUID(), title: c, link: "", notes: "", tasks: [] };
      }
      return {
        id: c.id || crypto.randomUUID(),
        title: c.title || "",
        link: c.link || "",
        notes: c.notes || "",
        tasks: Array.isArray(c.tasks)
          ? c.tasks.map((t) => ({ id: t.id || crypto.randomUUID(), text: t.text || "", done: !!t.done }))
          : []
      };
    });
  }

  // --- ACTIONS ---

  function updateCoverage(entryId, coverageId, patch) {
    setEntries(prevEntries => prevEntries.map((e) => {
      if (e.id !== entryId) return e;
      const cov = normalizedCoverageArray(e).map((c) => (c.id === coverageId ? { ...c, ...patch } : c));
      return { ...e, coverage: cov };
    }));
  }

  function addTask(entryId, coverageId, text) {
    setEntries(prevEntries => prevEntries.map(e => {
        if (e.id !== entryId) return e;
        const cov = normalizedCoverageArray(e);
        const c = cov.find(x => x.id === coverageId);
        if (!c) return e;

        const updatedTasks = [...c.tasks, { id: crypto.randomUUID(), text, done: false }];
        const updatedCov = cov.map(x => (x.id === coverageId ? {...c, tasks: updatedTasks} : x));
        return {...e, coverage: updatedCov};
    }));
  }

  function toggleTask(entryId, coverageId, taskId) {
    setEntries(prevEntries => prevEntries.map(e => {
        if (e.id !== entryId) return e;
        const cov = normalizedCoverageArray(e);
        const c = cov.find(x => x.id === coverageId);
        if (!c) return e;

        const updatedTasks = c.tasks.map(t => (t.id === taskId ? {...t, done: !t.done} : t));
        const updatedCov = cov.map(x => (x.id === coverageId ? {...c, tasks: updatedTasks} : x));
        return {...e, coverage: updatedCov};
    }));
  }

  function removeTask(entryId, coverageId, taskId) {
    setEntries(prevEntries => prevEntries.map(e => {
        if (e.id !== entryId) return e;
        const cov = normalizedCoverageArray(e);
        const c = cov.find(x => x.id === coverageId);
        if (!c) return e;
        
        const updatedTasks = c.tasks.filter(t => t.id !== taskId);
        const updatedCov = cov.map(x => (x.id === coverageId ? {...c, tasks: updatedTasks} : x));
        return {...e, coverage: updatedCov};
    }));
  }

  // Flatten coverage items for display
  const items = useMemo(() => {
    const list = [];
    for (const e of entries) {
      const cov = normalizedCoverageArray(e);
      for (const c of cov) {
        // Only show items for time off that hasn't finished yet
        if (new Date(e.end) >= new Date(todayISO)) {
            list.push({
                entryId: e.id,
                by: e.name,
                range: `${e.start} → ${e.end}`,
                ...c
            });
        }
      }
    }
    return list;
  }, [entries]);


  if (items.length === 0) {
    return <div className="text-sm text-gray-500 italic">No active coverage items need attention.</div>;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((x) => (
        <div key={x.id} className="border rounded-xl p-4 bg-gray-50 shadow-lg">
          <div className="text-xs text-gray-500 mb-1">
            Owner OOO: <span className="font-medium text-indigo-800">{x.by}</span>
            <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{x.range}</span>
          </div>

          {/* Title + link */}
          <div className="text-lg font-bold mb-2 mt-1">
            {x.link ? (
              <a href={x.link} target="_blank" rel="noreferrer" className="text-indigo-700 hover:underline">
                {x.title || "Untitled"}
              </a>
            ) : (
              x.title || "Untitled"
            )}
          </div>

          {/* Notes */}
          <div className="grid gap-1 mb-4 border-t pt-4">
            <label className="text-xs font-semibold text-gray-600">Notes / Context (Click to edit)</label>
            <textarea
              rows={3}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500 bg-white"
              placeholder="What needs to be done on this item?"
              value={x.notes}
              onChange={(e) => updateCoverage(x.entryId, x.id, { notes: e.target.value })}
            />
          </div>

          {/* Checklist */}
          <div className="grid gap-2 border-t pt-4">
            <div className="text-sm font-semibold">Action Checklist</div>
            <div className="flex flex-col gap-2">
              {(x.tasks || []).map((t) => (
                <label key={t.id} className="flex items-center gap-3 text-sm p-1 rounded-lg hover:bg-white transition-colors">
                  <input
                    type="checkbox"
                    checked={!!t.done}
                    onChange={() => toggleTask(x.entryId, x.id, t.id)}
                    className="form-checkbox h-4 w-4 text-indigo-600 rounded"
                  />
                  <span className={t.done ? "line-through text-gray-500 flex-1" : "flex-1"}>
                      {t.text}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:text-red-800 shrink-0"
                    onClick={() => removeTask(x.entryId, x.id, t.id)}
                    title="Remove Task"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V8z" clipRule="evenodd" />
                    </svg>
                  </button>
                </label>
              ))}
            </div>

            {/* Add new task */}
            <AddTaskRow onAdd={(text) => text && addTask(x.entryId, x.id, text)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AddTaskRow({ onAdd }) {
  const [text, setText] = useState("");
  return (
    <form
      className="flex items-center gap-2 mt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onAdd(text.trim());
        setText("");
      }}
    >
      <input
        className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500 w-full"
        placeholder="Add a checklist item…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shrink-0"
        type="submit"
      >
        Add
      </button>
    </form>
  );
}
