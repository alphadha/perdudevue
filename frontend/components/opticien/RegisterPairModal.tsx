"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import PdvButton from "@/components/pdv/PdvButton";
import PdvCheckbox from "@/components/pdv/PdvCheckbox";
import PdvField from "@/components/pdv/PdvField";
import PdvSelect from "@/components/pdv/PdvSelect";
import { api, ApiRequestError } from "@/lib/api";
import { ASSIGNED_CODE_EXAMPLE } from "@/lib/assignedCode";
import type { PairCatalog, ShopClient, ShopPair } from "@/lib/types";

type Props = {
  lockedClient?: ShopClient | null;
  onCreated: (pair: ShopPair) => void;
  onClose: (discarded: boolean) => void;
};

const OTHER = "Autre marque";

export default function RegisterPairModal({ lockedClient, onCreated, onClose }: Props) {
  const [catalog, setCatalog] = useState<PairCatalog | null>(null);
  const [clients, setClients] = useState<ShopClient[]>([]);
  const [clientQuery, setClientQuery] = useState(
    lockedClient ? `${lockedClient.last_name} ${lockedClient.first_name}` : "",
  );
  const [clientUuid, setClientUuid] = useState(lockedClient?.uuid ?? "");
  const [type, setType] = useState("");
  const [brand, setBrand] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [alreadyEngraved, setAlreadyEngraved] = useState(false);
  const [assignedCode, setAssignedCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void Promise.all([
      api<PairCatalog>("/opticien/catalogs/pairs"),
      lockedClient ? Promise.resolve([]) : api<ShopClient[]>("/opticien/clients"),
    ]).then(([nextCatalog, nextClients]) => {
      setCatalog(nextCatalog);
      setClients(nextClients);
    });
  }, [lockedClient]);

  const suggestions = useMemo(() => {
    const needle = clientQuery.trim().toLowerCase();
    if (!needle) {
      return [];
    }
    return clients
      .filter((client) =>
        [client.last_name, client.first_name, client.email, client.phone ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [clients, clientQuery]);

  const canSubmit =
    Boolean(clientUuid) &&
    Boolean(type) &&
    Boolean(brand) &&
    (brand !== OTHER || Boolean(customBrand.trim())) &&
    colors.length > 0 &&
    (!alreadyEngraved || Boolean(assignedCode.trim()));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const pair = await api<ShopPair>("/opticien/pairs", {
        method: "POST",
        body: JSON.stringify({
          client_uuid: clientUuid,
          type,
          brand,
          custom_brand: brand === OTHER ? customBrand : undefined,
          colors,
          description: description || null,
          already_engraved: alreadyEngraved,
          assigned_code: alreadyEngraved ? assignedCode : undefined,
        }),
      });
      onCreated(pair);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        const next: Record<string, string> = {};
        caught.errors.forEach((item) => {
          if (item.field) {
            next[item.field] = item.message;
          }
        });
        setFieldErrors(next);
        setFormError(caught.errors.find((item) => !item.field)?.message ?? caught.message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <BootstrapModal title="Enregistrer une paire de lunettes" size="lg" onClose={() => onClose(true)}>
      <form onSubmit={(event) => void onSubmit(event)}>
        <div className="modal-body">
          {formError ? <div className="alert alert-danger">{formError}</div> : null}
          <PdvField
            id="pair-client"
            label="Client*"
            placeholder="Rechercher un nom, téléphone ou adresse mail..."
            value={clientQuery}
            disabled={Boolean(lockedClient)}
            error={fieldErrors.client_uuid}
            required
            onChange={(event) => {
              setClientQuery(event.target.value);
              setClientUuid("");
            }}
          />
          {!lockedClient && suggestions.length > 0 && !clientUuid ? (
            <ul className="list-group">
              {suggestions.map((client) => (
                <button
                  type="button"
                  className="list-group-item list-group-item-action"
                  key={client.uuid}
                  onClick={() => {
                    setClientUuid(client.uuid);
                    setClientQuery(`${client.last_name} ${client.first_name}`);
                  }}
                >
                  {client.last_name} {client.first_name} · {client.email}
                </button>
              ))}
            </ul>
          ) : null}
          <PdvSelect
            id="pair-type"
            label="Type de lunettes*"
            value={type}
            error={fieldErrors.type}
            required
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
                id="pair-brand"
                label="Marque*"
                list="pair-brands"
                placeholder="Nom de la marque..."
                value={brand}
                error={fieldErrors.brand}
                required
                onChange={(event) => setBrand(event.target.value)}
              />
              <datalist id="pair-brands">
                {catalog?.brands.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              {brand === OTHER ? (
                <PdvField
                  id="pair-custom-brand"
                  label="Autre marque*"
                  placeholder="Nom de la marque"
                  value={customBrand}
                  error={fieldErrors.custom_brand}
                  required
                  onChange={(event) => setCustomBrand(event.target.value)}
                />
              ) : null}
            </div>
            <PdvSelect
              id="pair-colors"
              label="Couleurs*"
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
            id="pair-description"
            label="Description (optionnel)"
            placeholder="ex: Monture titane, Monture acetate..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <hr className="pdv-panel__divider" />
          <div className="pdv-engrave">
            <p className="pdv-field__label">La paire est-t-elle déjà gravée d’un code unique ?</p>
            <div className="pdv-choice-row">
              <div className="pdv-choice">
                <PdvCheckbox checked={alreadyEngraved} onChange={() => setAlreadyEngraved(true)} aria-label="Oui" />
                <span className="pdv-choice__label">Oui</span>
              </div>
              <div className="pdv-choice">
                <PdvCheckbox checked={!alreadyEngraved} onChange={() => setAlreadyEngraved(false)} aria-label="Non" />
                <span className="pdv-choice__label">Non</span>
              </div>
            </div>
            {alreadyEngraved ? (
              <PdvField
                id="pair-code"
                label="Code unique assigné*"
                placeholder={`Ex : ${ASSIGNED_CODE_EXAMPLE}`}
                value={assignedCode}
                error={fieldErrors.assigned_code}
                maxLength={8}
                required
                onChange={(event) => setAssignedCode(event.target.value.toUpperCase())}
              />
            ) : (
              <p className="pdv-field__hint mb-0">
                Cette paire n’étant pas encore gravée, un code unique lui sera automatiquement attribué lors de
                son enregistrement. Ce code devra ensuite être apposé sur la paire. Vous pourrez retrouver ce
                code dans la fiche d’information de la paire.
              </p>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <PdvButton type="submit" variant="primary" size="l" block disabled={pending || !canSubmit}>
            Enregistrer la paire
          </PdvButton>
          <PdvButton type="button" variant="tertiary" onClick={() => onClose(true)}>
            Annuler
          </PdvButton>
        </div>
      </form>
    </BootstrapModal>
  );
}
