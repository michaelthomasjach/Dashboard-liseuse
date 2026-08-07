import type { Meta, StoryObj } from "@storybook/react";
import { ComparisonCard } from "./ComparisonCard";

const meta: Meta<typeof ComparisonCard> = {
  title: "Finance/ComparisonCard",
  component: ComparisonCard,
};
export default meta;
type Story = StoryObj<typeof ComparisonCard>;

export const PortfolioVsBenchmark: Story = {
  name: "Portefeuille vs. indice",
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <ComparisonCard
        title="Performance YTD"
        primary={{ label: "Mon portefeuille", value: "+12,4 %", delta: 12.4 }}
        secondary={{ label: "S&P 500", value: "+8,1 %", delta: 8.1 }}
      />
    </div>
  ),
};
