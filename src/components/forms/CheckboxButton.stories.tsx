import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CheckboxButton } from "./CheckboxButton";

const meta: Meta<typeof CheckboxButton> = {
  title: "Forms/CheckboxButton",
  component: CheckboxButton,
};
export default meta;
type Story = StoryObj<typeof CheckboxButton>;

export const Single: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <CheckboxButton checked={checked} onChange={setChecked}>
        Notifications par email
      </CheckboxButton>
    );
  },
};

export const FilterGroup: Story = {
  name: "Groupe de filtres (sélection multiple)",
  render: () => {
    const [selected, setSelected] = useState<Set<string>>(new Set(["equities", "bonds"]));
    const options = [
      { id: "equities", label: "Actions" },
      { id: "bonds", label: "Obligations" },
      { id: "real-estate", label: "Immobilier" },
      { id: "crypto", label: "Crypto" },
    ];
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((opt) => (
          <CheckboxButton
            key={opt.id}
            checked={selected.has(opt.id)}
            onChange={(checked) =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (checked) next.add(opt.id);
                else next.delete(opt.id);
                return next;
              })
            }
          >
            {opt.label}
          </CheckboxButton>
        ))}
      </div>
    );
  },
};
