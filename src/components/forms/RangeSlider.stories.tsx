import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { RangeSlider } from "./RangeSlider";

const meta: Meta<typeof RangeSlider> = {
  title: "Forms/RangeSlider",
  component: RangeSlider,
};
export default meta;
type Story = StoryObj<typeof RangeSlider>;

export const PriceRange: Story = {
  render: () => {
    const [value, setValue] = useState<[number, number]>([20, 80]);
    return (
      <div style={{ maxWidth: 320 }}>
        <RangeSlider label="Fourchette de prix" min={0} max={100} value={value} onChange={setValue} formatValue={(v) => `${v} €`} />
      </div>
    );
  },
};
