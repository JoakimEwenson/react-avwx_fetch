import React from "react";
import apiCaller from "../controllers/apiCaller";
import { useEffect, useState } from "react";
import { useParams } from "react-router";

export default function MainPage() {
  const { urlStation } = useParams();
  const [stationId, setStationId] = useState(urlStation ? urlStation : null);
  const [requestTimestamp, setRequestTimestamp] = useState(0);
  const [timestamp, setTimestamp] = useState(urlStation ? new Date().getTime() : null);
  const [metar, setMetar] = useState(null);
  const [taf, setTaf] = useState(null);
  const [stationInfo, setStationInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const submitHandler = (event) => {
    event.preventDefault();
    var station = document.getElementById("station").value.trim().toUpperCase();
    if (station.length === 3 || station.length === 4) {
      setRequestTimestamp(new Date().getTime());
      if (station !== stationId) {
        window.history.pushState({}, null, `/${station}`);
      }
      setStationId(station);
    } else {
      setError("Check input.");
    }
  };

  const toInputUppercase = (e) => {
    e.target.value = ("" + e.target.value).toUpperCase();
  };

  function clearData() {
    setMetar(null);
    setTaf(null);
    setStationInfo(null);
    setTimestamp(null);
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

      // Clear old errors
      setError(null);

      // Check if response contains errors and if so, display them
      if (metarResponse && metarResponse.error) {
        setError(metarResponse.error);
      }
      if (tafResponse && tafResponse.error) {
        setError(tafResponse.error);
      }
      if (stationResponse && stationResponse.error) {
        setError(stationResponse.error);
      }

      // Fill the void
      metarResponse ? setMetar(metarResponse) : setMetar(null);
      tafResponse ? setTaf(tafResponse) : setTaf(null);
      stationResponse ? setStationInfo(stationResponse) : setStationInfo(null);
      setTimestamp(new Date().getTime());

      setIsLoading(false);
      if (metarResponse) {
        document.title = `WX ${metarResponse.station}`;
      }
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
  }, [stationId, requestTimestamp]);

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
                <h6 class="font-semibold text-xl text-center">Fetching data...</h6>
                <div className="loading">
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                </div>
                </>
              )}
              <div id="results">
                {stationInfo && (
                  <>
                    <p className="text-2xl font-semibold">
                      {stationInfo.name} ({stationInfo.icao} /{" "}
                      {stationInfo.iata !== null && stationInfo.iata !== undefined ? (
                        <>
                          <a
                            href={`https://flightradar24.com/data/airports/${stationInfo.iata.toLowerCase()}/departures`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {stationInfo.iata}
                          </a>
                        </>
                      ) : (
                        <>{stationInfo.iata}</>
                      )}
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
                {taf && (
                  <>
                    <h4 className="text-xl font-semibold mt-5">TAF</h4>
                    <div className="font-mono">{taf.raw}</div>
                  </>
                )}
                {timestamp !== null && (
                  <>
                    <p className="text-xs font-light mt-5">
                      Data fetched at {new Date(timestamp).toLocaleTimeString("sv-SE")} local device time
                    </p>
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
                  minLength="3"
                  maxLength="4"
                  placeholder="ICAO/IATA"
                  defaultValue={stationId}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  onInput={toInputUppercase}
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
      <p className="text-center text-xs text-gray-100">
        A small service created by <a href="https://ewenson.se">Joakim Ewenson</a>
      </p>
      <p className="text-center text-xs text-gray-100 mb-10">
        Data provided by <a href="https://avwx.rest">AVWX.rest</a> and icon by{" "}
        <a href="https://en.wikipedia.org/wiki/File:Circle-icons-weather.svg">Elegant Themes</a>
      </p>
    </div>
  );
}
