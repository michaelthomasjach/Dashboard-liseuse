import type { Meta, StoryObj } from "@storybook/react";
import { LineAreaChart } from "./LineAreaChart";
import { generateSeries } from "../../test-data/financeSampleData";

const meta: Meta<typeof LineAreaChart> = {
  title: "Charts/LineAreaChart",
  component: LineAreaChart,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof LineAreaChart>;

const formatEUR = (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
const formatDate = (x: Date | number) => (x as Date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

export const PortfolioValue: Story = {
  render: () => (
    <div style={{ maxWidth: 720 }}>
      <LineAreaChart
        series={[{ id: "portfolio", label: "Portefeuille", data: generateSeries(180, 42000, 7) }]}
        area
        formatY={formatEUR}
        formatX={formatDate}
      />
    </div>
  ),
};

export const MultiSeriesComparison: Story = {
  name: "Multi-séries + légende",
  render: () => (
    <div style={{ maxWidth: 720 }}>
      <LineAreaChart
        series={[
          { id: "portfolio", label: "Mon portefeuille", data: generateSeries(120, 10000, 3) },
          { id: "benchmark", label: "S&P 500", data: generateSeries(120, 10000, 9) },
        ]}
        formatY={formatEUR}
        formatX={formatDate}
      />
    </div>
  ),
};
