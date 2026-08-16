import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ChartWorkspace } from "./ChartWorkspace";
import { CandlestickChart } from "./CandlestickChart";
import { generateCandles } from "../../test-data/financeSampleData";

const meta: Meta<typeof ChartWorkspace> = {
  title: "Charts/ChartWorkspace",
  component: ChartWorkspace,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof ChartWorkspace>;

// Different lengths/base prices/seeds per symbol on purpose — proves the crosshair sync lines up
// by *date*, not by raw candle index, across panels whose own data doesn't otherwise match up.
const DATASETS: Record<string, ReturnType<typeof generateCandles>> = {
  AAPL: generateCandles(400, 190, 11),
  MSFT: generateCandles(320, 410, 27),
  NVDA: generateCandles(400, 120, 42),
  GOOGL: generateCandles(260, 165, 58),
};

export const FourPanels: Story = {
  name: "4 panneaux (2 liés)",
  render: () => {
    const [groups, setGroups] = useState<number[][]>([[0, 1]]);
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          `panels={4}` — AAPL et MSFT (panneaux 1 et 2) sont liés par défaut (`defaultLinkGroups`) : survoler
          l'une des deux affiche le crosshair sur l'autre, à la date la plus proche dans <em>ses propres</em>{" "}
          données (longueurs et plages différentes entre les quatre séries, exprès). NVDA et GOOGL ne sont liés à
          rien. Cliquer l'icône chaîne (en haut à droite de n'importe quel panneau) ouvre la même modale de
          gestion des groupes pour les quatre.
        </p>
        <ChartWorkspace panels={4} defaultLinkGroups={groups} onLinkGroupsChange={setGroups}>
          <CandlestickChart data={DATASETS.AAPL} symbol="AAPL" zoomable />
          <CandlestickChart data={DATASETS.MSFT} symbol="MSFT" zoomable />
          <CandlestickChart data={DATASETS.NVDA} symbol="NVDA" zoomable />
          <CandlestickChart data={DATASETS.GOOGL} symbol="GOOGL" zoomable />
        </ChartWorkspace>
      </div>
    );
  },
};

export const TwoPanels: Story = {
  name: "2 panneaux",
  render: () => (
    <div style={{ padding: 24 }}>
      <ChartWorkspace panels={2}>
        <CandlestickChart data={DATASETS.AAPL} symbol="AAPL" zoomable />
        <CandlestickChart data={DATASETS.MSFT} symbol="MSFT" zoomable />
      </ChartWorkspace>
    </div>
  ),
};
