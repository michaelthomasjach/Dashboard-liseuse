import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Allumer" },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };
export const Block: Story = { args: { children: "Fermer", block: true, selected: true } };

export const Group: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button selected>Blanc chaud</Button>
      <Button>Blanc doux</Button>
      <Button>Blanc neutre</Button>
      <Button>Blanc froid</Button>
      <Button>Lumière du jour</Button>
    </div>
  ),
};
