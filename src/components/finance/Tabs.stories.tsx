import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Tabs } from "./Tabs";

const meta: Meta<typeof Tabs> = {
  title: "Finance/Tabs",
  component: Tabs,
};
export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
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
