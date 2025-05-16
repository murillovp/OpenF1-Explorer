import { useState, useEffect } from 'react';

function App() {
  const [year, setYear] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // New state for selection
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [lapTimes, setLapTimes] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [loadingLaps, setLoadingLaps] = useState(false);
  const [stints, setStints] = useState([]);

  const availableYears = [2022, 2023, 2024, 2025];

  useEffect(() => {
    setSelectedEvent(null);
    setSelectedSession(null);
    setSelectedDriver(null);
    setLapTimes([]);
    setDrivers([]);
    if (year) {
      setLoading(true);
      fetch(`https://api.openf1.org/v1/sessions?year=${year}`)
        .then((res) => res.json())
        .then((data) => {
          setSessions(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [year]);

  // Group sessions by event (circuit + earliest date)
  const groupSessionsByEvent = (sessions) => {
    const events = {};
    sessions.forEach((session) => {
      const circuit = session.circuit_short_name || session.meeting_name || "Unknown Circuit";
      if (!events[circuit]) events[circuit] = [];
      events[circuit].push(session);
    });
    return Object.entries(events)
      .map(([circuit, sessions]) => {
        const sortedSessions = sessions.sort(
          (a, b) => new Date(a.date_start) - new Date(b.date_start)
        );
        const eventDate = new Date(sortedSessions[0].date_start);
        const eventDateStr = `${eventDate.getFullYear()}/${String(eventDate.getMonth() + 1).padStart(2, '0')}/${String(eventDate.getDate()).padStart(2, '0')}`;
        return {
          eventKey: `${circuit}-${eventDateStr}`,
          eventTitle: `${circuit} - ${eventDateStr}`,
          sessions: sortedSessions,
        };
      })
      .sort((a, b) => new Date(a.sessions[0].date_start) - new Date(b.sessions[0].date_start));
  };

  // Fetch drivers for a session
  const fetchDrivers = (sessionKey) => {
    setLoadingDrivers(true);
    fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`)
      .then((res) => res.json())
      .then((data) => {
        setDrivers(data);
        setLoadingDrivers(false);
      })
      .catch(() => setLoadingDrivers(false));
  };

  // Fetch lap times for a driver in a session
  const fetchLapTimes = (sessionKey, driverNumber) => {
    setLoadingLaps(true);
    fetch(`https://api.openf1.org/v1/laps?session_key=${sessionKey}&driver_number=${driverNumber}`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Lap times API response:", data); // <-- Add this line
        setLapTimes(data);
        setLoadingLaps(false);
      })
      .catch(() => setLoadingLaps(false));
  };

  // Fetch stints for a driver in a session
  const fetchStints = (sessionKey, driverNumber) => {
    fetch(`https://api.openf1.org/v1/stints?session_key=${sessionKey}&driver_number=${driverNumber}`)
      .then((res) => res.json())
      .then((data) => setStints(data))
      .catch(() => setStints([]));
  };

  // Add this helper function inside your component
  const formatLapTime = (lap) => {
    if (lap.lap_duration) return lap.lap_duration;
    if (lap.lap_time) return lap.lap_time;
    if (lap.milliseconds) {
      const ms = lap.milliseconds % 1000;
      const totalSeconds = Math.floor(lap.milliseconds / 1000);
      const s = totalSeconds % 60;
      const m = Math.floor(totalSeconds / 60);
      return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    return "No time";
  };

  // Helper to find stint for a lap
  const getStintForLap = (lapNumber) => {
    // Find the stint where lapNumber is between lap_start and lap_end (inclusive)
    return stints.find(stint =>
      lapNumber >= stint.lap_start && lapNumber <= stint.lap_end
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>OpenF1 Explorer</h1>
      <h2>Select a Year</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {availableYears.map((yr) => (
          <button key={yr} onClick={() => setYear(yr)}>
            {yr}
          </button>
        ))}
      </div>

      {loading && <p>Loading events...</p>}

      {!loading && year && (
        <>
          <h2>Events in {year}</h2>
          {!selectedEvent && groupSessionsByEvent(sessions).map((event) => (
            <div key={event.eventKey} style={{ marginBottom: '20px' }}>
              <h3 style={{ cursor: 'pointer', color: 'blue' }}
                  onClick={() => setSelectedEvent(event)}>
                {event.eventTitle}
              </h3>
            </div>
          ))}

          {/* Show sessions for selected event */}
          {selectedEvent && !selectedSession && (
            <div>
              <button onClick={() => setSelectedEvent(null)}>Back to Events</button>
              <h3>{selectedEvent.eventTitle}</h3>
              <ul>
                {selectedEvent.sessions.map((sesh) => (
                  <li key={sesh.session_key}>
                    <span style={{ cursor: 'pointer', color: 'blue' }}
                          onClick={() => {
                            setSelectedSession(sesh);
                            fetchDrivers(sesh.session_key);
                          }}>
                      {sesh.session_name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Show drivers for selected session */}
          {selectedSession && !selectedDriver && (
            <div>
              <button onClick={() => {
                setSelectedSession(null);
                setDrivers([]);
              }}>Back to Sessions</button>
              <h3>{selectedSession.session_name}</h3>
              {loadingDrivers && <p>Loading drivers...</p>}
              <ul>
                {drivers.map((driver) => (
                  <li key={driver.driver_number}>
                    <span style={{ cursor: 'pointer', color: 'blue' }}
                          onClick={() => {
                            setSelectedDriver(driver);
                            fetchLapTimes(selectedSession.session_key, driver.driver_number);
                            fetchStints(selectedSession.session_key, driver.driver_number);
                          }}>
                      {driver.full_name || driver.name || `Driver #${driver.driver_number}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Show lap times for selected driver */}
          {selectedDriver && (
            <div>
              <button onClick={() => {
                setSelectedDriver(null);
                setLapTimes([]);
                setStints([]);
              }}>Back to Drivers</button>
              <h3>
                Lap Times for {selectedDriver.full_name || selectedDriver.name || `Driver #${selectedDriver.driver_number}`}
              </h3>
              {loadingLaps && <p>Loading lap times...</p>}
              <table border="1" cellPadding="5" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Lap</th>
                    <th>Lap Time</th>
                    <th>Tyre (Compound)</th>
                    <th>Tyre Age (Lap End)</th>
                  </tr>
                </thead>
                <tbody>
                  {lapTimes.map((lap, idx) => {
                    const stint = getStintForLap(lap.lap_number);
                    let tyreAge = 'N/A';
                    if (stint) {
                      // Calculate tyre age for this lap
                      tyreAge = stint.tyre_age_at_start + (lap.lap_number - stint.lap_start);
                    }
                    return (
                      <tr key={lap.lap_number || idx}>
                        <td>{lap.lap_number || idx + 1}</td>
                        <td>{formatLapTime(lap)}</td>
                        <td>{stint ? stint.compound : 'N/A'}</td>
                        <td>{tyreAge}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
