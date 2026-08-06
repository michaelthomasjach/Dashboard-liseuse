import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TreeView } from "./TreeView";
import { FolderIcon, FileIcon } from "../icons";

const meta: Meta<typeof TreeView> = {
  title: "Primitives/TreeView",
  component: TreeView,
};
export default meta;
type Story = StoryObj<typeof TreeView>;

const NODES = [
  {
    id: "portfolios",
    label: "Portefeuilles",
    icon: <FolderIcon size={16} />,
    children: [
      {
        id: "growth",
        label: "Croissance",
        icon: <FolderIcon size={16} />,
        children: [
          { id: "growth-report", label: "Rapport T2.pdf", icon: <FileIcon size={16} /> },
          { id: "growth-holdings", label: "Positions.csv", icon: <FileIcon size={16} /> },
        ],
      },
      {
        id: "income",
        label: "Revenu",
        icon: <FolderIcon size={16} />,
        children: [{ id: "income-report", label: "Rapport T2.pdf", icon: <FileIcon size={16} /> }],
      },
    ],
  },
  { id: "statements", label: "Relevés.zip", icon: <FileIcon size={16} /> },
];

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState<string | null>("growth-report");
    return (
      <div style={{ maxWidth: 280 }}>
        <TreeView nodes={NODES} selectedId={selected} onSelect={setSelected} defaultExpandedIds={["portfolios", "growth"]} />
      </div>
    );
  },
};
