import type { Meta, StoryObj } from "@storybook/react";
import { ExpandableCard } from "./ExpandableCard";
import { PanelRow } from "./Panel";

const meta: Meta<typeof ExpandableCard> = {
  title: "Primitives/ExpandableCard",
  component: ExpandableCard,
};
export default meta;
type Story = StoryObj<typeof ExpandableCard>;

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: 400 }}>
      <ExpandableCard title="Détail de l'ordre" meta="Exécuté" summary="12 AAPL @ 226,34 € — 2 714,08 €" defaultOpen>
        <PanelRow label="Type" value="Marché" />
        <PanelRow label="Frais" value="1,99 €" />
        <PanelRow label="Compte" value="PEA" />
        <PanelRow label="Date" value="11/06/2026 09:34" />
      </ExpandableCard>
    </div>
  ),
};

export const Collapsed: Story = {
  render: () => (
    <div style={{ maxWidth: 400 }}>
      <ExpandableCard title="Frais et conditions" meta="voir le détail">
        <PanelRow label="Frais de courtage" value="0,5 %" />
        <PanelRow label="Frais de tenue de compte" value="0 €" />
      </ExpandableCard>
    </div>
  ),
};
