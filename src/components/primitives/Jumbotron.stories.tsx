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

// Local, offline placeholder — swap for a real photo in your app.
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#1e3a5f"/>
          <stop offset="1" stop-color="#0f1420"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="700" fill="url(#g)"/>
      <circle cx="900" cy="200" r="260" fill="#2563eb" opacity="0.35"/>
      <circle cx="1050" cy="480" r="160" fill="#16a34a" opacity="0.35"/>
    </svg>
  `);

export const WithImage: Story = {
  name: "Avec image de fond",
  render: () => (
    <Jumbotron
      eyebrow="Marché"
      title="Les marchés ouvrent dans 2 heures"
      description="Préparez vos ordres avant l'ouverture de Wall Street."
      backgroundImage={PLACEHOLDER_IMAGE}
      actions={<Button selected>Voir le calendrier</Button>}
    />
  ),
};

export const WithImageGrayscale: Story = {
  name: "Avec image de fond, filtre noir et blanc",
  render: () => (
    <Jumbotron
      eyebrow="Marché"
      title="Les marchés ouvrent dans 2 heures"
      description="Préparez vos ordres avant l'ouverture de Wall Street."
      backgroundImage={PLACEHOLDER_IMAGE}
      imageFilter="grayscale"
      actions={<Button selected>Voir le calendrier</Button>}
    />
  ),
};
