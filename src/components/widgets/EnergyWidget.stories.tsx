import type { Meta, StoryObj } from "@storybook/react";
import { EnergyWidget } from "./EnergyWidget";
import { SolarPanelIcon } from "../icons";

const meta: Meta<typeof EnergyWidget> = {
  title: "Widgets/EnergyWidget",
  component: EnergyWidget,
};
export default meta;
type Story = StoryObj<typeof EnergyWidget>;

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <EnergyWidget
        rows={[
          {
            id: "solar",
            icon: <SolarPanelIcon />,
            label: "Solaire produit aujourd'hui",
            value: "1,0 kWh",
            details: ["442 W à l'instant", "Hier · 20,9 kWh"],
          },
          { id: "battery", label: "Batterie maison", value: "11 %", gaugePercent: 11 },
          { id: "network", label: "Réseau consommé aujourd'hui", value: "7,7 kWh" },
          { id: "cost", label: "Coût du jour", value: "1,24 €" },
        ]}
      />
    </div>
  ),
};
