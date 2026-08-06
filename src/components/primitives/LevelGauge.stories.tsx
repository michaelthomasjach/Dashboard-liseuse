import type { Meta, StoryObj } from "@storybook/react";
import { LevelGauge } from "./LevelGauge";

const meta: Meta<typeof LevelGauge> = {
  title: "Primitives/LevelGauge",
  component: LevelGauge,
  args: { value: 60, segments: 10, label: "60 %" },
};
export default meta;
type Story = StoryObj<typeof LevelGauge>;

export const Default: Story = {};
export const Empty: Story = { args: { value: 0, label: "fermé" } };
export const Full: Story = { args: { value: 100, label: "ouvert" } };
export const Small: Story = { args: { size: "sm", value: 45, label: "45 %" } };
export const ManySegments: Story = { args: { segments: 16, value: 5, label: "5 %" } };
