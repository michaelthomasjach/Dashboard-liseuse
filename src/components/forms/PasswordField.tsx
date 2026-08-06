import { forwardRef, useState } from "react";
import { TextField, type TextFieldProps } from "./TextField";
import { EyeIcon, EyeOffIcon, LockIcon } from "../icons";

export type PasswordFieldProps = Omit<TextFieldProps, "type" | "trailingIcon">;

/** TextField preconfigured for passwords: masked by default, with a show/hide toggle. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { leadingIcon = <LockIcon size={16} />, ...rest },
  ref
) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      ref={ref}
      type={visible ? "text" : "password"}
      leadingIcon={leadingIcon}
      trailingIcon={
        <button
          type="button"
          className="lq-field__icon-button"
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
