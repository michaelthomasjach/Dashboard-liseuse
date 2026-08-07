import type { Meta, StoryObj } from "@storybook/react";
import { MarketMoversWidget } from "./MarketMoversWidget";

const meta: Meta<typeof MarketMoversWidget> = {
  title: "Finance Widgets/MarketMoversWidget",
  component: MarketMoversWidget,
};
export default meta;
type Story = StoryObj<typeof MarketMoversWidget>;

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: 380 }}>
      <MarketMoversWidget
        gainers={[
          { id: "nvda", symbol: "NVDA", name: "NVIDIA Corp.", change: 4.1 },
          { id: "amzn", symbol: "AMZN", name: "Amazon.com Inc.", change: 2.4 },
          { id: "aapl", symbol: "AAPL", name: "Apple Inc.", change: 1.8 },
        ]}
        losers={[
          { id: "tsla", symbol: "TSLA", name: "Tesla Inc.", change: -3.2 },
          { id: "msft", symbol: "MSFT", name: "Microsoft Corp.", change: -0.6 },
        ]}
      />
    </div>
  ),
};
