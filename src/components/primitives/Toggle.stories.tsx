import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Toggle } from "./Toggle";

const meta: Meta<typeof Toggle> = {
  title: "Primitives/Toggle",
  component: Toggle,
  args: { checked: true, ariaLabel: "Salon TV" },
};
export default meta;
type Story = StoryObj<typeof Toggle>;

export const On: Story = { args: { checked: true } };
export const Off: Story = { args: { checked: false } };
export const Disabled: Story = { args: { checked: true, disabled: true } };

export const Interactive: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(args.checked);
    return <Toggle {...args} checked={checked} onChange={setChecked} />;
  },
};
