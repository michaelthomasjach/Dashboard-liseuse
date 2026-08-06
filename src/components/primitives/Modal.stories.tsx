import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { FieldGroup } from "./FieldGroup";
import { ColorSwatchButton } from "./ColorSwatchButton";

const meta: Meta<typeof Modal> = {
  title: "Primitives/Modal",
  component: Modal,
};
export default meta;
type Story = StoryObj<typeof Modal>;

export const LightDetail: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Ouvrir la modale</Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Cuisine">
          <FieldGroup label="Allumage">
            <Button selected>Allumer</Button>
            <Button>Éteindre</Button>
          </FieldGroup>
          <FieldGroup label="Température">
            <Button selected>Blanc chaud</Button>
            <Button>Blanc doux</Button>
            <Button>Blanc neutre</Button>
            <Button>Blanc froid</Button>
          </FieldGroup>
          <FieldGroup label="Couleur">
            <ColorSwatchButton label="Rouge" color="#ef4444" />
            <ColorSwatchButton label="Ambre" color="#f59e0b" selected />
            <ColorSwatchButton label="Vert" color="#22c55e" />
          </FieldGroup>
        </Modal>
      </>
    );
  },
};
