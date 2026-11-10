"use client";

import { useState } from "react";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import PdvButton from "@/components/pdv/PdvButton";
import { exportAssignedCodes, type EngraveFormat } from "@/lib/pairUi";
import type { ShopPair } from "@/lib/types";

const FORMATS: Array<{ id: EngraveFormat; label: string; recommended?: boolean }> = [
  { id: "svg", label: "SVG", recommended: true },
  { id: "png", label: "PNG" },
  { id: "jpg", label: "JPG" },
  { id: "dxf", label: "DXF" },
];

type Props = {
  pairs: ShopPair[];
  onClose: (discarded: boolean) => void;
};

export default function ExportCodeModal({ pairs, onClose }: Props) {
  const [format, setFormat] = useState<EngraveFormat>("svg");
  const [pending, setPending] = useState(false);

  async function exportFiles() {
    setPending(true);
    try {
      await exportAssignedCodes(pairs, format);
      onClose(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <BootstrapModal title="Exporter le code" size="md" onClose={() => onClose(true)}>
      <div className="modal-body pdv-export">
        <div className="pdv-export__formats">
          <p className="pdv-export__label">Format du fichier</p>
          {FORMATS.map((item) => (
            <label key={item.id} className={`pdv-export__option${format === item.id ? " is-selected" : ""}`}>
              <span className="pdv-ship-radio">
                <input
                  type="radio"
                  name="pdv-export-format"
                  value={item.id}
                  checked={format === item.id}
                  onChange={() => setFormat(item.id)}
                />
                <span className="pdv-ship-radio__mark" />
              </span>
              <span className="pdv-export__format-name">{item.label}</span>
              {item.recommended ? <span className="pdv-tag pdv-tag--recommended">Recommandé</span> : null}
            </label>
          ))}
        </div>
        <div className="pdv-export__dims">
          <p className="pdv-export__label">Dimensions</p>
          <p className="pdv-export__dims-value">12 × 1,5 mm (largeur × hauteur)</p>
        </div>
      </div>
      <div className="modal-footer">
        <PdvButton type="button" variant="primary" size="l" block disabled={pending} onClick={() => void exportFiles()}>
          Exporter
        </PdvButton>
        <PdvButton type="button" variant="tertiary" disabled={pending} onClick={() => onClose(true)}>
          Annuler
        </PdvButton>
      </div>
    </BootstrapModal>
  );
}
