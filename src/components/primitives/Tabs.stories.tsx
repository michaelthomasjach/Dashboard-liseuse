import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Tabs } from "./Tabs";

const meta: Meta<typeof Tabs> = {
  title: "Primitives/Tabs",
  component: Tabs,
};
export default meta;
type Story = StoryObj<typeof Tabs>;

export const Horizontal: Story = {
  render: () => {
    const [value, setValue] = useState("positions");
    return (
      <Tabs
        value={value}
        onChange={setValue}
        items={[
          { id: "positions", label: "Positions" },
          { id: "orders", label: "Ordres" },
          { id: "history", label: "Historique" },
          { id: "disabled", label: "Bientôt", disabled: true },
        ]}
      />
    );
  },
};

export const Vertical: Story = {
  render: () => {
    const [value, setValue] = useState("positions");
    return (
      <div style={{ display: "flex", height: 160 }}>
        <Tabs
          orientation="vertical"
          value={value}
          onChange={setValue}
          items={[
            { id: "positions", label: "Positions" },
            { id: "orders", label: "Ordres" },
            { id: "history", label: "Historique" },
          ]}
        />
      </div>
    );
  },
};
