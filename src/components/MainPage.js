import React from "react";
import apiCaller from "../controllers/apiCaller";
import { useEffect, useState } from "react";
import { useParams } from "react-router";

export default function MainPage() {
  const { urlStation } = useParams();
  const [stationId, setStationId] = useState(urlStation ? urlStation : null);
  const [timestamp] = useState(new Date().getTime());
  const [metar, setMetar] = useState(null);
  const [taf, setTaf] = useState(null);
  const [stationInfo, setStationInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const submitHandler = (event) => {
    event.preventDefault();
    var station = document.getElementById("station").value.toUpperCase();
    if (station.length === 3 || station.length === 4) {
      window.history.pushState({}, null, `/${station}`);
      setStationId(station);
    } else {
      setError("Check input.");
    }
  };

  function clearData() {
    setMetar(null);
    setTaf(null);
    setStationInfo(null);
  }

  useEffect(() => {
    // Set up interval for refreshing data
    var interval;

    // Function for fetching data from API
    async function fetchData() {
      setIsLoading(true);
      clearData();
      console.log("station:", stationId);

      // Fetch API data
      var metarResponse = await apiCaller("metar", stationId);
      var tafResponse = await apiCaller("taf", stationId);
      var stationResponse = await apiCaller("station", stationId);
      // Console log response for now
      console.log(metarResponse);
      console.log(tafResponse);
      console.log(stationResponse);

      // Write to page
      if (metarResponse.raw && tafResponse.raw && stationResponse.name) {
        setError(null);
        setMetar(metarResponse);
        setTaf(tafResponse);
        setStationInfo(stationResponse);
      } else {
        if (metarResponse.error) {
          setError(metarResponse.error);
        } else {
          setError("No response.");
        }
      }
      setIsLoading(false);
    }
    if (stationId !== null && stationId !== undefined) {
      // Fetch initial data
      fetchData();

      // Set up interval for refreshing data
      interval = setInterval(() => {
        fetchData();
      }, 1800000);
    }
    return () => clearInterval(interval);
  }, [stationId]);

  // Output
  return (
    <div className="container mx-auto">
      <div className="container p-2">
        {error && (
          <>
            <div className="bg-white rounded-xl my-10 p-5">
              <p className="text-center">{error}</p>
            </div>
          </>
        )}
        {error === null && stationId && (
          <>
            <div className="bg-white rounded-xl my-10 p-5">
              {isLoading && (
                <>
                  <p>Fetching data...</p>
                </>
              )}
              <div id="results">
                {stationInfo && (
                  <>
                    <p className="text-2xl font-semibold">
                      {stationInfo.name} ({stationInfo.icao} /{" "}
                      <a
                        href={`https://flightradar24.com/data/airports/${stationInfo.iata.toLowerCase()}/departures`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {stationInfo.iata}
                      </a>
                      )
                    </p>
                    <p className="font-light">
                      Elevation: {stationInfo.elevation_m} m / {stationInfo.elevation_ft} ft
                    </p>
                  </>
                )}
                {metar && (
                  <>
                    <h4 className="text-xl font-semibold mt-5">METAR</h4>
                    <div className="font-mono">{metar.raw}</div>
                  </>
                )}
                {taf !== null && (
                  <>
                    <h4 className="text-xl font-semibold mt-5">TAF</h4>
                    <div className="font-mono">{taf.raw}</div>
                  </>
                )}
                {timestamp !== null && (
                  <>
                    <p className="text-xs font-light mt-5">Data fetched at {new Date(timestamp).toLocaleTimeString("sv-SE")} local time.</p>
                  </>
                )}
              </div>
            </div>
          </>
        )}
        <div className="bg-white rounded-xl my-10 p-5">
          <h1 className="text-4xl">AVWX Fetch</h1>
          <form onSubmit={submitHandler}>
            <div className="flex flex-wrap flex-row xs:flex-col content-evenly mt-5">
              <div className="flex-grow flex-shrink m-2">
                <input
                  className="bg-gray-100 rounded w-full px-4 py-2 text-center font-semibold"
                  type="text"
                  id="station"
                  maxLength="4"
                  placeholder="ICAO/IATA"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  autoFocus
                  required
                />
              </div>
              <div className="flex-grow flex-shrink m-2">
                <button className="bg-yellow-500 rounded w-full text-white font-semibold px-4 py-2" type="submit">
                  Fetch data
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
