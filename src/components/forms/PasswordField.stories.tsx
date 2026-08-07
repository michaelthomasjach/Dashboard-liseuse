import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { PasswordField } from "./PasswordField";

const meta: Meta<typeof PasswordField> = {
  title: "Forms/PasswordField",
  component: PasswordField,
};
export default meta;
type Story = StoryObj<typeof PasswordField>;

// Pre-filled on purpose: a native `placeholder` is always shown in clear text by the
// browser (it's never masked, even under type="password"), so toggling visibility on an
// *empty* field looks like nothing happened. With real characters typed in, the eye
// button's effect is obvious.
export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("MonMotDePasse123");
    return (
      <div style={{ maxWidth: 280 }}>
        <PasswordField label="Mot de passe" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <div style={{ maxWidth: 280 }}>
        <PasswordField label="Mot de passe" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Tapez pour voir le bascule…" />
      </div>
    );
  },
};
