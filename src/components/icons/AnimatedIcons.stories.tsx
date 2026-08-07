import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { SunIcon, MoonIcon, PartlyCloudyIcon, CloudRainIcon, WindIcon } from "./icons";

const meta: Meta = {
  title: "Foundations/Animated Icons",
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj;

const ENTRIES: { label: string; static: ReactNode; animated: ReactNode; description: string }[] = [
  {
    label: "Soleil",
    static: <SunIcon size={40} />,
    animated: <SunIcon size={40} animated />,
    description: "Tourne lentement sur lui-même",
  },
  {
    label: "Lune",
    static: <MoonIcon size={40} />,
    animated: <MoonIcon size={40} animated />,
    description: "Respire doucement (échelle + opacité)",
  },
  {
    label: "Partiellement nuageux",
    static: <PartlyCloudyIcon size={40} />,
    animated: <PartlyCloudyIcon size={40} animated />,
    description: "Seul le petit soleil tourne, le nuage reste fixe",
  },
  {
    label: "Pluie",
    static: <CloudRainIcon size={40} />,
    animated: <CloudRainIcon size={40} animated />,
    description: "Les 3 gouttes tombent en boucle, décalées",
  },
  {
    label: "Vent",
    static: <WindIcon size={40} />,
    animated: <WindIcon size={40} animated />,
    description: "Ondule légèrement pour suggérer une rafale",
  },
];

export const Gallery: Story = {
  name: "Statique vs. animé (prop `animated`)",
  render: () => (
    <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "8px 16px 8px 0" }}>Icône</th>
          <th style={{ textAlign: "center", padding: "8px 16px" }}>Statique</th>
          <th style={{ textAlign: "center", padding: "8px 16px" }}>animated</th>
          <th style={{ textAlign: "left", padding: "8px 0" }}>Effet</th>
        </tr>
      </thead>
      <tbody>
        {ENTRIES.map((entry) => (
          <tr key={entry.label} style={{ borderTop: "1px solid rgba(128,128,128,0.2)" }}>
            <td style={{ padding: "12px 16px 12px 0", fontWeight: 600 }}>{entry.label}</td>
            <td style={{ padding: 12, textAlign: "center" }}>{entry.static}</td>
            <td style={{ padding: 12, textAlign: "center" }}>{entry.animated}</td>
            <td style={{ padding: "12px 0", opacity: 0.7 }}>{entry.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};
