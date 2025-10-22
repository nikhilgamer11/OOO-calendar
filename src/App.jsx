import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';

// --- GLOBAL VARIABLES (Provided by the Canvas Environment) ---
// These variables are required for Firebase to connect and authenticate.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
// --- END GLOBAL VARIABLES ---

// Utility function to format dates nicely
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Hook to manage Firebase services and authentication state
const useFirebase = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Object.keys(firebaseConfig).length) {
      console.error("Firebase config is missing. Cannot initialize.");
      setLoading(false);
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authService = getAuth(app);

      setDb(firestore);
      setAuth(authService);

      // Authenticate user
      const authenticate = async (auth) => {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      };

      authenticate(authService).catch(error => {
        console.error("Firebase Auth Error:", error);
      });

      // Set up auth state observer
      const unsubscribe = onAuthStateChanged(authService, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          // Fallback for unauthenticated state (shouldn't happen with our setup)
          setUserId(crypto.randomUUID());
        }
        setLoading(false);
      });

      return () => unsubscribe();

    } catch (e) {
      console.error("Error initializing Firebase:", e);
      setLoading(false);
    }
  }, []);

  return { db, auth, userId, loading };
};

// Hook to fetch and manage real-time vacation data
const useVacations = (db, userId) => {
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !userId) return;

    // Data path for shared/public data
    const collectionPath = `/artifacts/${appId}/public/data/vacation_requests`;
    const q = query(collection(db, collectionPath), orderBy('startDate'));

    setLoading(true);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore Timestamps to strings if they exist
          startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString().split('T')[0] : data.startDate,
          endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString().split('T')[0] : data.endDate,
        };
      });
      setVacations(requests);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching vacations:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, userId]);

  // Grouping requests by month for the calendar view
  const groupedVacations = useMemo(() => {
    const groups = {};
    vacations.forEach(v => {
      if (v.startDate) {
        // Use a simple YYYY-MM key for grouping
        const monthKey = v.startDate.substring(0, 7); 
        if (!groups[monthKey]) {
          groups[monthKey] = [];
        }
        groups[monthKey].push(v);
      }
    });
    // Sort by date key to ensure months are always in order
    return Object.keys(groups).sort().reduce((obj, key) => {
      // Sort requests within the month by start date
      groups[key].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      obj[key] = groups[key];
      return obj;
    }, {});
  }, [vacations]);

  return { vacations: groupedVacations, loading };
};


// --- COMPONENTS ---

// 1. Component for submitting a new OOO request
const OOOForm = ({ db, userId, userName }) => {
  const [formData, setFormData] = useState({
    name: userName,
    startDate: '',
    endDate: '',
    coverageNotes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Update form data and keep the name field tied to the current user's name
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !db || !userId) return;

    if (!formData.name || !formData.startDate || !formData.endDate || !formData.coverageNotes) {
      setMessage('Please fill in all fields.');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
        setMessage('Start date must be before or the same as the end date.');
        return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const collectionPath = `/artifacts/${appId}/public/data/vacation_requests`;
      await addDoc(collection(db, collectionPath), {
        ...formData,
        userId: userId, // Record who made the request
        status: 'Approved', // Simplified: assume immediate approval for this demo
        startDate: new Date(formData.startDate), // Save as Firestore Timestamp
        endDate: new Date(formData.endDate),   // Save as Firestore Timestamp
        createdAt: serverTimestamp(),
      });
      setMessage('Vacation request submitted successfully! It is now visible to the team.');
      setFormData({ // Reset form while keeping the name field
        name: userName,
        startDate: '',
        endDate: '',
        coverageNotes: '',
      });
    } catch (error) {
      console.error("Error adding document: ", error);
      setMessage('Failed to submit request. Check console for details.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(''), 5000); // Clear message after 5 seconds
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 h-full">
      <h2 className="text-2xl font-bold text-indigo-700 mb-4 border-b pb-2">Submit Time Off Request</h2>
      <p className="text-sm text-gray-600 mb-4">Current User ID: <span className="font-mono text-xs bg-gray-100 p-1 rounded">{userId}</span></p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name (Read-Only based on current user) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Your Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 bg-gray-50 focus:border-indigo-500"
            required
            readOnly // Prevent user from changing their user ID's name
          />
        </div>

        {/* Start Date */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          />
        </div>

        {/* End Date */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          />
        </div>

        {/* Coverage Notes (Replaces Spreadsheet Tab) */}
        <div>
          <label htmlFor="coverageNotes" className="block text-sm font-medium text-gray-700">Coverage & Handoff Notes</label>
          <textarea
            id="coverageNotes"
            name="coverageNotes"
            rows="4"
            value={formData.coverageNotes}
            onChange={handleChange}
            placeholder="e.g., Contact Mike for critical support. The Q3 report is on the shared drive."
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition duration-150 ${
            isSubmitting
              ? 'bg-indigo-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}
    </div>
  );
};


// 2. Component for the calendar view
const CalendarView = ({ groupedVacations, loading }) => {
    // Utility to convert YYYY-MM to Month Name YYYY
    const formatMonthKey = (key) => {
        const [year, month] = key.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    if (loading) {
        return <div className="text-center p-8 text-indigo-600">Loading team calendar...</div>;
    }

    const monthKeys = Object.keys(groupedVacations);

    if (monthKeys.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-lg border border-indigo-100">
                <p>No vacation requests found yet. Be the first to submit one!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {monthKeys.map(monthKey => (
                <div key={monthKey} className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden">
                    {/* Month Header */}
                    <div className="bg-indigo-50 p-4 border-b border-indigo-200">
                        <h3 className="text-xl font-semibold text-indigo-800">{formatMonthKey(monthKey)}</h3>
                    </div>

                    {/* Request List */}
                    <div className="divide-y divide-gray-100">
                        {groupedVacations[monthKey].map(request => (
                            <div key={request.id} className="p-4 hover:bg-gray-50 transition duration-100">
                                <div className="flex justify-between items-center mb-1">
                                    {/* Name and Dates */}
                                    <div className="text-lg font-bold text-gray-900 flex items-center">
                                        <span className="h-3 w-3 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
                                        {request.name} (OOO)
                                    </div>
                                    <div className="text-sm font-medium text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                                        {formatDate(request.startDate)} to {formatDate(request.endDate)}
                                    </div>
                                </div>
                                
                                {/* Coverage Details */}
                                <div className="mt-2 p-3 bg-gray-100 rounded-lg text-sm text-gray-700">
                                    <span className="font-semibold text-gray-800">Coverage Notes:</span> {request.coverageNotes}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// 3. (Mock) Component for Google Calendar Sync
const GoogleCalendarMock = () => {
    const fetchGoogleCalendarEvents = () => {
        // --- REAL-WORLD GOOGLE CALENDAR INTEGRATION POINT ---
        // In a deployed application, this function would:
        // 1. Check for a Google OAuth token.
        // 2. If no token, initiate the OAuth sign-in flow (User grants permission).
        // 3. Call the Google Calendar API (events:list) to fetch "Out of Office" events.
        // 4. Transform the API response (event start/end/summary) into the format needed for Firestore.
        // 5. Save the events to the '/vacation_requests' Firestore collection.
        // ---------------------------------------------------
        alert('This button is ready for Google Calendar API integration! Currently, please use the form to submit time off.');
    };

    return (
        <div className="p-4 bg-yellow-50 rounded-lg shadow border border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-2">Google Calendar Integration</h4>
            <p className="text-sm text-yellow-700 mb-3">The app is set up for manual entry. For automatic sync, click below:</p>
            <button
                onClick={fetchGoogleCalendarEvents}
                className="w-full py-2 px-4 rounded-lg shadow-md text-sm font-medium text-yellow-900 transition duration-150 bg-yellow-300 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
                Connect & Sync from Google Calendar (Mock)
            </button>
        </div>
    );
};


// 4. Main Application Component
export default function App() {
  const { db, userId, loading } = useFirebase();
  const { vacations, loading: loadingVacations } = useVacations(db, userId);
  
  // Simple state to hold a name for the form (can be expanded to pull from a profile store)
  const [userName, setUserName] = useState('User ' + (userId || 'Unknown').substring(0, 4));

  useEffect(() => {
      if (userId && userName.startsWith('User ')) {
          // Update the mock name once we have a confirmed user ID
          setUserName('Team Member ' + userId.substring(0, 4));
      }
  }, [userId, userName]);


  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-lg font-semibold text-indigo-600 p-8 rounded-xl shadow-md bg-white">
                Initializing application and authentication...
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-indigo-800 tracking-tight">Team OOO & Coverage Tracker</h1>
        <p className="mt-1 text-gray-500">Real-time vacation visibility powered by Firebase.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form and Tools */}
        <div className="lg:col-span-1 space-y-6">
            <GoogleCalendarMock />
            <OOOForm 
                db={db} 
                userId={userId} 
                userName={userName} 
            />
        </div>

        {/* Right Column: Calendar View */}
        <div className="lg:col-span-2">
            <h2 className="text-3xl font-bold text-gray-700 mb-4 tracking-tight">Team Calendar View</h2>
            {loadingVacations ? (
                <div className="text-center p-8 text-indigo-600 bg-white rounded-xl shadow-lg border border-indigo-100">Loading calendar data...</div>
            ) : (
                <CalendarView 
                    groupedVacations={vacations} 
                    loading={loadingVacations} 
                />
            )}
        </div>
      </div>
      
      <footer className="mt-12 text-center text-sm text-gray-400 border-t pt-4">
        Powered by React and Google Firestore.
      </footer>
    </div>
  );
}
