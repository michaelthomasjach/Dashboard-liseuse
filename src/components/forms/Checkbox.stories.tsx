import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./Checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Forms/Checkbox",
  component: Checkbox,
};
export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return <Checkbox checked={checked} onChange={setChecked} label="Recevoir les relevés par email" />;
  },
};

export const Indeterminate: Story = {
  name: "Groupe (partiel / tout / rien)",
  render: () => {
    const [items, setItems] = useState([true, false, true]);
    const allChecked = items.every(Boolean);
    const someChecked = items.some(Boolean);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Checkbox
          checked={allChecked}
          indeterminate={someChecked && !allChecked}
          onChange={(v) => setItems(items.map(() => v))}
          label="Tous les comptes"
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 24 }}>
          {items.map((checked, i) => (
            <Checkbox
              key={i}
              checked={checked}
              onChange={(v) => setItems(items.map((it, idx) => (idx === i ? v : it)))}
              label={`Compte ${i + 1}`}
            />
          ))}
        </div>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <Checkbox checked disabled label="Coché, désactivé" onChange={() => {}} />
      <Checkbox checked={false} disabled label="Décoché, désactivé" onChange={() => {}} />
    </div>
  ),
};
