import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DatePicker } from "./DatePicker";

const meta: Meta<typeof DatePicker> = {
  title: "Forms/DatePicker",
  component: DatePicker,
};
export default meta;
type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<Date | null>(new Date());
    return (
      <div style={{ maxWidth: 260 }}>
        <DatePicker label="Date de valeur" value={value} onChange={setValue} />
      </div>
    );
  },
};

export const WithMinMax: Story = {
  name: "Plage limitée",
  render: () => {
    const [value, setValue] = useState<Date | null>(null);
    const today = new Date();
    const max = new Date();
    max.setDate(today.getDate() + 30);
    return (
      <div style={{ maxWidth: 260 }}>
        <DatePicker label="Date d'exécution" value={value} onChange={setValue} minDate={today} maxDate={max} />
      </div>
    );
  },
};

export const Sizes: Story = {
  name: "Tailles (small / normal)",
  render: () => {
    const [value, setValue] = useState<Date | null>(new Date());
    return (
      <div style={{ maxWidth: 260, display: "flex", flexDirection: "column", gap: 16 }}>
        <DatePicker size="small" label="Small" value={value} onChange={setValue} />
        <DatePicker label="Normal (défaut)" value={value} onChange={setValue} />
      </div>
    );
  },
};
