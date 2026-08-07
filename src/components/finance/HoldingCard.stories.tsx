import type { Meta, StoryObj } from "@storybook/react";
import { HoldingCard } from "./HoldingCard";

const meta: Meta<typeof HoldingCard> = {
  title: "Finance/HoldingCard",
  component: HoldingCard,
};
export default meta;
type Story = StoryObj<typeof HoldingCard>;

export const List: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 380 }}>
      <HoldingCard symbol="AAPL" name="Apple Inc." quantity={42} price={226.34} change={1.8} sparklineData={[10, 10.4, 10.1, 10.8, 11.2, 11.6, 12.1]} onClick={() => {}} />
      <HoldingCard symbol="TSLA" name="Tesla Inc." quantity={25} price={248.5} change={-3.2} sparklineData={[14.5, 14.2, 14.4, 13.8, 13.5, 13.7, 13.1]} onClick={() => {}} />
      <HoldingCard symbol="NVDA" name="NVIDIA Corp." quantity={60} price={132.7} change={4.1} sparklineData={[8, 8.2, 8.6, 9.1, 9.4, 9.9, 10.5]} onClick={() => {}} />
    </div>
  ),
};
