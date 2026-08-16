import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DateRangePicker, type DateRange } from "./DateRangePicker";

const meta: Meta<typeof DateRangePicker> = {
  title: "Forms/DateRangePicker",
  component: DateRangePicker,
};
export default meta;
type Story = StoryObj<typeof DateRangePicker>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<DateRange>({ start: null, end: null });
    return (
      <div style={{ maxWidth: 280 }}>
        <DateRangePicker label="Séjour" value={value} onChange={setValue} />
      </div>
    );
  },
};

export const Preselected: Story = {
  name: "Plage pré-remplie",
  render: () => {
    const today = new Date();
    const in5Days = new Date();
    in5Days.setDate(today.getDate() + 5);
    const [value, setValue] = useState<DateRange>({ start: today, end: in5Days });
    return (
      <div style={{ maxWidth: 280 }}>
        <DateRangePicker label="Réservation" value={value} onChange={setValue} />
      </div>
    );
  },
};

export const Sizes: Story = {
  name: "Tailles (small / normal)",
  render: () => {
    const today = new Date();
    const in5Days = new Date();
    in5Days.setDate(today.getDate() + 5);
    const [value, setValue] = useState<DateRange>({ start: today, end: in5Days });
    return (
      <div style={{ maxWidth: 280, display: "flex", flexDirection: "column", gap: 16 }}>
        <DateRangePicker size="small" label="Small" value={value} onChange={setValue} />
        <DateRangePicker label="Normal (défaut)" value={value} onChange={setValue} />
      </div>
    );
  },
};
