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

export const Default: Story = {
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        Molette pour zoomer, glisser dans le graphe pour naviguer. Glisser sur l'axe des prix (gauche) rescale
        verticalement, glisser sur l'axe des dates (bas) rescale horizontalement. Bouton en haut à droite pour le plein
        écran.
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
        Bouton "ligne de tendance" dans la barre d'outils à droite du graphe. 1er clic = début de la ligne, 2ème clic
        = fin (la ligne suit le curseur entre les deux). Échap ou re-clic sur l'outil annule. Survoler une ligne
        dessinée fait apparaître des poignées à ses extrémités — glisser une poignée pour la redéfinir. Les lignes
        sont ancrées en coordonnées date/prix : elles suivent le zoom et le déplacement du graphe.
      </p>
      <CandlestickChart data={generateCandles(220, 180, 33)} drawingTools />
    </div>
  ),
};
