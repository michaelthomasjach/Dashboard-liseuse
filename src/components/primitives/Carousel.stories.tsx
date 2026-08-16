import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties } from "react";
import { Carousel } from "./Carousel";
import { Jumbotron } from "./Jumbotron";
import { Button } from "./Button";

const meta: Meta<typeof Carousel> = {
  title: "Primitives/Carousel",
  component: Carousel,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof Carousel>;

// Same offline, local placeholder approach as Jumbotron's own stories — a skyline silhouette
// against a gradient sky, tinted differently per slide so the three are easy to tell apart.
function placeholderImage(topColor: string, bottomColor: string) {
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${topColor}"/>
            <stop offset="1" stop-color="${bottomColor}"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="700" fill="url(#sky)"/>
        ${Array.from({ length: 14 })
          .map((_, i) => {
            const x = i * 90 + (i % 3) * 20;
            const w = 40 + (i % 4) * 14;
            const h = 160 + ((i * 53) % 260);
            return `<rect x="${x}" y="${700 - h}" width="${w}" height="${h}" fill="#141a30" opacity="0.55"/>`;
          })
          .join("\n        ")}
      </svg>
    `)
  );
}

export const HeroBanners: Story = {
  name: "Bannières promotionnelles",
  render: () => (
    <div style={{ padding: 24 }}>
      <Carousel height={360} autoplayInterval={4000}>
        <Jumbotron
          eyebrow="Marché"
          title="Les marchés ouvrent dans 2 heures"
          description="Préparez vos ordres avant l'ouverture de Wall Street."
          backgroundImage={placeholderImage("#0b1224", "#e08a4f")}
          imageFilter="grayscale"
          actions={<Button selected>Voir le calendrier</Button>}
        />
        <Jumbotron
          eyebrow="Nouveau"
          title="Alertes de prix personnalisées"
          description="Soyez notifié dès qu'un titre atteint votre seuil."
          backgroundImage={placeholderImage("#1a1440", "#7c5cff")}
          imageFilter="grayscale"
          actions={<Button selected>Configurer une alerte</Button>}
        />
        <Jumbotron
          eyebrow="Résultats"
          title="Saison des résultats T3"
          description="Consultez le calendrier des publications de vos titres suivis."
          backgroundImage={placeholderImage("#062018", "#2fae6b")}
          imageFilter="grayscale"
          actions={<Button selected>Voir les résultats</Button>}
        />
      </Carousel>
    </div>
  ),
};

const SLIDE_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  border: "1px solid var(--lq-color-border-subtle)",
  borderRadius: "var(--lq-radius-lg)",
  backgroundColor: "var(--lq-color-panel)",
  fontSize: "1.1rem",
  fontWeight: 600,
};

export const SimpleContent: Story = {
  name: "Contenu simple",
  render: () => (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <Carousel height={180} dots arrows>
        <div style={SLIDE_STYLE}>Diapositive 1</div>
        <div style={SLIDE_STYLE}>Diapositive 2</div>
        <div style={SLIDE_STYLE}>Diapositive 3</div>
      </Carousel>
    </div>
  ),
};
