import type { Meta, StoryObj } from "@storybook/react";
import { Sparkline } from "./Sparkline";

const meta: Meta<typeof Sparkline> = {
  title: "Charts/Sparkline",
  component: Sparkline,
};
export default meta;
type Story = StoryObj<typeof Sparkline>;

const UP = [12, 12.4, 12.1, 12.8, 13.2, 13.0, 13.6, 14.1, 13.9, 14.5];
const DOWN = [14.5, 14.2, 14.4, 13.8, 13.5, 13.7, 13.1, 12.6, 12.8, 12.2];

export const InTable: Story = {
  name: "Ligne de tableau",
  render: () => (
    <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
      <tbody>
        <tr>
          <td style={{ padding: 8 }}>AAPL</td>
          <td style={{ padding: 8 }}>
            <Sparkline data={UP} colorByTrend area />
          </td>
        </tr>
        <tr>
          <td style={{ padding: 8 }}>TSLA</td>
          <td style={{ padding: 8 }}>
            <Sparkline data={DOWN} colorByTrend area />
          </td>
        </tr>
      </tbody>
    </table>
  ),
};
