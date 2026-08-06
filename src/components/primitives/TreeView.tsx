import { useState, type ReactNode } from "react";
import { ChevronRightIcon } from "../icons";
import "./TreeView.css";

export interface TreeNode {
  id: string;
  label: string;
  icon?: ReactNode;
  children?: TreeNode[];
  disabled?: boolean;
}

export interface TreeViewProps {
  nodes: TreeNode[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  defaultExpandedIds?: string[];
  /** Controlled expanded set; pass with `onExpandedChange` to own the state yourself. */
  expandedIds?: string[];
  onExpandedChange?: (ids: string[]) => void;
  className?: string;
}

/** Recursive expand/collapse tree — file explorers, category trees, org charts. */
export function TreeView({
  nodes,
  selectedId,
  onSelect,
  defaultExpandedIds = [],
  expandedIds,
  onExpandedChange,
  className,
}: TreeViewProps) {
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(new Set(defaultExpandedIds));
  const expanded = expandedIds ? new Set(expandedIds) : internalExpanded;

  function toggle(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (expandedIds) onExpandedChange?.(Array.from(next));
    else setInternalExpanded(next);
  }

  return (
    <ul className={["lq-tree", className].filter(Boolean).join(" ")} role="tree">
      {nodes.map((node) => (
        <TreeItem key={node.id} node={node} depth={0} expanded={expanded} onToggle={toggle} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  depth,
  expanded,
  onToggle,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isOpen = expanded.has(node.id);
  const isSelected = node.id === selectedId;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isOpen : undefined} aria-selected={isSelected}>
      <div
        className={["lq-tree__row", isSelected && "lq-tree__row--selected", node.disabled && "lq-tree__row--disabled"]
          .filter(Boolean)
          .join(" ")}
        style={{ paddingLeft: depth * 18 + 8 }}
      >
        <button
          type="button"
          className={["lq-tree__toggle", !hasChildren && "lq-tree__toggle--spacer"].filter(Boolean).join(" ")}
          onClick={() => hasChildren && onToggle(node.id)}
          aria-label={hasChildren ? (isOpen ? "Réduire" : "Développer") : undefined}
          tabIndex={hasChildren ? 0 : -1}
        >
          {hasChildren && <ChevronRightIcon size={14} className={isOpen ? "lq-tree__chevron lq-tree__chevron--open" : "lq-tree__chevron"} />}
        </button>
        <button
          type="button"
          className="lq-tree__label"
          disabled={node.disabled}
          onClick={() => {
            onSelect?.(node.id);
            if (hasChildren) onToggle(node.id);
          }}
        >
          {node.icon}
          {node.label}
        </button>
      </div>

      {hasChildren && isOpen && (
        <ul role="group">
          {node.children!.map((child) => (
            <TreeItem key={child.id} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}
