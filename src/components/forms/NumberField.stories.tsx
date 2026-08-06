import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { NumberField } from "./NumberField";

const meta: Meta<typeof NumberField> = {
  title: "Forms/NumberField",
  component: NumberField,
};
export default meta;
type Story = StoryObj<typeof NumberField>;

export const Currency: Story = {
  render: () => {
    const [value, setValue] = useState<number | "">(1000);
    return (
      <div style={{ maxWidth: 220 }}>
        <NumberField label="Montant à investir" value={value} onChange={setValue} prefix="€" min={0} step={100} />
      </div>
    );
  },
};

export const Percentage: Story = {
  render: () => {
    const [value, setValue] = useState<number | "">(2.5);
    return (
      <div style={{ maxWidth: 220 }}>
        <NumberField label="Taux annuel" value={value} onChange={setValue} suffix="%" step={0.1} min={0} max={100} />
      </div>
    );
  },
};

export const Quantity: Story = {
  render: () => {
    const [value, setValue] = useState<number | "">(10);
    return (
      <div style={{ maxWidth: 220 }}>
        <NumberField label="Quantité" value={value} onChange={setValue} min={0} step={1} />
      </div>
    );
  },
};
