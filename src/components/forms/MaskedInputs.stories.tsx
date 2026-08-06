import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { MaskedInput } from "./MaskedInput";
import { PhoneInput } from "./PhoneInput";
import { CreditCardInput } from "./CreditCardInput";
import { DateInput } from "./DateInput";

const meta: Meta = {
  title: "Forms/Masked inputs",
};
export default meta;
type Story = StoryObj;

export const Phone: Story = {
  render: () => {
    const [value, setValue] = useState("0612345678");
    return (
      <div style={{ maxWidth: 280 }}>
        <PhoneInput label="Téléphone" value={value} onChange={setValue} />
      </div>
    );
  },
};

export const CreditCard: Story = {
  render: () => {
    const [value, setValue] = useState("4242");
    return (
      <div style={{ maxWidth: 280 }}>
        <CreditCardInput label="Numéro de carte" value={value} onChange={setValue} />
      </div>
    );
  },
};

export const DateOfBirth: Story = {
  name: "Date (jj/mm/aaaa)",
  render: () => {
    const [value, setValue] = useState("");
    return (
      <div style={{ maxWidth: 280 }}>
        <DateInput label="Date de naissance" value={value} onChange={setValue} />
      </div>
    );
  },
};

export const CustomMaskChar: Story = {
  name: "Caractère de masque personnalisé",
  render: () => {
    const [value, setValue] = useState("");
    return (
      <div style={{ maxWidth: 280 }}>
        <MaskedInput label="IBAN (masque avec '-')" mask="## ## #### #### ####" maskChar="-" value={value} onChange={setValue} />
      </div>
    );
  },
};
