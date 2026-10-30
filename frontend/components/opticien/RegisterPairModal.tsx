"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import BootstrapModal from "@/components/opticien/BootstrapModal";
import FieldError from "@/components/FieldError";
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
      return clients.slice(0, 8);
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

  function toggleColor(color: string) {
    setColors((current) =>
      current.includes(color) ? current.filter((item) => item !== color) : [...current, color],
    );
  }

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
    <BootstrapModal title="Enregistrer une paire de lunettes" onClose={() => onClose(true)}>
      <form onSubmit={(event) => void onSubmit(event)}>
        <div className="modal-body">
          {formError ? <div className="alert alert-danger">{formError}</div> : null}
          <div className="mb-3">
            <label className="form-label" htmlFor="pair-client">
              Client*
            </label>
            <input
              id="pair-client"
              className={`form-control${fieldErrors.client_uuid ? " is-invalid" : ""}`}
              placeholder="Rechercher un nom, numéro de téléphone ou adresse mail..."
              value={clientQuery}
              disabled={Boolean(lockedClient)}
              onChange={(event) => {
                setClientQuery(event.target.value);
                setClientUuid("");
              }}
              required
            />
            <FieldError message={fieldErrors.client_uuid} />
            {!lockedClient && suggestions.length > 0 && !clientUuid ? (
              <ul className="list-group mt-1">
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
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="pair-type">
              Type de lunettes*
            </label>
            <select
              id="pair-type"
              className={`form-select${fieldErrors.type ? " is-invalid" : ""}`}
              value={type}
              onChange={(event) => setType(event.target.value)}
              required
            >
              <option value="">Sélectionner dans la liste</option>
              {catalog?.types.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.type} />
          </div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label" htmlFor="pair-brand">
                Marque*
              </label>
              <input
                id="pair-brand"
                className={`form-control${fieldErrors.brand ? " is-invalid" : ""}`}
                list="pair-brands"
                placeholder="Saisir le nom de la marque..."
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                required
              />
              <datalist id="pair-brands">
                {catalog?.brands.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              <FieldError message={fieldErrors.brand} />
              {brand === OTHER ? (
                <input
                  className={`form-control mt-2${fieldErrors.custom_brand ? " is-invalid" : ""}`}
                  placeholder="Nom de la marque"
                  value={customBrand}
                  onChange={(event) => setCustomBrand(event.target.value)}
                  required
                />
              ) : null}
              <FieldError message={fieldErrors.custom_brand} />
            </div>
            <div className="col-md-6 mb-3">
              <p className="form-label">Couleur(s)*</p>
              <div className="dropdown">
                <button
                  className={`form-select text-start${fieldErrors.colors ? " is-invalid" : ""}`}
                  type="button"
                  data-bs-toggle="dropdown"
                  data-bs-auto-close="outside"
                  aria-expanded="false"
                >
                  {colors.length > 0 ? colors.join(", ") : "Sélectionner dans la liste"}
                </button>
                <ul className="dropdown-menu w-100">
                  {catalog?.colors.map((color) => (
                    <li key={color}>
                      <label className="dropdown-item" htmlFor={`color-${color}`}>
                        <input
                          className="form-check-input me-2"
                          type="checkbox"
                          id={`color-${color}`}
                          checked={colors.includes(color)}
                          onChange={() => toggleColor(color)}
                        />
                        {color}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
              <FieldError message={fieldErrors.colors} />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="pair-description">
              Description (optionnel)
            </label>
            <input
              id="pair-description"
              className="form-control"
              placeholder="ex: Monture titane, Monture acetate..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <hr />
          <p>La paire est-t-elle déjà gravée d’un code unique ?</p>
          <div className="mb-3">
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="checkbox"
                id="engraved-yes"
                checked={alreadyEngraved}
                onChange={() => setAlreadyEngraved(true)}
              />
              <label className="form-check-label" htmlFor="engraved-yes">
                Oui
              </label>
            </div>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="checkbox"
                id="engraved-no"
                checked={!alreadyEngraved}
                onChange={() => setAlreadyEngraved(false)}
              />
              <label className="form-check-label" htmlFor="engraved-no">
                Non
              </label>
            </div>
          </div>
          {alreadyEngraved ? (
            <div className="mb-3">
              <label className="form-label" htmlFor="pair-code">
                Code unique assigné*
              </label>
              <input
                id="pair-code"
                className={`form-control${fieldErrors.assigned_code ? " is-invalid" : ""}`}
                placeholder={`Ex : ${ASSIGNED_CODE_EXAMPLE}`}
                value={assignedCode}
                onChange={(event) => setAssignedCode(event.target.value.toUpperCase())}
                maxLength={8}
                required
              />
              <FieldError message={fieldErrors.assigned_code} />
            </div>
          ) : (
            <p className="small">
              Cette paire n’étant pas encore gravée, un code unique lui sera automatiquement attribué lors de
              son enregistrement. Ce code devra ensuite être apposé sur la paire. Vous pourrez retrouver ce
              code dans la fiche d’information de la paire.
            </p>
          )}
        </div>
        <div className="modal-footer flex-column">
          <button type="submit" className="btn btn-primary w-100" disabled={pending || !canSubmit}>
            Enregistrer la paire
          </button>
          <button type="button" className="btn btn-link" onClick={() => onClose(true)}>
            Annuler
          </button>
        </div>
      </form>
    </BootstrapModal>
  );
}
