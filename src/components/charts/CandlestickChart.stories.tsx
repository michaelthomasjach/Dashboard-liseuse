import type { Meta, StoryObj } from "@storybook/react";
import { CandlestickChart } from "./CandlestickChart";
import { generateCandles } from "../../test-data/financeSampleData";

const meta: Meta<typeof CandlestickChart> = {
  title: "Charts/CandlestickChart",
  component: CandlestickChart,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof CandlestickChart>;

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: 800 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>Molette pour zoomer, glisser pour naviguer dans l'historique.</p>
      <CandlestickChart data={generateCandles(220, 180, 11)} />
    </div>
  ),
};

export const WithoutVolume: Story = {
  render: () => (
    <div style={{ maxWidth: 800 }}>
      <CandlestickChart data={generateCandles(120, 90, 22)} showVolume={false} height={320} />
    </div>
  ),
};
