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
  name: "Fourchette de prix (glisser le segment pour décaler)",
  render: () => {
    const [value, setValue] = useState<[number, number]>([20, 80]);
    return (
      <div style={{ maxWidth: 320 }}>
        <RangeSlider label="Fourchette de prix" min={0} max={100} value={value} onChange={setValue} formatValue={(v) => `${v} €`} />
      </div>
    );
  },
};

export const MarketCap: Story = {
  name: "Capitalisation (M€, pas de 10)",
  render: () => {
    const [value, setValue] = useState<[number, number]>([100, 500]);
    return (
      <div style={{ maxWidth: 320 }}>
        <RangeSlider label="Capitalisation boursière" min={0} max={1000} step={10} value={value} onChange={setValue} formatValue={(v) => `${v} M€`} />
      </div>
    );
  },
};

export const YearRange: Story = {
  name: "Plage d'années",
  render: () => {
    const [value, setValue] = useState<[number, number]>([2015, 2024]);
    return (
      <div style={{ maxWidth: 320 }}>
        <RangeSlider label="Période d'analyse" min={2000} max={2026} step={1} value={value} onChange={setValue} formatValue={(v) => `${v}`} />
      </div>
    );
  },
};

export const CenteredOnZero: Story = {
  name: "Centré sur zéro (négatif à gauche, positif à droite)",
  render: () => {
    const [value, setValue] = useState<[number, number]>([-25, 40]);
    return (
      <div style={{ maxWidth: 320 }}>
        <RangeSlider
          label="Variation attendue"
          min={-50}
          max={50}
          value={value}
          onChange={setValue}
          formatValue={(v) => `${v > 0 ? "+" : ""}${v} %`}
          centerZero
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div style={{ maxWidth: 320 }}>
      <RangeSlider label="Fourchette de prix" min={0} max={100} value={[30, 70]} onChange={() => {}} disabled />
    </div>
  ),
};
