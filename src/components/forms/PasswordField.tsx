import { forwardRef, useState } from "react";
import { TextField, type TextFieldProps } from "./TextField";
import { EyeIcon, EyeOffIcon, LockIcon } from "../icons";

export type PasswordFieldProps = Omit<TextFieldProps, "type" | "trailingIcon">;

/** TextField preconfigured for passwords: masked by default, with a show/hide toggle. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { leadingIcon = <LockIcon size={16} />, disabled, ...rest },
  ref
) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      ref={ref}
      type={visible ? "text" : "password"}
      leadingIcon={leadingIcon}
      disabled={disabled}
      trailingIcon={
        <button
          type="button"
          className="lq-field__icon-button"
          disabled={disabled}
          // Keep focus on the input across the click instead of stealing it,
          // so toggling visibility doesn't jump the caret or close a mobile keyboard.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {visible ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
        </button>
      }
      {...rest}
    />
  );
});
