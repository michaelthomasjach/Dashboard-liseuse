import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
import { StarIcon, ArrowRightIcon, BellIcon, PlusIcon, CheckIcon } from "../icons";

const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Allumer" },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };
export const Block: Story = { args: { children: "Fermer", block: true, selected: true } };

export const Group: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button selected>Blanc chaud</Button>
      <Button>Blanc doux</Button>
      <Button>Blanc neutre</Button>
      <Button>Blanc froid</Button>
      <Button>Lumière du jour</Button>
    </div>
  ),
};

export const WithIcon: Story = {
  name: "Avec icône (survolez pour l'animation)",
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button icon={<PlusIcon size={16} />}>Nouvel ordre</Button>
      <Button icon={<ArrowRightIcon size={16} />} iconPosition="trailing">
        Voir tout
      </Button>
    </div>
  ),
};

export const ToggleMode: Story = {
  name: "Mode toggle (ton + icône d'état animée)",
  render: () => {
    const [starred, setStarred] = useState(false);
    const [alerting, setAlerting] = useState(true);
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button icon={<StarIcon size={16} />} selectedIcon={<StarIcon size={16} fill="currentColor" />} selected={starred} onClick={() => setStarred((s) => !s)}>
          {starred ? "Dans la watchlist" : "Ajouter à la watchlist"}
        </Button>
        <Button icon={<BellIcon size={16} />} selectedIcon={<CheckIcon size={16} />} selected={alerting} onClick={() => setAlerting((a) => !a)}>
          {alerting ? "Alerte active" : "Activer l'alerte"}
        </Button>
      </div>
    );
  },
};
