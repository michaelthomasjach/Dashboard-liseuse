import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Dropzone } from "./Dropzone";

const meta: Meta<typeof Dropzone> = {
  title: "Forms/Dropzone",
  component: Dropzone,
};
export default meta;
type Story = StoryObj<typeof Dropzone>;

export const Default: Story = {
  render: () => {
    const [files, setFiles] = useState<File[]>([]);
    return (
      <div style={{ maxWidth: 360 }}>
        <Dropzone
          label="Relevé bancaire"
          hint="PDF ou CSV, 10 Mo max"
          accept=".pdf,.csv"
          maxSizeMB={10}
          files={files}
          onFilesSelected={(f) => setFiles((prev) => [...prev, ...f])}
          onRemoveFile={(i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
        />
      </div>
    );
  },
};

export const WithError: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <Dropzone label="Pièce d'identité" error="Format non supporté" onFilesSelected={() => {}} />
    </div>
  ),
};
