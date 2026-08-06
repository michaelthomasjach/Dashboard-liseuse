import { MaskedInput, type MaskedInputProps } from "./MaskedInput";
import { CalendarIcon } from "../icons";

export interface DateInputProps extends Omit<MaskedInputProps, "mask"> {
  /** Default "##/##/####" (jj/mm/aaaa). */
  mask?: string;
}

/** Typed date field (as opposed to the calendar popup `DatePicker`): "12/__/____" as you type. */
export function DateInput({ mask = "##/##/####", leadingIcon = <CalendarIcon size={16} />, ...rest }: DateInputProps) {
  return <MaskedInput mask={mask} inputMode="numeric" leadingIcon={leadingIcon} {...rest} />;
}
