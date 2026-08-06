import type { ReactNode } from "react";
import { IconButton } from "../primitives/IconButton";
import { LevelGauge } from "../primitives/LevelGauge";
import { PlayIcon, PauseIcon, PrevTrackIcon, NextTrackIcon, SpeakerIcon } from "../icons";
import "./MusicPlayerWidget.css";

export interface MusicPlayerWidgetProps {
  /** Cover art URL. Omit and pass `coverFallback` for a placeholder. */
  cover?: string;
  coverFallback?: ReactNode;
  title: string;
  artist: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  /** 0-100. Omit to hide the volume row entirely. */
  volume?: number;
  className?: string;
}

/** Compact "now playing" card with transport controls and a volume gauge. */
export function MusicPlayerWidget({
  cover,
  coverFallback,
  title,
  artist,
  isPlaying,
  onPlayPause,
  onPrev,
  onNext,
  volume,
  className,
}: MusicPlayerWidgetProps) {
  return (
    <div className={["lq-music", className].filter(Boolean).join(" ")}>
      <div className="lq-music__track">
        <span className="lq-music__cover">
          {cover ? <img src={cover} alt="" /> : coverFallback}
        </span>
        <span className="lq-music__meta">
          <span className="lq-music__title">{title}</span>
          <span className="lq-music__artist">{artist}</span>
        </span>
      </div>

      <div className="lq-music__controls">
        <IconButton icon={<PrevTrackIcon />} ariaLabel="Piste précédente" onClick={onPrev} disabled={!onPrev} />
        <IconButton
          icon={isPlaying ? <PauseIcon /> : <PlayIcon />}
          ariaLabel={isPlaying ? "Pause" : "Lecture"}
          onClick={onPlayPause}
        />
        <IconButton icon={<NextTrackIcon />} ariaLabel="Piste suivante" onClick={onNext} disabled={!onNext} />
      </div>

      {volume !== undefined && (
        <div className="lq-music__volume">
          <IconButton icon={<SpeakerIcon />} ariaLabel="Volume" size="sm" disabled />
          <LevelGauge value={volume} segments={16} label={`${volume} %`} ariaLabel="Volume" />
        </div>
      )}
    </div>
  );
}
