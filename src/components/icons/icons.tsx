import { IconBase, type IconProps } from "./IconBase";

export const SunIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.55 1.55M18.25 18.25l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.55-1.55M18.25 5.75l1.55-1.55" />
  </IconBase>
);

export const MoonIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z" />
  </IconBase>
);

export const CloudIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M7 18h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5 1.6A3.5 3.5 0 0 0 7 18Z" />
  </IconBase>
);

export const PartlyCloudyIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="8" cy="8" r="3.2" />
    <path d="M8 2.8v1.6M3.4 8H5M8 12.6v-1M3.75 3.75l1.1 1.1M12.25 3.75l-1.1 1.1" />
    <path d="M10 19h7.5a3.5 3.5 0 0 0 0-7 4.7 4.7 0 0 0-8.9 1.4A3 3 0 0 0 10 19Z" />
  </IconBase>
);

export const CloudRainIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M6.5 15.5h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4 1.7A3.5 3.5 0 0 0 6.5 15.5Z" />
    <path d="M8.5 18.5 7.5 20.5M12.5 18.5l-1 2M16.5 18.5l-1 2" />
  </IconBase>
);

export const WindIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M3.5 8.5h11a2.6 2.6 0 1 0-2.4-3.6" />
    <path d="M3.5 13h14.8a2.6 2.6 0 1 1-2.4 3.6" />
    <path d="M3.5 17.3h8.2a2 2 0 1 1-1.8 2.8" />
  </IconBase>
);

export const AlertTriangleIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
    <path d="M12 9.5v4.4" />
    <circle cx="12" cy="16.8" r="0.15" fill="currentColor" stroke="none" />
  </IconBase>
);

export const SunriseIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 3v5" />
    <path d="M5.5 11.5 7.6 9.4M18.5 11.5l-2.1-2.1" />
    <circle cx="12" cy="15" r="3.6" />
    <path d="M3 19.5h18M2 15.5h2M20 15.5h2" />
  </IconBase>
);

export const SunsetIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 8V3" />
    <path d="M5.5 11.5 7.6 9.4M18.5 11.5l-2.1-2.1" />
    <circle cx="12" cy="15" r="3.6" />
    <path d="M3 19.5h18M2 15.5h2M20 15.5h2" />
  </IconBase>
);

export const BedIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M3 19v-8.5A2.5 2.5 0 0 1 5.5 8H14a3 3 0 0 1 3 3v1" />
    <path d="M3 15h18v4" />
    <path d="M6.5 12h4a1.5 1.5 0 0 0 0-3h-2A1.5 1.5 0 0 0 7 10.5" />
    <path d="M21 19v-3.2a1.8 1.8 0 0 0-1.8-1.8H10" />
  </IconBase>
);

export const LogoutIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M15 4.5H7A1.5 1.5 0 0 0 5.5 6v12A1.5 1.5 0 0 0 7 19.5h8" />
    <path d="M11 12h9.5M17 8.5l3.5 3.5-3.5 3.5" />
  </IconBase>
);

export const HomeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4 11 12 4l8 7" />
    <path d="M6 9.7V19a1 1 0 0 0 1 1h3.5v-5h3V20H17a1 1 0 0 0 1-1V9.7" />
  </IconBase>
);

export const PlayIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M7 4.8v14.4a1 1 0 0 0 1.53.85l11.4-7.2a1 1 0 0 0 0-1.7L8.53 3.95A1 1 0 0 0 7 4.8Z" />
  </IconBase>
);

export const PauseIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M7.5 4.5h2.8v15H7.5zM13.7 4.5h2.8v15h-2.8z" />
  </IconBase>
);

export const PrevTrackIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M18 5v14L8 12l10-7Z" />
    <path d="M6 5v14" />
  </IconBase>
);

export const NextTrackIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M6 5v14l10-7L6 5Z" />
    <path d="M18 5v14" />
  </IconBase>
);

export const SpeakerIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4 9.5h3.2L12 5.8v12.4l-4.8-3.7H4z" />
    <path d="M15.5 9a4 4 0 0 1 0 6" />
  </IconBase>
);

export const SolarPanelIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4 10 12 4l8 6" />
    <path d="M4 10h16l1.5 9H2.5L4 10Z" />
    <path d="M4 10 9 19M20 10l-5 9M12 4v15" />
  </IconBase>
);

export const BatteryIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="2.5" y="7" width="16" height="10" rx="2" />
    <path d="M21 10v4" />
    <path d="M6 9.5v5M9.5 9.5v5" />
  </IconBase>
);

export const GridPlugIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 2.5v6" />
    <path d="M7.5 6.5v-2M16.5 6.5v-2" />
    <path d="M5.5 8.5h13a1 1 0 0 1 1 1.1l-1 8.4a1 1 0 0 1-1 .9H6.5a1 1 0 0 1-1-.9l-1-8.4a1 1 0 0 1 1-1.1Z" />
  </IconBase>
);

export const ChevronRightIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M9 5.5 15.5 12 9 18.5" />
  </IconBase>
);

export const CloseIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </IconBase>
);
