import type { Meta, StoryObj } from "@storybook/react";
import { MetricListWidget } from "./MetricListWidget";

const meta: Meta<typeof MetricListWidget> = {
  title: "Widgets/MetricListWidget",
  component: MetricListWidget,
};
export default meta;
type Story = StoryObj<typeof MetricListWidget>;

export const RoomTemperatures: Story = {
  render: () => (
    <div style={{ maxWidth: 340 }}>
      <MetricListWidget
        title="Intérieur"
        meta="6 pièces"
        rows={[
          { id: "salon", label: "Salon", value: "21,5°" },
          { id: "ewenn", label: "Chambre Ewenn", value: "19,7°" },
          { id: "bureau", label: "Bureau", value: "20,0°" },
          { id: "parents", label: "Chambre parentale", value: "19,0°" },
          { id: "cuisine", label: "Cuisine", value: "20,8°" },
          { id: "sdb", label: "Salle de bain", value: "22,1°" },
        ]}
      />
    </div>
  ),
};
