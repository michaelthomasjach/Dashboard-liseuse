import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ShuttersWidget, type ShutterEntry } from "./ShuttersWidget";

const meta: Meta<typeof ShuttersWidget> = {
  title: "Widgets/ShuttersWidget",
  component: ShuttersWidget,
};
export default meta;
type Story = StoryObj<typeof ShuttersWidget>;

const INITIAL: ShutterEntry[] = [
  { id: "salle-a-manger", label: "Salle à manger", on: true, level: 100, statusText: "ouvert" },
  { id: "salon-tv", label: "Salon TV", on: false, level: 0, statusText: "fermé" },
  { id: "salon-the", label: "Salon thé", on: true, level: 60, statusText: "60 %" },
  { id: "chambre-invite", label: "Chambre invité", on: false, level: 0, statusText: "fermé" },
  { id: "portail", label: "Portail", on: false, level: 0, statusText: "fermé" },
];

export const Default: Story = {
  render: () => {
    const [shutters, setShutters] = useState(INITIAL);
    const openCount = shutters.filter((s) => s.on).length;
    return (
      <div style={{ maxWidth: 360 }}>
        <ShuttersWidget
          meta={`${openCount} ouverts`}
          shutters={shutters.map((s) => ({
            ...s,
            onToggle: (on) =>
              setShutters((prev) =>
                prev.map((p) => (p.id === s.id ? { ...p, on, statusText: on ? "ouvert" : "fermé" } : p))
              ),
          }))}
        />
      </div>
    );
  },
};
