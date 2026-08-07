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

export type TreeDropPosition = "before" | "after" | "inside";

export interface TreeViewProps {
  nodes: TreeNode[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  defaultExpandedIds?: string[];
  /** Controlled expanded set; pass with `onExpandedChange` to own the state yourself. */
  expandedIds?: string[];
  onExpandedChange?: (ids: string[]) => void;
  /** Enables drag-and-drop reordering/reparenting; called on drop with the dragged node's id, the
   *  node it was dropped on, and where relative to it. Pair with `moveTreeNode` to update `nodes`. */
  onMove?: (draggedId: string, targetId: string, position: TreeDropPosition) => void;
  className?: string;
}

interface DragState {
  draggedId: string | null;
  overId: string | null;
  position: TreeDropPosition | null;
}

const NO_DRAG: DragState = { draggedId: null, overId: null, position: null };

/** Recursive expand/collapse tree — file explorers, category trees, org charts. Pass `onMove` to
 *  enable drag-and-drop; see `moveTreeNode` for a ready-made immutable reducer. */
export function TreeView({
  nodes,
  selectedId,
  onSelect,
  defaultExpandedIds = [],
  expandedIds,
  onExpandedChange,
  onMove,
  className,
}: TreeViewProps) {
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(new Set(defaultExpandedIds));
  const [dragState, setDragState] = useState<DragState>(NO_DRAG);
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
        <TreeItem
          key={node.id}
          node={node}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          selectedId={selectedId}
          onSelect={onSelect}
          onMove={onMove}
          dragState={dragState}
          setDragState={setDragState}
        />
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
  onMove,
  dragState,
  setDragState,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMove?: (draggedId: string, targetId: string, position: TreeDropPosition) => void;
  dragState: DragState;
  setDragState: (updater: DragState | ((s: DragState) => DragState)) => void;
}) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isOpen = expanded.has(node.id);
  const isSelected = node.id === selectedId;
  const draggable = Boolean(onMove) && !node.disabled;
  const isDragging = dragState.draggedId === node.id;
  const isDropTarget = dragState.overId === node.id && dragState.draggedId !== node.id;

  return (
    <li
      role="treeitem"
      aria-expanded={hasChildren ? isOpen : undefined}
      aria-selected={isSelected}
      aria-disabled={node.disabled}
    >
      <div
        className={[
          "lq-tree__row",
          isSelected && "lq-tree__row--selected",
          node.disabled && "lq-tree__row--disabled",
          isDragging && "lq-tree__row--dragging",
          isDropTarget && dragState.position && `lq-tree__row--drop-${dragState.position}`,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ paddingLeft: depth * 18 + 8 }}
        draggable={draggable}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", node.id);
          setDragState({ draggedId: node.id, overId: null, position: null });
        }}
        onDragEnd={() => setDragState(NO_DRAG)}
        onDragOver={(e) => {
          if (!onMove || !dragState.draggedId || dragState.draggedId === node.id) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientY - rect.top) / rect.height;
          const position: TreeDropPosition = ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";
          setDragState((s) => (s.overId === node.id && s.position === position ? s : { ...s, overId: node.id, position }));
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragState((s) => (s.overId === node.id ? { ...s, overId: null, position: null } : s));
        }}
        onDrop={(e) => {
          e.preventDefault();
          const draggedId = dragState.draggedId ?? e.dataTransfer.getData("text/plain");
          if (onMove && draggedId && draggedId !== node.id) {
            onMove(draggedId, node.id, dragState.position ?? "after");
          }
          setDragState(NO_DRAG);
        }}
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
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
              onMove={onMove}
              dragState={dragState}
              setDragState={setDragState}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Immutable helper for `onMove`: removes the dragged node from wherever it is
 * in the tree and re-inserts it before/after/inside the target node. Returns
 * the original array unchanged if the move would be a no-op or would nest a
 * node inside its own descendant.
 */
// eslint-disable-next-line react-refresh/only-export-components -- pure helper colocated with the component that uses it
export function moveTreeNode(nodes: TreeNode[], draggedId: string, targetId: string, position: TreeDropPosition): TreeNode[] {
  if (draggedId === targetId) return nodes;

  let draggedNode: TreeNode | null = null;

  function remove(list: TreeNode[]): TreeNode[] {
    const next: TreeNode[] = [];
    for (const n of list) {
      if (n.id === draggedId) {
        draggedNode = n;
        continue;
      }
      next.push(n.children ? { ...n, children: remove(n.children) } : n);
    }
    return next;
  }

  const withoutDragged = remove(nodes);
  if (!draggedNode) return nodes;

  function isDescendant(node: TreeNode, id: string): boolean {
    if (!node.children) return false;
    return node.children.some((c) => c.id === id || isDescendant(c, id));
  }
  if (isDescendant(draggedNode, targetId)) return nodes;

  function insert(list: TreeNode[]): TreeNode[] {
    const next: TreeNode[] = [];
    for (const n of list) {
      if (n.id === targetId) {
        if (position === "before") {
          next.push(draggedNode as TreeNode, n);
        } else if (position === "after") {
          next.push(n, draggedNode as TreeNode);
        } else {
          next.push({ ...n, children: [...(n.children ?? []), draggedNode as TreeNode] });
        }
        continue;
      }
      next.push(n.children ? { ...n, children: insert(n.children) } : n);
    }
    return next;
  }

  return insert(withoutDragged);
}
