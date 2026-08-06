import type { Meta, StoryObj } from "@storybook/react";
import { Jumbotron } from "./Jumbotron";
import { Button } from "./Button";

const meta: Meta<typeof Jumbotron> = {
  title: "Primitives/Jumbotron",
  component: Jumbotron,
};
export default meta;
type Story = StoryObj<typeof Jumbotron>;

export const Default: Story = {
  render: () => (
    <Jumbotron
      eyebrow="Nouveau"
      title="Suivez vos investissements en un coup d'œil"
      description="Graphiques interactifs, alertes de prix et rapports de performance — tout au même endroit."
      actions={
        <>
          <Button selected>Commencer</Button>
          <Button>En savoir plus</Button>
        </>
      }
    />
  ),
};

export const Accent: Story = {
  render: () => (
    <Jumbotron
      tone="accent"
      title="Complétez votre profil investisseur"
      description="Encore deux étapes avant de pouvoir passer votre premier ordre."
      actions={<Button>Continuer</Button>}
    />
  ),
};
