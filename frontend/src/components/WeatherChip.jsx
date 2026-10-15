function WeatherSymbol({ code }) {
  const clear = code === 0 || code === 1
  const snow = [71, 73, 75, 77, 85, 86].includes(code)
  const rain = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)
  const storm = [95, 96, 99].includes(code)
  const fog = code === 45 || code === 48
  const cloudy = code === 2 || code === 3

  return (
    <svg className="weather-symbol" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {clear ? (
        <>
          <circle cx="16" cy="16" r="6" />
          <path d="M16 3v3m0 20v3M3 16h3m20 0h3M7 7l2 2m14 14 2 2M7 25l2-2M23 9l2-2" />
        </>
      ) : fog ? (
        <path d="M5 10h22M8 16h16M5 22h22" />
      ) : cloudy || rain || snow || storm ? (
        <>
          <path d="M8 21a5 5 0 0 1-1-10 8 8 0 0 1 15-1 5.5 5.5 0 0 1 2 11H8Z" />
          {rain && <path d="m10 25-1 3m8-3-1 3m8-3-1 3" />}
          {snow && <path d="M10 25v4m-2-2h4m10-2v4m-2-2h4" />}
          {storm && <path d="m17 21-4 5h5l-3 5" />}
        </>
      ) : (
        <><circle cx="16" cy="16" r="11" /><path d="M11 16h10" /></>
      )}
    </svg>
  )
}

function WeatherChip({ weather, date }) {
  return (
    <section className="entry-weather" aria-label={`Weather on ${date}`}>
      <div className="weather-summary">
        <span className="weather-symbol-frame"><WeatherSymbol code={weather.code} /></span>
        <div>
          <p className="weather-caption">Weather from this day</p>
          <p className="weather-condition">{weather.condition}</p>
        </div>
      </div>
      <div className="weather-readings">
        <p className="weather-temperature"><span><strong>{weather.temperatureMax}°C</strong> high</span><span><strong>{weather.temperatureMin}°C</strong> low</span></p>
        <p className="weather-precipitation">{weather.precipitation} mm precipitation</p>
      </div>
      <small className="weather-source">Weather saved from {weather.source}</small>
    </section>
  )
}

export default WeatherChip
