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

// Local, offline placeholder standing in for a real photo (a city skyline at dusk) — swap for an
// actual photo in your app. A photographic scene (not an abstract gradient blob) so the
// grayscale-gradient and scroll-blur effects below actually read clearly against real detail.
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0b1224"/>
          <stop offset="0.55" stop-color="#3a2c5e"/>
          <stop offset="1" stop-color="#e08a4f"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="700" fill="url(#sky)"/>
      <circle cx="980" cy="150" r="46" fill="#ffe4b8" opacity="0.9"/>
      ${Array.from({ length: 14 })
        .map((_, i) => {
          const x = i * 90 + (i % 3) * 20;
          const w = 40 + (i % 4) * 14;
          const h = 160 + ((i * 53) % 260);
          const lit = (i * 37) % 5 === 0;
          return `<rect x="${x}" y="${700 - h}" width="${w}" height="${h}" fill="${lit ? "#2b3350" : "#141a30"}"/>`;
        })
        .join("\n      ")}
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
