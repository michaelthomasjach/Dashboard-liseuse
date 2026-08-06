import "./Avatar.css";

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: number;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Circular avatar: image if `src` is given, otherwise initials from `name`. */
export function Avatar({ name, src, size = 36, className }: AvatarProps) {
  return (
    <span
      className={["lq-avatar", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? <img src={src} alt={name ?? ""} /> : <span>{name ? initials(name) : "?"}</span>}
    </span>
  );
}
