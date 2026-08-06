import { useId, useRef, useState, type DragEvent } from "react";
import { UploadCloudIcon, FileIcon, TrashIcon, ErrorIcon } from "../icons";
import "./field.css";
import "./Dropzone.css";

export interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  /** Native `accept` attribute, e.g. "image/*,.pdf". */
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  disabled?: boolean;
  label?: string;
  hint?: string;
  error?: string;
  /** Currently selected files, rendered as a removable list below the drop area. Fully controlled by the caller. */
  files?: File[];
  onRemoveFile?: (index: number) => void;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Drag-and-drop file upload zone with click-to-browse fallback and an optional selected-files list. */
export function Dropzone({
  onFilesSelected,
  accept,
  multiple = true,
  maxSizeMB,
  disabled,
  label = "Glissez-déposez vos fichiers ici",
  hint,
  error,
  files,
  onRemoveFile,
  className,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  function acceptFiles(list: FileList | null) {
    if (!list) return;
    let picked = Array.from(list);
    if (maxSizeMB) picked = picked.filter((f) => f.size <= maxSizeMB * 1024 * 1024);
    if (!multiple) picked = picked.slice(0, 1);
    if (picked.length > 0) onFilesSelected(picked);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    acceptFiles(e.dataTransfer.files);
  }

  return (
    <div className={["lq-field", className].filter(Boolean).join(" ")}>
      {label && (
        <label htmlFor={inputId} className="lq-field__label">
          {label}
        </label>
      )}
      <div
        className={[
          "lq-dropzone",
          isDragging && "lq-dropzone--dragging",
          error && "lq-dropzone--error",
          disabled && "lq-dropzone--disabled",
        ]
          .filter(Boolean)
          .join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <UploadCloudIcon size={28} className="lq-dropzone__icon" />
        <span className="lq-dropzone__label">{isDragging ? "Déposez pour importer" : "Cliquez ou glissez un fichier"}</span>
        {hint && <span className="lq-dropzone__hint">{hint}</span>}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="lq-dropzone__input"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => acceptFiles(e.target.files)}
        />
      </div>

      {error && (
        <span className="lq-field__error">
          <ErrorIcon size={14} />
          {error}
        </span>
      )}

      {files && files.length > 0 && (
        <ul className="lq-dropzone__files">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="lq-dropzone__file">
              <FileIcon size={16} />
              <span className="lq-dropzone__file-name">{file.name}</span>
              <span className="lq-dropzone__file-size">{formatBytes(file.size)}</span>
              {onRemoveFile && (
                <button type="button" className="lq-field__icon-button" onClick={() => onRemoveFile(i)} aria-label={`Retirer ${file.name}`}>
                  <TrashIcon size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
