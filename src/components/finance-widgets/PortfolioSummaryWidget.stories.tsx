import type { Meta, StoryObj } from "@storybook/react";
import { PortfolioSummaryWidget } from "./PortfolioSummaryWidget";
import { generateSeries } from "../../test-data/financeSampleData";

const meta: Meta<typeof PortfolioSummaryWidget> = {
  title: "Finance Widgets/PortfolioSummaryWidget",
  component: PortfolioSummaryWidget,
};
export default meta;
type Story = StoryObj<typeof PortfolioSummaryWidget>;

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <PortfolioSummaryWidget
        meta="6 positions"
        value="42 380 €"
        delta={3.4}
        series={generateSeries(120, 40000, 6)}
        formatY={(v) => `${(v / 1000).toFixed(0)} k€`}
        formatX={(x) => (x as Date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
      />
    </div>
  ),
};
