import type { Meta, StoryObj } from "@storybook/react";
import { ClockWidget } from "./ClockWidget";
import { MoonIcon, HomeIcon } from "../icons";

const meta: Meta<typeof ClockWidget> = {
  title: "Widgets/ClockWidget",
  component: ClockWidget,
  args: {
    time: "20:14",
    date: "samedi 7 juin",
  },
};
export default meta;
type Story = StoryObj<typeof ClockWidget>;

export const Default: Story = {
  args: {
    icon: <MoonIcon />,
    presence: (
      <>
        <HomeIcon size={18} /> Ulrich est à la maison
      </>
    ),
  },
  render: (args) => (
    <div style={{ maxWidth: 320 }}>
      <ClockWidget {...args} />
    </div>
  ),
};
