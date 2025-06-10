import React, { useEffect, useState } from 'react';
import { getWeather } from '@/service/WeatherApi';

function WeatherInfo({ location }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const data = await getWeather(location);
        setWeather(data);
      } catch (err) {
        setError('Failed to load weather data');
      } finally {
        setLoading(false);
      }
    };

    if (location) {
      fetchWeather();
    }
  }, [location]);

  if (loading) {
    return (
      <div className="animate-pulse bg-card rounded-lg p-4 flex items-center justify-center h-24">
        <div className="h-6 w-36 bg-muted rounded"></div>
      </div>
    );
  }

  if (error || !weather) {
    return null;
  }

  return (
    <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Current Weather</h3>
          <p className="text-sm text-muted-foreground">{weather.location.name}</p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <img 
            src={weather.current.condition.icon} 
            alt={weather.current.condition.text}
            className="w-12 h-12 sm:w-16 sm:h-16"
          />
          <div className="text-right">
            <p className="text-2xl sm:text-3xl font-bold text-foreground">
              {weather.current.temp_c}°C
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {weather.current.condition.text}
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 pt-4 border-t border-border">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">Humidity</p>
          <p className="text-base sm:text-lg font-medium text-foreground">
            {weather.current.humidity}%
          </p>
        </div>
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">Wind</p>
          <p className="text-base sm:text-lg font-medium text-foreground">
            {weather.current.wind_kph} km/h
          </p>
        </div>
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">Feels Like</p>
          <p className="text-base sm:text-lg font-medium text-foreground">
            {weather.current.feelslike_c}°C
          </p>
        </div>
      </div>
    </div>
  );
}

export default WeatherInfo;