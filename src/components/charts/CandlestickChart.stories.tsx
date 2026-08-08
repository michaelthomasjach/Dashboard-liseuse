import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CandlestickChart, type TimeframeEntry } from "./CandlestickChart";
import { Checkbox } from "../forms/Checkbox";
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
const MEDIUM_DATASET = generateCandles(2_500, 180, 44);
const ALL_FEATURES_DATASET = generateCandles(600, 180, 66);

const TIMEFRAMES: TimeframeEntry[] = [
  { group: "Minutes", options: [{ label: "1 minute", value: "1m" }, { label: "5 minutes", value: "5m" }, { label: "15 minutes", value: "15m" }] },
  { group: "Heures", options: [{ label: "1 heure", value: "1h" }, { label: "4 heures", value: "4h" }] },
  { group: "Jours", options: [{ label: "1 jour", value: "1d" }, { label: "1 semaine", value: "1w" }, { label: "1 mois", value: "1M" }] },
];

export const Default: Story = {
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        Molette pour zoomer, glisser dans le graphe pour naviguer (glisser pan aussi bien l'axe des prix que l'axe des
        dates à la fois — utile une fois rescalé verticalement pour retrouver des bougies sorties de l'écran). Glisser
        sur l'axe des prix (droite) rescale verticalement, glisser sur l'axe des dates (bas) rescale horizontalement —
        jusqu'à n'afficher qu'une seule bougie, sans jamais faire chevaucher les bougies entre elles. Survoler le
        graphe affiche le prix et la date exacts directement sur les axes, au lieu d'une infobulle flottante.
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
        Bouton "ligne de tendance" dans la colonne d'outils à gauche du graphe (une vraie zone réservée, pas des
        boutons superposés — elle reste visible en plein écran). 1er clic = début de la ligne, 2ème clic = fin (la
        ligne suit le curseur entre les deux). Échap ou re-clic sur l'outil annule. Survoler une ligne dessinée fait
        apparaître des poignées à ses extrémités — glisser une poignée pour la redéfinir, ou glisser directement sur
        la ligne pour la déplacer entièrement. <strong>Double-clic sur une ligne</strong> pour l'éditer (texte,
        épaisseur, couleur, coordonnées) dans une modale. Les lignes sont ancrées en coordonnées date/prix : elles
        suivent le zoom et le déplacement du graphe.
      </p>
      <CandlestickChart data={generateCandles(220, 180, 33)} drawingTools />
    </div>
  ),
};

export const WithTimeframeHeader: Story = {
  name: "Sélecteur d'intervalle",
  render: () => {
    const [timeframe, setTimeframe] = useState("1d");
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          Barre d'en-tête (pas flottante — un vrai bandeau qui prend sa propre place) avec un sélecteur d'intervalle
          groupé, à côté des boutons zoom/plein écran. Le composant se contente d'afficher la sélection et de
          remonter `onTimeframeChange` — c'est à l'app de rééchantillonner `data` dans le nouvel intervalle.
        </p>
        <CandlestickChart
          data={generateCandles(220, 180, 55)}
          timeframes={TIMEFRAMES}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
        />
      </div>
    );
  },
};

export const WithIndicators: Story = {
  name: "Indicateurs techniques",
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        Bouton dans l'en-tête (icône activité) ouvre une modale listant les indicateurs disponibles (SMA, EMA, WMA) —
        cliquer une entrée l'ajoute au graphe, la modale reste ouverte pour en ajouter plusieurs. Les indicateurs
        actifs sont listés en haut à gauche du graphe, séparés par un simple trait (pas de bordure autour de chaque
        entrée) ; survoler une entrée fait apparaître trois icônes : œil (masque/affiche le tracé sans le supprimer
        de la liste), corbeille (suppression directe) et roue crantée (paramètres — période, couleur —{" "}
        <strong>double-clic sur l'entrée</strong> fait la même chose). Superposés sur le tracé des prix, ils suivent
        le zoom/déplacement comme les bougies.
      </p>
      <CandlestickChart data={generateCandles(220, 180, 77)} showIndicators />
    </div>
  ),
};

export const AllFeatures: Story = {
  name: "Toutes les options",
  render: () => {
    const [timeframe, setTimeframe] = useState("1d");
    const [showVolume, setShowVolume] = useState(true);
    const [yAutoScaling, setYAutoScaling] = useState(false);
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          Tout combiné : outils de dessin (`drawingTools`), indicateurs techniques (`showIndicators` — bouton dans
          l'en-tête, liste des indicateurs actifs en haut à gauche du graphe), plein écran (`fullscreenToggle`),
          sélecteur d'intervalle (`timeframes`), zoom/pan (`zoomable`), volume masquable (`showVolume`) et rescale
          automatique de l'axe Y (`YAutoScaling`), tous les deux cochables ci-dessous.
        </p>
        <div style={{ marginBottom: 12, display: "flex", gap: 16 }}>
          <Checkbox checked={showVolume} onChange={setShowVolume} label="Afficher le volume" />
          <Checkbox checked={yAutoScaling} onChange={setYAutoScaling} label="YAutoScaling" />
        </div>
        <CandlestickChart
          data={ALL_FEATURES_DATASET}
          drawingTools
          showIndicators
          fullscreenToggle
          zoomable
          showVolume={showVolume}
          YAutoScaling={yAutoScaling}
          timeframes={TIMEFRAMES}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
        />
      </div>
    );
  },
};

export const LargeDataset: Story = {
  name: "Grand volume de données (2 500 bougies)",
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        2 500 bougies (~10 ans de séance). Les bougies, le volume, le crosshair et les lignes de dessin sont rendus
        sur un seul <code>canvas</code> plutôt qu'un nœud SVG par bougie — zoom/pan/dessin restent fluides à cette
        échelle. Molette ou glisser pour naviguer dans l'historique. S'ouvre sur les 500 dernières bougies par défaut
        (`initialVisibleCandles`, appliqué une seule fois au montage) plutôt que tout l'historique dézoomé — clic sur
        "Réinitialiser le zoom" pour voir les 2 500.
      </p>
      <CandlestickChart data={MEDIUM_DATASET} drawingTools timeframes={TIMEFRAMES} timeframe="1d" />
    </div>
  ),
};

export const WithYAutoScaling: Story = {
  name: "Rescale automatique de l'axe Y",
  render: () => {
    const [yAutoScaling, setYAutoScaling] = useState(true);
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          `YAutoScaling` : l'axe des prix se recadre en continu sur le min/max des bougies actuellement visibles
          (recalculé à chaque pan/zoom horizontal), au lieu d'une échelle figée sur tout l'historique — utile en
          particulier avec `initialVisibleCandles` (2 500 bougies ici, ouvert sur les 500 dernières). Dès que tu
          zoomes/glisses **sur l'axe des prix lui-même** (molette ou glisser dessus, ou glisser verticalement dans le
          graphe), ce recadrage automatique s'arrête pour ne pas écraser ton réglage — "Réinitialiser le zoom" le
          réactive.
        </p>
        <div style={{ marginBottom: 12 }}>
          <Checkbox checked={yAutoScaling} onChange={setYAutoScaling} label="YAutoScaling" />
        </div>
        <CandlestickChart data={MEDIUM_DATASET} YAutoScaling={yAutoScaling} timeframes={TIMEFRAMES} timeframe="1d" />
      </div>
    );
  },
};
