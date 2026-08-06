import type { Meta, StoryObj } from "@storybook/react";
import { DonutChart } from "./DonutChart";
import { SAMPLE_ALLOCATION } from "../../test-data/financeSampleData";

const meta: Meta<typeof DonutChart> = {
  title: "Charts/DonutChart",
  component: DonutChart,
};
export default meta;
type Story = StoryObj<typeof DonutChart>;

export const AssetAllocation: Story = {
  render: () => <DonutChart data={SAMPLE_ALLOCATION} formatValue={(v) => `${v} %`} />,
};
