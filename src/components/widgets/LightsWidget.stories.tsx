import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { LightsWidget, type LightEntry } from "./LightsWidget";
import { LightDetailModal } from "./LightDetailModal";

const meta: Meta<typeof LightsWidget> = {
  title: "Widgets/LightsWidget",
  component: LightsWidget,
};
export default meta;
type Story = StoryObj<typeof LightsWidget>;

const INITIAL: LightEntry[] = [
  { id: "cuisine", label: "Cuisine", on: true, level: 80, statusText: "80 %" },
  { id: "sejour", label: "Séjour", on: false, level: 0, statusText: "éteint" },
  { id: "bureau", label: "Bureau", on: false, level: 0, statusText: "éteint" },
  { id: "ewenn", label: "Chambre Ewenn", on: false, level: 0, statusText: "éteint" },
];

export const Default: Story = {
  render: () => {
    const [lights, setLights] = useState(INITIAL);
    const [openId, setOpenId] = useState<string | null>(null);
    const activeLight = lights.find((l) => l.id === openId) ?? null;
    const onCount = lights.filter((l) => l.on).length;

    return (
      <div style={{ maxWidth: 360 }}>
        <LightsWidget
          meta={`${onCount} allumée${onCount > 1 ? "s" : ""}`}
          lights={lights.map((l) => ({
            ...l,
            onClick: () => setOpenId(l.id),
          }))}
        />
        {activeLight && (
          <LightDetailModal
            open
            onClose={() => setOpenId(null)}
            roomName={activeLight.label}
            on={activeLight.on}
            onPowerChange={(on) =>
              setLights((prev) =>
                prev.map((l) => (l.id === activeLight.id ? { ...l, on, statusText: on ? "allumé" : "éteint" } : l))
              )
            }
            whiteBalanceOptions={[
              { id: "warm", label: "Blanc chaud" },
              { id: "soft", label: "Blanc doux" },
              { id: "neutral", label: "Blanc neutre" },
              { id: "cold", label: "Blanc froid" },
              { id: "daylight", label: "Lumière du jour" },
            ]}
            whiteBalance="warm"
            colorOptions={[
              { id: "red", label: "Rouge", color: "#ef4444" },
              { id: "amber", label: "Ambre", color: "#f59e0b" },
              { id: "green", label: "Vert", color: "#22c55e" },
              { id: "blue", label: "Bleu", color: "#3b82f6" },
              { id: "rose", label: "Rose", color: "#ec4899" },
              { id: "violet", label: "Violet", color: "#8b5cf6" },
            ]}
          />
        )}
      </div>
    );
  },
};
