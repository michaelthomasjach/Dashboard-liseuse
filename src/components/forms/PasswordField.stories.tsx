import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { PasswordField } from "./PasswordField";

const meta: Meta<typeof PasswordField> = {
  title: "Forms/PasswordField",
  component: PasswordField,
};
export default meta;
type Story = StoryObj<typeof PasswordField>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <div style={{ maxWidth: 280 }}>
        <PasswordField label="Mot de passe" value={value} onChange={(e) => setValue(e.target.value)} placeholder="••••••••" />
      </div>
    );
  },
};
