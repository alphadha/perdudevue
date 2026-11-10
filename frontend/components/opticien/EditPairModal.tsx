"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import PdvButton from "@/components/pdv/PdvButton";
import PdvField from "@/components/pdv/PdvField";
import PdvSelect from "@/components/pdv/PdvSelect";
import { api, ApiRequestError } from "@/lib/api";
import type { PairCatalog, ShopPair } from "@/lib/types";

type Props = {
  pair: ShopPair;
  onUpdated: (pair: ShopPair) => void;
  onClose: (discarded: boolean) => void;
};

const OTHER = "Autre marque";

export default function EditPairModal({ pair, onUpdated, onClose }: Props) {
  const [catalog, setCatalog] = useState<PairCatalog | null>(null);
  const [type, setType] = useState(pair.type);
  const [brand, setBrand] = useState(pair.brand);
  const [customBrand, setCustomBrand] = useState("");
  const [colors, setColors] = useState<string[]>(pair.colors);
  const [description, setDescription] = useState(pair.description ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void api<PairCatalog>("/opticien/catalogs/pairs").then((data) => {
      setCatalog(data);
      if (!data.brands.includes(pair.brand)) {
        setBrand(OTHER);
        setCustomBrand(pair.brand);
      }
    });
  }, [pair.brand]);

  const canSubmit = useMemo(
    () => Boolean(type && brand && (brand !== OTHER || customBrand.trim()) && colors.length > 0),
    [type, brand, customBrand, colors],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || pending) {
      return;
    }
    setPending(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const updated = await api<ShopPair>(`/opticien/pairs/${pair.uuid}`, {
        method: "PATCH",
        body: JSON.stringify({
          type,
          brand,
          custom_brand: brand === OTHER ? customBrand.trim() : undefined,
          colors,
          description: description.trim() || null,
        }),
      });
      onUpdated(updated);
      onClose(false);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        const next: Record<string, string> = {};
        for (const error of caught.errors) {
          if (error.field) {
            next[error.field] = error.message;
          }
        }
        setFieldErrors(next);
        if (!Object.keys(next).length) {
          setFormError(caught.message);
        }
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <BootstrapModal title="Modifier la paire de lunette" size="md" onClose={() => onClose(true)}>
      <form onSubmit={onSubmit}>
        <div className="modal-body">
          {formError ? <p className="pdv-field__error">{formError}</p> : null}
          <PdvSelect
            id="edit-pair-type"
            label="Type de lunettes"
            value={type}
            error={fieldErrors.type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="">Sélectionner dans la liste</option>
            {catalog?.types.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </PdvSelect>
          <div className="pdv-field-row">
            <div>
              <PdvField
                id="edit-pair-brand"
                label="Marque"
                list="edit-pair-brands"
                placeholder="Nom de la marque..."
                value={brand}
                error={fieldErrors.brand}
                onChange={(event) => setBrand(event.target.value)}
              />
              <datalist id="edit-pair-brands">
                {catalog?.brands.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              {brand === OTHER ? (
                <PdvField
                  id="edit-pair-custom-brand"
                  label="Autre marque"
                  placeholder="Nom de la marque"
                  value={customBrand}
                  error={fieldErrors.custom_brand}
                  onChange={(event) => setCustomBrand(event.target.value)}
                />
              ) : null}
            </div>
            <PdvSelect
              id="edit-pair-colors"
              label="Couleurs"
              multiple
              placeholder="Sélectionner dans la liste"
              value={colors}
              error={fieldErrors.colors}
              onValuesChange={setColors}
            >
              {catalog?.colors.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </PdvSelect>
          </div>
          <PdvField
            id="edit-pair-description"
            label="Description"
            placeholder="ex: Monture titane, Monture acetate..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="modal-footer">
          <PdvButton type="submit" variant="primary" size="l" block disabled={pending || !canSubmit}>
            Enregistrer les modifications
          </PdvButton>
          <PdvButton type="button" variant="tertiary" onClick={() => onClose(true)}>
            Annuler
          </PdvButton>
        </div>
      </form>
    </BootstrapModal>
  );
}
