import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TextField } from "./TextField";
import { SearchIcon } from "../icons";

const meta: Meta<typeof TextField> = {
  title: "Forms/TextField",
  component: TextField,
};
export default meta;
type Story = StoryObj<typeof TextField>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <div style={{ maxWidth: 280 }}>
        <TextField label="Nom du portefeuille" placeholder="Mon portefeuille" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
    );
  },
};

export const WithIconAndHelper: Story = {
  render: () => (
    <div style={{ maxWidth: 280 }}>
      <TextField label="Rechercher un actif" placeholder="AAPL, MSFT…" leadingIcon={<SearchIcon size={16} />} helperText="Symbole ou nom de société" />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div style={{ maxWidth: 280 }}>
      <TextField label="Email" defaultValue="pas-un-email" error="Adresse email invalide" />
    </div>
  ),
};
