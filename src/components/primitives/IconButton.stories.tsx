import type { Meta, StoryObj } from "@storybook/react";
import { IconButton } from "./IconButton";
import { PlayIcon, PrevTrackIcon, NextTrackIcon, SpeakerIcon } from "../icons";

const meta: Meta<typeof IconButton> = {
  title: "Primitives/IconButton",
  component: IconButton,
  args: { icon: <PlayIcon />, ariaLabel: "Lecture" },
};
export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {};
export const Small: Story = { args: { size: "sm", icon: <SpeakerIcon /> } };

export const TransportRow: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12 }}>
      <IconButton icon={<PrevTrackIcon />} ariaLabel="Précédent" />
      <IconButton icon={<PlayIcon />} ariaLabel="Lecture" />
      <IconButton icon={<NextTrackIcon />} ariaLabel="Suivant" />
    </div>
  ),
};
