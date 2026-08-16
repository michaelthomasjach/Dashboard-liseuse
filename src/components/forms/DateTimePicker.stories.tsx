import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DateTimePicker } from "./DateTimePicker";

const meta: Meta<typeof DateTimePicker> = {
  title: "Forms/DateTimePicker",
  component: DateTimePicker,
};
export default meta;
type Story = StoryObj<typeof DateTimePicker>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<Date | null>(new Date());
    return (
      <div style={{ maxWidth: 280 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          Liste déroulante par pas de 15 minutes (défaut) — scroller et cliquer un créneau. Pour une heure précise
          hors de la grille, tape-la directement dans le champ au-dessus de la liste (ex. "9:07"), Entrée ou clic
          ailleurs pour valider.
        </p>
        <DateTimePicker label="Date et heure du rendez-vous" value={value} onChange={setValue} />
      </div>
    );
  },
};

export const FiveMinuteSteps: Story = {
  name: "Pas de 5 minutes",
  render: () => {
    const [value, setValue] = useState<Date | null>(null);
    return (
      <div style={{ maxWidth: 280 }}>
        <DateTimePicker label="Créneau" value={value} onChange={setValue} minuteStep={5} />
      </div>
    );
  },
};

export const Sizes: Story = {
  name: "Tailles (small / normal)",
  render: () => {
    const [value, setValue] = useState<Date | null>(new Date());
    return (
      <div style={{ maxWidth: 280, display: "flex", flexDirection: "column", gap: 16 }}>
        <DateTimePicker size="small" label="Small" value={value} onChange={setValue} />
        <DateTimePicker label="Normal (défaut)" value={value} onChange={setValue} />
      </div>
    );
  },
};
