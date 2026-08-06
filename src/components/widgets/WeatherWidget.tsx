import type { ReactNode } from "react";
import { Panel } from "../primitives/Panel";
import "./WeatherWidget.css";

export interface WeatherForecastDay {
  id: string;
  label: string;
  icon: ReactNode;
  max: string;
  min: string;
}

export interface WeatherAlert {
  icon?: ReactNode;
  label: string;
}

export interface WeatherWidgetProps {
  icon: ReactNode;
  temperature: string;
  condition: string;
  min?: string;
  max?: string;
  /** e.g. "20 %" chance of rain. */
  precipitation?: string;
  precipitationIcon?: ReactNode;
  alert?: WeatherAlert;
  /** Forecast title, e.g. "PRÉVISION 5 JOURS · MÉTÉO-FRANCE". */
  forecastTitle?: ReactNode;
  forecast?: WeatherForecastDay[];
  className?: string;
}

/** Current conditions + optional alert banner + multi-day forecast strip. */
export function WeatherWidget({
  icon,
  temperature,
  condition,
  min,
  max,
  precipitation,
  precipitationIcon,
  alert,
  forecastTitle,
  forecast,
  className,
}: WeatherWidgetProps) {
  return (
    <Panel bare className={["lq-weather", className].filter(Boolean).join(" ")}>
      <div className="lq-weather__current">
        <span className="lq-weather__icon">{icon}</span>
        <div className="lq-weather__main">
          <span className="lq-weather__temp">{temperature}°</span>
          <span className="lq-weather__condition">{condition}</span>
          {(min || max || precipitation) && (
            <div className="lq-weather__range">
              {min && max && (
                <span>
                  {min}° / {max}°
                </span>
              )}
              {precipitation && (
                <span className="lq-weather__precip">
                  {precipitationIcon}
                  {precipitation}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {alert && (
        <div className="lq-weather__alert">
          {alert.icon}
          <span>{alert.label}</span>
        </div>
      )}

      {forecast && forecast.length > 0 && (
        <div className="lq-weather__forecast">
          {forecastTitle && <span className="lq-weather__forecast-title">{forecastTitle}</span>}
          <div className="lq-weather__forecast-row">
            {forecast.map((day) => (
              <div key={day.id} className="lq-weather__forecast-day">
                <span className="lq-weather__forecast-label">{day.label}</span>
                <span className="lq-weather__forecast-icon">{day.icon}</span>
                <span className="lq-weather__forecast-max">{day.max}°</span>
                <span className="lq-weather__forecast-min">{day.min}°</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
