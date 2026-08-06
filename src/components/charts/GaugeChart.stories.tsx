import type { Meta, StoryObj } from "@storybook/react";
import { GaugeChart } from "./GaugeChart";

const meta: Meta<typeof GaugeChart> = {
  title: "Charts/GaugeChart",
  component: GaugeChart,
};
export default meta;
type Story = StoryObj<typeof GaugeChart>;

export const RiskScore: Story = {
  render: () => (
    <GaugeChart
      value={68}
      min={0}
      max={100}
      label="Score de risque"
      formatValue={(v) => `${v}`}
      thresholds={[
        { upTo: 33, color: "var(--lq-color-up)" },
        { upTo: 66, color: "var(--lq-color-warning)" },
        { upTo: 100, color: "var(--lq-color-down)" },
      ]}
    />
  ),
};

export const Simple: Story = {
  render: () => <GaugeChart value={72} label="Objectif atteint" formatValue={(v) => `${v} %`} />,
};
