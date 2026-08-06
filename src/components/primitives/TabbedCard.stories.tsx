import type { Meta, StoryObj } from "@storybook/react";
import { TabbedCard } from "./TabbedCard";
import { PanelRow } from "./Panel";
import { HomeIcon, SettingsIcon, BellIcon } from "../icons";

const meta: Meta<typeof TabbedCard> = {
  title: "Primitives/TabbedCard",
  component: TabbedCard,
};
export default meta;
type Story = StoryObj<typeof TabbedCard>;

export const Horizontal: Story = {
  render: () => (
    <div style={{ maxWidth: 460 }}>
      <TabbedCard
        title="Compte"
        tabs={[
          {
            id: "positions",
            label: "Positions",
            content: (
              <>
                <PanelRow label="AAPL" value="42 actions" />
                <PanelRow label="MSFT" value="18 actions" />
              </>
            ),
          },
          {
            id: "orders",
            label: "Ordres",
            content: <PanelRow label="Aucun ordre en cours" value="—" />,
          },
        ]}
      />
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div style={{ maxWidth: 520 }}>
      <TabbedCard
        orientation="vertical"
        title="Paramètres"
        tabs={[
          {
            id: "general",
            label: "Général",
            icon: <HomeIcon size={16} />,
            content: <PanelRow label="Langue" value="Français" />,
          },
          {
            id: "notifications",
            label: "Notifications",
            icon: <BellIcon size={16} />,
            content: <PanelRow label="Alertes de prix" value="Activées" />,
          },
          {
            id: "security",
            label: "Sécurité",
            icon: <SettingsIcon size={16} />,
            content: <PanelRow label="Authentification à 2 facteurs" value="Activée" />,
          },
        ]}
      />
    </div>
  ),
};
