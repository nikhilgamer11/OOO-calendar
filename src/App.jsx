import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
// Set log level to debug for full Firebase logging (useful for development)
// import { setLogLevel } from 'firebase/firestore';
// setLogLevel('debug');

// --- FIREBASE GLOBALS (Provided by the Canvas Environment) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
// --- END FIREBASE GLOBALS ---

// Helper function to format dates as 'MMM DD'
const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Helper function to get the name of the current month
const getMonthName = (monthIndex) => {
  const date = new Date(2000, monthIndex, 1);
  return date.toLocaleString('en-US', { month: 'long' });
};

// ==============================================================================
// 1. FIREBASE SETUP & AUTH HOOK
// ==============================================================================

function useFirebaseSetup() {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    try {
      if (Object.keys(firebaseConfig).length === 0) {
        console.error("Firebase config is missing. Cannot initialize the app.");
        return;
      }
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestoreDb);
      setAuth(firebaseAuth);

      // Authenticate the user
      const authenticate = async () => {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(firebaseAuth, initialAuthToken);
          } else {
            await signInAnonymously(firebaseAuth);
          }
        } catch (error) {
          console.error("Authentication failed:", error);
        }
      };

      authenticate();

      // Auth state listener
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          // Fallback if sign-in fails, but should be rare with custom token/anonymous
          setUserId(crypto.randomUUID());
        }
        setIsAuthReady(true);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Failed to initialize Firebase:", e);
    }
  }, []);

  return { db, auth, userId, isAuthReady };
}

// ==============================================================================
// 2. DATA HOOKS
// ==============================================================================

function useVacations(db, isAuthReady) {
  const [vacations, setVacations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Firestore Collection Path: Public data for all users to see
  const collectionPath = `artifacts/${appId}/public/data/vacations`;

  useEffect(() => {
    if (!db || !isAuthReady) return;

    const q = query(collection(db, collectionPath));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure dates are stringified if they were saved as Firebase Timestamps
          startDate: doc.data().startDate,
          endDate: doc.data().endDate,
        }));
        setVacations(data);
        setIsLoading(false);
      } catch (e) {
        console.error("Error fetching vacations:", e);
        setError("Failed to load data.");
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [db, isAuthReady]);

  return { vacations, isLoading, error, collectionPath };
}

// ==============================================================================
// 3. GOOGLE CALENDAR SIMULATION & INTEGRATION GUIDE
// ==============================================================================

/**
 * Placeholder for Google Calendar Integration.
 *
 * NOTE: For actual Google Calendar API integration, you would need to:
 * 1. Implement OAuth 2.0 flow to get user consent and an access token.
 * 2. Use the access token to call the Calendar API (e.g., `Events: list`).
 * 3. Filter for events marked as "Out of Office" or similar.
 * 4. Convert the fetched events into the `vacation` data structure.
 * 5. Update the Firestore database with the fetched data (or display it separately).
 */
const fetchGoogleCalendarEvents = async (accessToken, userId) => {
  console.log("Simulating Google Calendar API call...");
  // This is where a real fetch call to Google Calendar API would go:
  /*
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    const calendarEvents = data.items
      .filter(event => event.summary.toLowerCase().includes('ooo') || event.summary.toLowerCase().includes('vacation'))
      .map(event => ({
        userId,
        name: 'User Name from Google', // You'd need to get the name from the user profile
        startDate: event.start.date || event.start.dateTime,
        endDate: event.end.date || event.end.dateTime,
        type: 'Google Sync',
        coverageNotes: 'Synced from Google Calendar.',
        status: 'Approved',
        timestamp: new Date().getTime()
      }));

    // Logic to update Firestore with these events would follow here.
    return calendarEvents;
  } catch (error) {
    console.error("Google Calendar API Error:", error);
    return [];
  }
  */

  // Mock return data for demonstration:
  return new Promise(resolve => {
    setTimeout(() => resolve([
      {
        userId: userId,
        name: 'Mock Sync (Your Name)',
        startDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0], // 30 days from now
        endDate: new Date(Date.now() + 86400000 * 33).toISOString().split('T')[0],
        type: 'Google Sync',
        coverageNotes: 'This OOO was pulled from your mock Google Calendar.',
        status: 'Approved',
        timestamp: new Date().getTime()
      }
    ]), 1000);
  });
};

// ==============================================================================
// 4. COMPONENTS
// ==============================================================================

/**
 * Component to display the aggregated vacation schedule by month.
 */
const CalendarView = React.memo(({ vacations, userId }) => {
  const currentYear = new Date().getFullYear();

  // Aggregate OOO requests by month
  const groupedByMonth = useMemo(() => {
    const months = Array.from({ length: 12 }, () => ({})); // Array of 12 empty objects
    vacations
      .filter(v => v.status === 'Approved')
      .forEach(v => {
        // Simple logic for sorting: if a request starts this year
        const start = new Date(v.startDate);
        if (start.getFullYear() === currentYear) {
          const monthIndex = start.getMonth();
          const personKey = v.name || 'Unknown User';
          if (!months[monthIndex][personKey]) {
            months[monthIndex][personKey] = [];
          }
          months[monthIndex][personKey].push({
            id: v.id,
            start: formatDate(v.startDate),
            end: formatDate(v.endDate),
            isMine: v.userId === userId,
            coverage: v.coverageNotes,
            type: v.type,
          });
        }
      });
    return months;
  }, [vacations, userId, currentYear]);

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <h2 className="col-span-full text-2xl font-bold text-gray-800 mb-4">Vacation Calendar ({currentYear})</h2>
      {groupedByMonth.map((monthData, index) => {
        const monthName = getMonthName(index);
        const hasOOO = Object.keys(monthData).length > 0;

        return (
          <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
            <h3 className="text-xl font-semibold mb-3 text-indigo-700 border-b pb-2">{monthName}</h3>
            {!hasOOO && (
              <p className="text-gray-500 italic text-sm">No scheduled time off.</p>
            )}
            {hasOOO && (
              <ul className="space-y-3">
                {Object.entries(monthData).map(([name, days]) => (
                  <li key={name} className="p-2 border-l-4 rounded-md" style={{ borderColor: days[0].isMine ? '#10B981' : '#6366F1', backgroundColor: days[0].isMine ? '#ECFDF5' : '#EEF2FF' }}>
                    <div className="font-medium text-sm text-gray-800 flex justify-between">
                      <span>{name} {days[0].isMine && <span className="text-xs bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded-full">You</span>}</span>
                      <span className="text-xs text-gray-500">{days.length} request(s)</span>
                    </div>
                    {days.map((day, i) => (
                      <div key={i} className="text-xs text-gray-600 mt-1">
                        <span className="font-mono bg-white px-1 rounded">{day.start} - {day.end}</span>
                        <div className="mt-1 text-gray-700 italic text-xs truncate">
                          Coverage: {day.coverage || 'None specified.'}
                        </div>
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
});

/**
 * Component for submitting and managing OOO requests.
 */
const OOOForm = ({ db, userId, collectionPath, currentUserInfo, setCurrentUserInfo, vacations }) => {
  const [name, setName] = useState(currentUserInfo.name || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverageNotes, setCoverageNotes] = useState('');
  const [type, setType] = useState('OOO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Filter for the current user's requests
  const myRequests = useMemo(() => {
    return vacations.filter(v => v.userId === userId).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }, [vacations, userId]);

  // Keep user name synced with form and global state
  useEffect(() => {
    if (currentUserInfo.name) {
      setName(currentUserInfo.name);
    }
  }, [currentUserInfo.name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) {
      setMessage('Please fill in Name, Start Date, and End Date.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setMessage('Start Date cannot be after End Date.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    try {
      // 1. Save the new request
      await addDoc(collection(db, collectionPath), {
        userId,
        name: name.trim(),
        startDate,
        endDate,
        type,
        coverageNotes: coverageNotes.trim() || 'No specific coverage notes provided.',
        status: 'Approved', // Simplified: Auto-approve for internal tracking
        createdAt: serverTimestamp(),
      });

      // 2. Update the user's name in global state if it was empty
      if (!currentUserInfo.name || currentUserInfo.name !== name.trim()) {
        setCurrentUserInfo(prev => ({ ...prev, name: name.trim() }));
      }

      // 3. Reset form
      setStartDate('');
      setEndDate('');
      setCoverageNotes('');
      setType('OOO');
      setMessage('Request submitted successfully!');

    } catch (error) {
      console.error('Error submitting request:', error);
      setMessage('Failed to submit request. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!db || !window.confirm('Are you sure you want to delete this request?')) return;
    try {
      await deleteDoc(doc(db, collectionPath, id));
      setMessage('Request deleted.');
    } catch (error) {
      console.error('Error deleting request:', error);
      setMessage('Failed to delete request.');
    }
  };

  return (
    <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Section (lg:col-span-1) */}
      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-fit">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Submit New Request</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col">
            <label htmlFor="name" className="text-sm font-medium text-gray-700">Your Name (for the calendar)</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              required
              placeholder="e.g., Jane Doe"
            />
          </div>
          <div className="flex space-x-4">
            <div className="flex flex-col flex-1">
              <label htmlFor="startDate" className="text-sm font-medium text-gray-700">Start Date</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div className="flex flex-col flex-1">
              <label htmlFor="endDate" className="text-sm font-medium text-gray-700">End Date</label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label htmlFor="type" className="text-sm font-medium text-gray-700">Time Off Type</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="OOO">Out of Office (OOO)</option>
              <option value="Remote">Remote Work</option>
              <option value="Sick">Sick Day</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="coverageNotes" className="text-sm font-medium text-gray-700">Coverage & Handoff Notes</label>
            <textarea
              id="coverageNotes"
              value={coverageNotes}
              onChange={(e) => setCoverageNotes(e.target.value)}
              rows="3"
              className="mt-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Check my email for priority filter. Brian is covering all Level 1 support tickets."
            ></textarea>
            <p className="text-xs text-gray-500 mt-1">This is the work handoff shared while you are away.</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
              isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Add Request'}
          </button>
          {message && (
            <div className={`p-3 rounded-md text-sm ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}
        </form>
      </div>

      {/* My Requests Section (lg:col-span-2) */}
      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">My Current Requests ({myRequests.length})</h2>
        <p className="text-sm text-gray-500 mb-4">Your requests are automatically 'Approved' for team visibility.</p>
        {myRequests.length === 0 ? (
          <p className="text-gray-500 italic">You have no upcoming time-off requests.</p>
        ) : (
          <ul className="space-y-4">
            {myRequests.map((req) => (
              <li key={req.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-indigo-600">
                      {req.type} | {formatDate(req.startDate)} - {formatDate(req.endDate)}
                    </p>
                    <p className="text-sm text-gray-800 mt-1 break-words">
                      <span className="font-medium">Coverage Notes:</span> {req.coverageNotes}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(req.id)}
                    className="ml-4 p-2 text-red-600 hover:text-red-800 transition-colors"
                    title="Delete Request"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V8z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ==============================================================================
// 5. MAIN APPLICATION COMPONENT
// ==============================================================================

const App = () => {
  const { db, auth, userId, isAuthReady } = useFirebaseSetup();
  const { vacations, isLoading, error } = useVacations(db, isAuthReady);

  const [tab, setTab] = useState('calendar'); // 'calendar' or 'request'
  const [currentUserInfo, setCurrentUserInfo] = useState({ name: '', isSynced: false });

  // Placeholder for user name discovery (e.g., fetching from an internal user service)
  useEffect(() => {
    if (userId && !currentUserInfo.name) {
      // In a real app, you might fetch user details here.
      // For now, we'll let the user fill it in and save it to the session/state.
      console.log(`User ID: ${userId} is ready.`);
    }
  }, [userId, currentUserInfo.name]);


  // Placeholder for initial Google Calendar sync (Only runs once)
  // This is where you would prompt the user for Calendar access token in a real app.
  useEffect(() => {
    if (userId && !currentUserInfo.isSynced) {
        console.log("Simulating initial Google Calendar sync...");
        // In a real app, you'd get the accessToken after OAuth flow.
        const mockAccessToken = 'YOUR_GOOGLE_ACCESS_TOKEN_HERE';

        // NOTE: In a real environment, you should only call this if you have a valid token.
        // fetchGoogleCalendarEvents(mockAccessToken, userId).then(events => {
        //    if (events.length > 0) {
        //       console.log("Google Calendar events retrieved:", events);
        //       // Logic to merge/add events to Firestore would go here.
        //    }
        // });

        setCurrentUserInfo(prev => ({ ...prev, isSynced: true }));
    }
  }, [userId, currentUserInfo.isSynced]);


  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-xl text-indigo-600 font-medium">Loading Application...</div>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-red-600 bg-red-50">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-indigo-700 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Team OOO Tracker
          </h1>
          <div className="text-sm text-gray-500">
            User ID: <span className="font-mono text-xs bg-gray-100 p-1 rounded">{userId}</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setTab('calendar')}
              className={`py-4 px-1 text-sm font-medium transition-colors ${
                tab === 'calendar'
                  ? 'border-indigo-500 text-indigo-600 border-b-2'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Calendar View {isLoading && <span className="animate-spin inline-block ml-1">...</span>}
            </button>
            <button
              onClick={() => setTab('request')}
              className={`py-4 px-1 text-sm font-medium transition-colors ${
                tab === 'request'
                  ? 'border-indigo-500 text-indigo-600 border-b-2'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Requests & Coverage
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {tab === 'calendar' && (
          <CalendarView vacations={vacations} userId={userId} />
        )}
        {tab === 'request' && (
          <OOOForm
            db={db}
            userId={userId}
            collectionPath={`artifacts/${appId}/public/data/vacations`}
            currentUserInfo={currentUserInfo}
            setCurrentUserInfo={setCurrentUserInfo}
            vacations={vacations}
          />
        )}
      </main>
    </div>
  );
};

export default App;
