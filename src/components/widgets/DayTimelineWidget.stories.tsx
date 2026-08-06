import type { Meta, StoryObj } from "@storybook/react";
import { DayTimelineWidget } from "./DayTimelineWidget";
import { SunriseIcon, SunIcon, SunsetIcon, BedIcon, LogoutIcon } from "../icons";

const meta: Meta<typeof DayTimelineWidget> = {
  title: "Widgets/DayTimelineWidget",
  component: DayTimelineWidget,
};
export default meta;
type Story = StoryObj<typeof DayTimelineWidget>;

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: 340 }}>
      <DayTimelineWidget
        items={[
          { id: "matin", icon: <SunriseIcon />, label: "Matin" },
          { id: "debut", icon: <SunIcon />, label: "Début de journée" },
          { id: "fin", icon: <SunsetIcon />, label: "Fin de journée" },
          { id: "dodo", icon: <BedIcon />, label: "Dodo" },
          { id: "depart", icon: <LogoutIcon />, label: "Départ" },
        ]}
      />
    </div>
  ),
};
