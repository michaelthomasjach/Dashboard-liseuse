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

export const AnalystRating: Story = {
  render: () => (
    <GaugeChart
      value={92}
      min={0}
      max={100}
      label="Recommandation"
      formatValue={() => "Achat fort"}
      showBandLabels
      thresholds={[
        { upTo: 20, color: "var(--lq-color-down)", label: "Vente forte" },
        { upTo: 40, color: "color-mix(in srgb, var(--lq-color-down) 50%, var(--lq-color-warning))", label: "Vente" },
        { upTo: 60, color: "var(--lq-color-warning)", label: "Neutre" },
        { upTo: 80, color: "color-mix(in srgb, var(--lq-color-warning) 50%, var(--lq-color-up))", label: "Achat" },
        { upTo: 100, color: "var(--lq-color-up)", label: "Achat fort" },
      ]}
    />
  ),
};
