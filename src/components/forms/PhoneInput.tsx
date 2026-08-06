import { MaskedInput, type MaskedInputProps } from "./MaskedInput";
import { PhoneIcon } from "../icons";

export interface PhoneInputProps extends Omit<MaskedInputProps, "mask"> {
  /** Digit grouping pattern. Default French mobile format "## ## ## ## ##". */
  mask?: string;
}

/** Phone number field, e.g. "06 __ __ __ __" as you type. */
export function PhoneInput({ mask = "## ## ## ## ##", leadingIcon = <PhoneIcon size={16} />, ...rest }: PhoneInputProps) {
  return <MaskedInput mask={mask} type="tel" leadingIcon={leadingIcon} {...rest} />;
}
