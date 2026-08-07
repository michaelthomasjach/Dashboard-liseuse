import { IconBase, type IconProps } from "./IconBase";
import "./icons.css";

/** Icons that support an optional idle-loop animation (sun spinning, rain falling…).
 *  Off by default — pass `animated` on the one instance you want to bring to life. */
export interface AnimatedIconProps extends IconProps {
  animated?: boolean;
}

export const SunIcon = ({ animated, className, ...props }: AnimatedIconProps) => (
  <IconBase className={[animated && "lq-icon-spin", className].filter(Boolean).join(" ") || undefined} {...props}>
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.55 1.55M18.25 18.25l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.55-1.55M18.25 5.75l1.55-1.55" />
  </IconBase>
);

export const MoonIcon = ({ animated, className, ...props }: AnimatedIconProps) => (
  <IconBase className={[animated && "lq-icon-pulse", className].filter(Boolean).join(" ") || undefined} {...props}>
    <path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z" />
  </IconBase>
);

export const CloudIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M7 18h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5 1.6A3.5 3.5 0 0 0 7 18Z" />
  </IconBase>
);

export const PartlyCloudyIcon = ({ animated, ...props }: AnimatedIconProps) => (
  <IconBase {...props}>
    <g className={animated ? "lq-icon-spin" : undefined}>
      <circle cx="8" cy="8" r="3.2" />
      <path d="M8 2.8v1.6M3.4 8H5M8 12.6v-1M3.75 3.75l1.1 1.1M12.25 3.75l-1.1 1.1" />
    </g>
    <path d="M10 19h7.5a3.5 3.5 0 0 0 0-7 4.7 4.7 0 0 0-8.9 1.4A3 3 0 0 0 10 19Z" />
  </IconBase>
);

export const CloudRainIcon = ({ animated, ...props }: AnimatedIconProps) => (
  <IconBase {...props}>
    <path d="M6.5 15.5h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4 1.7A3.5 3.5 0 0 0 6.5 15.5Z" />
    <path className={animated ? "lq-icon-raindrop" : undefined} style={animated ? { animationDelay: "0ms" } : undefined} d="M8.5 18.5 7.5 20.5" />
    <path className={animated ? "lq-icon-raindrop" : undefined} style={animated ? { animationDelay: "220ms" } : undefined} d="M12.5 18.5l-1 2" />
    <path className={animated ? "lq-icon-raindrop" : undefined} style={animated ? { animationDelay: "440ms" } : undefined} d="M16.5 18.5l-1 2" />
  </IconBase>
);

export const WindIcon = ({ animated, className, ...props }: AnimatedIconProps) => (
  <IconBase className={[animated && "lq-icon-sway", className].filter(Boolean).join(" ") || undefined} {...props}>
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

export const ChevronDownIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M5.5 9 12 15.5 18.5 9" />
  </IconBase>
);

export const ChevronUpIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M5.5 15 12 8.5 18.5 15" />
  </IconBase>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M15 5.5 8.5 12 15 18.5" />
  </IconBase>
);

export const CheckIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M5 12.5 9.5 17 19 6.5" />
  </IconBase>
);

export const SearchIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M19 19l-4.3-4.3" />
  </IconBase>
);

export const EyeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </IconBase>
);

export const EyeOffIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M3.5 3.5l17 17" />
    <path d="M10.6 5.7A10.4 10.4 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a13.6 13.6 0 0 1-3.2 3.9M6.5 7.1C4 8.8 2.5 12 2.5 12S6 18.5 12 18.5a9.9 9.9 0 0 0 3-.5" />
    <path d="M9.9 10a3 3 0 0 0 4.1 4.1" />
  </IconBase>
);

export const UserIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </IconBase>
);

export const LockIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
    <path d="M7.5 10.5V7.5a4.5 4.5 0 0 1 9 0v3" />
  </IconBase>
);

export const CalendarIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </IconBase>
);

export const ErrorIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5" />
    <circle cx="12" cy="16.3" r="0.15" fill="currentColor" stroke="none" />
  </IconBase>
);

export const InfoIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <circle cx="12" cy="7.8" r="0.15" fill="currentColor" stroke="none" />
  </IconBase>
);

export const ArrowUpIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 19V5M6 10.5 12 5l6 5.5" />
  </IconBase>
);

export const ArrowDownIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 5v14M6 13.5 12 19l6-5.5" />
  </IconBase>
);

export const MenuIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
  </IconBase>
);

export const BellIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.5 5.2 1.5 5.7H4.5c0-.5 1.5-1.7 1.5-5.7Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </IconBase>
);

export const SettingsIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18 6l-1.5 1.5M7.5 16.5 6 18M18 18l-1.5-1.5M7.5 7.5 6 6" />
  </IconBase>
);

export const CreditCardIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
    <path d="M2.5 9.5h19M6 15h4" />
  </IconBase>
);

export const PhoneIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M5.5 4.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 4 5.6a1.5 1.5 0 0 1 1.5-1.1Z" />
  </IconBase>
);

export const RefreshIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4.5 12a7.5 7.5 0 0 1 12.6-5.5M19.5 12a7.5 7.5 0 0 1-12.6 5.5" />
    <path d="M17 3.5v3.5h-3.5M7 20.5V17h3.5" />
  </IconBase>
);

export const UploadCloudIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M7 18.5h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5 1.6A3.5 3.5 0 0 0 7 18.5Z" />
    <path d="M12 15.5v-6M9.2 12l2.8-2.8 2.8 2.8" />
  </IconBase>
);

export const FileIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M6.5 3.5h7l4 4v13a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" />
    <path d="M13.5 3.5v4h4" />
  </IconBase>
);

export const TrashIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4.5 7h15M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
    <path d="M6.5 7v12.5A1.5 1.5 0 0 0 8 21h8a1.5 1.5 0 0 0 1.5-1.5V7" />
    <path d="M10 11v6M14 11v6" />
  </IconBase>
);

export const FolderIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M3.5 6.5a1 1 0 0 1 1-1h4.7l1.6 2h8.7a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z" />
  </IconBase>
);

export const MaximizeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M9 3.5H4.5V8M15 3.5h4.5V8M9 20.5H4.5V16M15 20.5h4.5V16" />
  </IconBase>
);

export const MinimizeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4.5 8.5H9V4M19.5 8.5H15V4M4.5 15.5H9V20M19.5 15.5H15V20" />
  </IconBase>
);

export const StarIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8Z" />
  </IconBase>
);

export const ArrowRightIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </IconBase>
);

export const PlusIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 5v14M5 12h14" />
  </IconBase>
);

export const CopyIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="8.5" y="8.5" width="12" height="12" />
    <path d="M15.5 8.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h3.5" />
  </IconBase>
);
