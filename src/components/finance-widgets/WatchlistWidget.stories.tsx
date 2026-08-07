import type { Meta, StoryObj } from "@storybook/react";
import { WatchlistWidget } from "./WatchlistWidget";
import { SAMPLE_HOLDINGS } from "../../test-data/financeSampleData";

const meta: Meta<typeof WatchlistWidget> = {
  title: "Finance Widgets/WatchlistWidget",
  component: WatchlistWidget,
};
export default meta;
type Story = StoryObj<typeof WatchlistWidget>;

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: 380 }}>
      <WatchlistWidget
        items={SAMPLE_HOLDINGS.map((h) => ({ id: h.id, symbol: h.symbol, name: h.name, quantity: h.quantity, price: h.price, change: h.change }))}
        onSelect={() => {}}
      />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={{ maxWidth: 380 }}>
      <WatchlistWidget items={[]} />
    </div>
  ),
};
