import type { Meta, StoryObj } from "@storybook/react";
import { WeatherWidget } from "./WeatherWidget";
import { PartlyCloudyIcon, SunIcon, CloudIcon, CloudRainIcon, WindIcon } from "../icons";

const meta: Meta<typeof WeatherWidget> = {
  title: "Widgets/WeatherWidget",
  component: WeatherWidget,
};
export default meta;
type Story = StoryObj<typeof WeatherWidget>;

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <WeatherWidget
        icon={<PartlyCloudyIcon />}
        temperature="16"
        condition="Partiellement nuageux"
        min="12"
        max="21"
        precipitation="20 %"
        alert={{ icon: <WindIcon size={16} />, label: "Vigilance jaune — Vent" }}
        forecastTitle="Prévision 5 jours · Météo-France"
        forecast={[
          { id: "dim", label: "Dim.", icon: <SunIcon size={20} />, max: "23", min: "12" },
          { id: "lun", label: "Lun.", icon: <PartlyCloudyIcon size={20} />, max: "22", min: "13" },
          { id: "mar", label: "Mar.", icon: <CloudRainIcon size={20} />, max: "19", min: "13" },
          { id: "mer", label: "Mer.", icon: <CloudIcon size={20} />, max: "20", min: "15" },
          { id: "jeu", label: "Jeu.", icon: <SunIcon size={20} />, max: "24", min: "19" },
        ]}
      />
    </div>
  ),
};

export const WithoutAlertOrForecast: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <WeatherWidget icon={<SunIcon />} temperature="24" condition="Ensoleillé" min="18" max="26" />
    </div>
  ),
};
