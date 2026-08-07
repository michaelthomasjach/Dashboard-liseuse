import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DashboardGrid, DashboardGridItem } from "./DashboardGrid";
import { ClockWidget } from "./ClockWidget";
import { DayTimelineWidget } from "./DayTimelineWidget";
import { MusicPlayerWidget } from "./MusicPlayerWidget";
import { WeatherWidget } from "./WeatherWidget";
import { MetricListWidget } from "./MetricListWidget";
import { ShuttersWidget, type ShutterEntry } from "./ShuttersWidget";
import { LightsWidget, type LightEntry } from "./LightsWidget";
import { LightDetailModal } from "./LightDetailModal";
import { EnergyWidget } from "./EnergyWidget";
import {
  MoonIcon,
  SunriseIcon,
  SunIcon,
  SunsetIcon,
  BedIcon,
  LogoutIcon,
  PartlyCloudyIcon,
  WindIcon,
  SolarPanelIcon,
} from "../icons";

const meta: Meta = {
  title: "Dashboard/Maison — tableau de bord",
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj;

const INITIAL_SHUTTERS: ShutterEntry[] = [
  { id: "salle-a-manger", label: "Salle à manger", on: true, level: 100, statusText: "ouvert" },
  { id: "salon-tv", label: "Salon TV", on: true, level: 51, statusText: "51 %" },
  { id: "salon-the", label: "Salon thé", on: true, level: 38, statusText: "38 %" },
  { id: "chambre-invite", label: "Chambre invité", on: false, level: 0, statusText: "fermé" },
  { id: "portail", label: "Portail", on: false, level: 0, statusText: "fermé" },
];

const INITIAL_LIGHTS: LightEntry[] = [
  { id: "cuisine", label: "Cuisine", on: true, level: 76, statusText: "76 %" },
  { id: "sejour", label: "Séjour", on: true, level: 80, statusText: "80 %" },
  { id: "bureau", label: "Bureau", on: false, level: 0, statusText: "éteint" },
  { id: "ewenn", label: "Chambre Ewenn", on: true, level: 100, statusText: "100 %" },
];

export const Maison: Story = {
  render: () => {
    const [shutters, setShutters] = useState(INITIAL_SHUTTERS);
    const [lights, setLights] = useState(INITIAL_LIGHTS);
    const [isPlaying, setIsPlaying] = useState(true);
    const [openLightId, setOpenLightId] = useState<string | null>(null);
    const activeLight = lights.find((l) => l.id === openLightId) ?? null;

    return (
      <DashboardGrid columns="1.1fr 1fr 1fr">
        <DashboardGridItem>
          <ClockWidget time="09:34" date="Jeudi 11 Juin" icon={<SunIcon />} />

          <DayTimelineWidget
            items={[
              { id: "matin", icon: <SunriseIcon />, label: "Matin" },
              { id: "debut", icon: <SunIcon />, label: "Début de journée" },
              { id: "fin", icon: <SunsetIcon />, label: "Fin de journée" },
              { id: "dodo", icon: <BedIcon />, label: "Dodo" },
              { id: "depart", icon: <LogoutIcon />, label: "Départ" },
            ]}
          />

          <MusicPlayerWidget
            title="I've Never Met Her"
            artist="Ally Salort · I've Never Met Her - Single"
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying((p) => !p)}
            onPrev={() => {}}
            onNext={() => {}}
            volume={5}
          />

          <WeatherWidget
            icon={<PartlyCloudyIcon animated />}
            temperature="12"
            condition="Partiellement nuageux"
            min="11"
            max="21"
            precipitation="0 %"
            alert={{ icon: <WindIcon size={16} />, label: "Vigilance jaune — Vent" }}
            forecastTitle="Prévision 5 jours"
            forecast={[
              { id: "auj", label: "Auj.", icon: <PartlyCloudyIcon size={20} />, max: "21", min: "11" },
              { id: "ven", label: "Ven.", icon: <SunIcon size={20} />, max: "24", min: "13" },
              { id: "sam", label: "Sam.", icon: <PartlyCloudyIcon size={20} />, max: "29", min: "13" },
              { id: "dim", label: "Dim.", icon: <SunIcon size={20} />, max: "30", min: "15" },
              { id: "lun", label: "Lun.", icon: <SunIcon size={20} />, max: "34", min: "19" },
            ]}
          />
        </DashboardGridItem>

        <DashboardGridItem>
          <MetricListWidget
            title="Intérieur"
            meta="6 pièces"
            rows={[
              { id: "salon", label: "Salon", value: "19,5°" },
              { id: "ewenn", label: "Chambre Ewenn", value: "19,3°" },
              { id: "bureau", label: "Bureau", value: "19,0°" },
              { id: "parents", label: "Chambre parents", value: "19,6°" },
              { id: "salon-tv", label: "Salon TV", value: "19,3°" },
              { id: "sdb", label: "Salle de bain", value: "18,8°" },
            ]}
          />

          <LightsWidget
            meta={`${lights.filter((l) => l.on).length} allumées`}
            lights={lights.map((l) => ({ ...l, onClick: () => setOpenLightId(l.id) }))}
          />
        </DashboardGridItem>

        <DashboardGridItem>
          <ShuttersWidget
            meta={`${shutters.filter((s) => s.on).length} ouverts`}
            shutters={shutters.map((s) => ({
              ...s,
              onToggle: (on) =>
                setShutters((prev) =>
                  prev.map((p) => (p.id === s.id ? { ...p, on, level: on ? 100 : 0, statusText: on ? "ouvert" : "fermé" } : p))
                ),
            }))}
          />

          <EnergyWidget
            rows={[
              {
                id: "solar",
                icon: <SolarPanelIcon />,
                label: "Solaire produit aujourd'hui",
                value: "1,0 kWh",
                details: ["442 W à l'instant", "Hier · 20,9 kWh"],
              },
              { id: "battery", label: "Batterie maison", value: "11 %", gaugePercent: 11 },
              { id: "network", label: "Réseau consommé aujourd'hui", value: "7,7 kWh" },
              { id: "cost", label: "Coût du jour", value: "1,24 €" },
            ]}
          />
        </DashboardGridItem>

        {activeLight && (
          <LightDetailModal
            open
            onClose={() => setOpenLightId(null)}
            roomName={activeLight.label}
            on={activeLight.on}
            onPowerChange={(on) =>
              setLights((prev) =>
                prev.map((l) => (l.id === activeLight.id ? { ...l, on, statusText: on ? "allumé" : "éteint" } : l))
              )
            }
            whiteBalanceOptions={[
              { id: "warm", label: "Blanc chaud" },
              { id: "soft", label: "Blanc doux" },
              { id: "neutral", label: "Blanc neutre" },
              { id: "cold", label: "Blanc froid" },
              { id: "daylight", label: "Lumière du jour" },
            ]}
            whiteBalance="warm"
            colorOptions={[
              { id: "red", label: "Rouge", color: "#ef4444" },
              { id: "amber", label: "Ambre", color: "#f59e0b" },
              { id: "green", label: "Vert", color: "#22c55e" },
              { id: "blue", label: "Bleu", color: "#3b82f6" },
              { id: "rose", label: "Rose", color: "#ec4899" },
              { id: "violet", label: "Violet", color: "#8b5cf6" },
            ]}
          />
        )}
      </DashboardGrid>
    );
  },
};

export const MoonHeader: Story = {
  name: "Clock — variante nuit",
  render: () => (
    <div style={{ maxWidth: 320 }}>
      <ClockWidget time="23:47" date="dimanche 8 juin" icon={<MoonIcon />} />
    </div>
  ),
};
