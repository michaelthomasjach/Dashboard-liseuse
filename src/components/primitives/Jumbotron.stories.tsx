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

// A real photo (Chicago skyline at dusk, from Unsplash) rather than a generated placeholder — a
// photographic scene (not an abstract gradient blob) so the grayscale-gradient and scroll-blur
// effects below actually read clearly against real detail.
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1600&q=80";

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
  name: "Avec image de fond, dégradé noir et blanc",
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

export const WithImageBlurOnScroll: Story = {
  name: "Avec image de fond, flou au scroll",
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ padding: 24 }}>
      <Jumbotron
        eyebrow="Marché"
        title="Les marchés ouvrent dans 2 heures"
        description="Préparez vos ordres avant l'ouverture de Wall Street."
        backgroundImage={PLACEHOLDER_IMAGE}
        imageFilter="grayscale"
        blurOnScroll
        actions={<Button selected>Voir le calendrier</Button>}
      />
      <p style={{ fontSize: 13, opacity: 0.7, margin: "16px 0" }}>
        Faites défiler cette page — l'image de fond ci-dessus devient progressivement floue.
      </p>
      <div style={{ height: 1400 }} />
    </div>
  ),
};
