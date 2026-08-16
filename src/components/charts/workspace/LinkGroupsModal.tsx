import { useEffect, useState } from "react";
import { Modal } from "../../primitives/Modal";
import { Checkbox } from "../../forms/Checkbox";
import { CloseIcon } from "../../icons";

export interface LinkGroupsModalProps {
  open: boolean;
  onClose: () => void;
  panelCount: number;
  groups: number[][];
  onLink: (panelIndices: number[]) => void;
  onUnlink: (groupIndex: number) => void;
}

/** The tree of "Fenêtre N" / "Groupe N" the chain-link button opens (see `ChartWorkspace`) — a
 *  staged checkbox selection (cleared every time the modal opens, not synced to `groups` itself)
 *  plus one "Lier la sélection" action that turns whatever's checked into a single group,
 *  regardless of any group those panels were already part of (see `useLinkGroups.linkPanels`'s
 *  own doc for exactly what that means for pre-existing groups). Each existing group's own header
 *  row carries a small dissolve button instead of a checkbox of its own — a group isn't itself a
 *  selectable panel, so there's nothing to link *it* to. */
export function LinkGroupsModal({ open, onClose, panelCount, groups, onLink, onUnlink }: LinkGroupsModalProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Fresh selection every time the modal opens — carrying a stale one over from a previous visit
  // would let checkboxes appear checked for panels the user never actually clicked this time.
  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  function toggle(panelIndex: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(panelIndex)) next.delete(panelIndex);
      else next.add(panelIndex);
      return next;
    });
  }

  function handleLink() {
    if (selected.size < 2) return;
    onLink([...selected]);
    setSelected(new Set());
  }

  if (!open) return null;

  const groupedIndices = new Set(groups.flat());
  const ungrouped = Array.from({ length: panelCount }, (_, i) => i).filter((i) => !groupedIndices.has(i));

  return (
    <Modal
      open
      onClose={onClose}
      title="Graphiques liés"
      footer={
        <div className="lq-chart__edit-drawing-footer">
          <button type="button" className="lq-chart__reset-button" onClick={onClose}>
            Fermer
          </button>
          <button type="button" className="lq-chart__confirm-button" onClick={handleLink} disabled={selected.size < 2}>
            Lier la sélection
          </button>
        </div>
      }
    >
      <div className="lq-link-groups__tree">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="lq-link-groups__group">
            <div className="lq-link-groups__group-header">
              <span>Groupe {groupIndex + 1}</span>
              <button
                type="button"
                className="lq-link-groups__unlink"
                onClick={() => onUnlink(groupIndex)}
                aria-label={`Dissocier le groupe ${groupIndex + 1}`}
                title="Dissocier ce groupe"
              >
                <CloseIcon size={12} />
              </button>
            </div>
            {group.map((panelIndex) => (
              <Checkbox
                key={panelIndex}
                checked={selected.has(panelIndex)}
                onChange={() => toggle(panelIndex)}
                label={`Fenêtre ${panelIndex + 1}`}
                className="lq-link-groups__nested"
              />
            ))}
          </div>
        ))}
        {ungrouped.map((panelIndex) => (
          <Checkbox key={panelIndex} checked={selected.has(panelIndex)} onChange={() => toggle(panelIndex)} label={`Fenêtre ${panelIndex + 1}`} />
        ))}
      </div>
    </Modal>
  );
}
