import { MaskedInput, type MaskedInputProps } from "./MaskedInput";
import { CreditCardIcon } from "../icons";

export type CreditCardInputProps = Omit<MaskedInputProps, "mask">;

/** 16-digit card number field: "4242 __ __ __ __" as you type. */
export function CreditCardInput({ leadingIcon = <CreditCardIcon size={16} />, ...rest }: CreditCardInputProps) {
  return <MaskedInput mask="#### #### #### ####" inputMode="numeric" leadingIcon={leadingIcon} {...rest} />;
}
