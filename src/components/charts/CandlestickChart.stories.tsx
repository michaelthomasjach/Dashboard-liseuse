import type { Meta, StoryObj } from "@storybook/react";
import { CandlestickChart } from "./CandlestickChart";
import { generateCandles } from "../../test-data/financeSampleData";

const meta: Meta<typeof CandlestickChart> = {
  title: "Charts/CandlestickChart",
  component: CandlestickChart,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof CandlestickChart>;

// Generated once at module load (not inside `render`, which re-runs on every interaction) —
// a real app would memoize its own data the same way rather than regenerate it per render.
const LARGE_DATASET = generateCandles(10_000, 180, 44);

export const Default: Story = {
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        Molette pour zoomer, glisser dans le graphe pour naviguer (glisser pan aussi bien l'axe des prix que l'axe des
        dates à la fois — utile une fois rescalé verticalement pour retrouver des bougies sorties de l'écran). Glisser
        sur l'axe des prix (gauche) rescale verticalement, glisser sur l'axe des dates (bas) rescale horizontalement —
        jusqu'à n'afficher qu'une seule bougie. Survoler le graphe affiche le prix et la date exacts directement sur
        les axes, au lieu d'une infobulle flottante. Bouton en haut à droite pour le plein écran.
      </p>
      <CandlestickChart data={generateCandles(220, 180, 11)} />
    </div>
  ),
};

export const WithoutVolume: Story = {
  render: () => (
    <div style={{ padding: 24 }}>
      <CandlestickChart data={generateCandles(120, 90, 22)} showVolume={false} height={320} />
    </div>
  ),
};

export const WithDrawingTools: Story = {
  name: "Outils de dessin",
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        Bouton "ligne de tendance" dans la colonne d'outils à droite du graphe (une vraie zone réservée, pas des
        boutons superposés — elle reste visible en plein écran). 1er clic = début de la ligne, 2ème clic = fin (la
        ligne suit le curseur entre les deux). Échap ou re-clic sur l'outil annule. Survoler une ligne dessinée fait
        apparaître des poignées à ses extrémités — glisser une poignée pour la redéfinir, ou glisser directement sur
        la ligne pour la déplacer entièrement. Les lignes sont ancrées en coordonnées date/prix : elles suivent le
        zoom et le déplacement du graphe.
      </p>
      <CandlestickChart data={generateCandles(220, 180, 33)} drawingTools />
    </div>
  ),
};

export const LargeDataset: Story = {
  name: "Grand volume de données (10 000 bougies)",
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        10 000 bougies (~38 ans de séance). Les bougies, le volume, le crosshair et les lignes de dessin sont rendus
        sur un seul <code>canvas</code> plutôt qu'un nœud SVG par bougie — zoom/pan/dessin restent fluides à cette
        échelle. Molette ou glisser pour naviguer dans l'historique.
      </p>
      <CandlestickChart data={LARGE_DATASET} drawingTools />
    </div>
  ),
};
