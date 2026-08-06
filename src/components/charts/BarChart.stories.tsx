import type { Meta, StoryObj } from "@storybook/react";
import { BarChart } from "./BarChart";

const meta: Meta<typeof BarChart> = {
  title: "Charts/BarChart",
  component: BarChart,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof BarChart>;

const MONTHLY_RETURN = [
  { id: "j", label: "Jan", value: 2.1 },
  { id: "f", label: "Fév", value: -1.4 },
  { id: "m", label: "Mar", value: 3.4 },
  { id: "a", label: "Avr", value: 0.8 },
  { id: "ma", label: "Mai", value: -2.6 },
  { id: "ju", label: "Juin", value: 4.2 },
];

export const MonthlyReturns: Story = {
  name: "Rendement mensuel (couleur par signe)",
  render: () => (
    <div style={{ maxWidth: 600 }}>
      <BarChart data={MONTHLY_RETURN} colorByValue formatValue={(v) => `${v.toFixed(1)} %`} />
    </div>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <div style={{ maxWidth: 500 }}>
      <BarChart
        orientation="horizontal"
        data={[
          { id: "eq", label: "Actions", value: 48 },
          { id: "bo", label: "Obligations", value: 22 },
          { id: "re", label: "Immobilier", value: 14 },
          { id: "ca", label: "Liquidités", value: 10 },
          { id: "cr", label: "Crypto", value: 6 },
        ]}
        formatValue={(v) => `${v} %`}
      />
    </div>
  ),
};
