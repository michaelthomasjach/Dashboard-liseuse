import type { Meta, StoryObj } from "@storybook/react";
import { Panel, PanelRow } from "./Panel";

const meta: Meta<typeof Panel> = {
  title: "Primitives/Panel",
  component: Panel,
};
export default meta;
type Story = StoryObj<typeof Panel>;

export const RoomTemperatures: Story = {
  render: () => (
    <Panel title="Intérieur" meta="6 pièces" style={{ maxWidth: 360 }}>
      <PanelRow label="Salon" value="21,5°" />
      <PanelRow label="Chambre Ewenn" value="19,7°" />
      <PanelRow label="Bureau" value="20,0°" />
      <PanelRow label="Chambre parentale" value="19,0°" />
      <PanelRow label="Cuisine" value="20,8°" />
      <PanelRow label="Salle de bain" value="22,1°" />
    </Panel>
  ),
};

export const Bare: Story = {
  render: () => (
    <Panel bare style={{ maxWidth: 360 }}>
      <PanelRow label="Sans bordure ni fond" value="—" />
    </Panel>
  ),
};
