"use client";

import { useEffect, useState } from "react";
import BootstrapModal from "@/components/opticien/BootstrapModal";

const KEY = "pdv_geoloc_asked";

export default function GeolocPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return;
    }
    if (window.localStorage.getItem(KEY)) {
      return;
    }
    setOpen(true);
  }, []);

  function close(ask: boolean) {
    window.localStorage.setItem(KEY, "1");
    setOpen(false);
    if (ask) {
      navigator.geolocation.getCurrentPosition(
        () => undefined,
        () => undefined,
      );
    }
  }

  if (!open) {
    return null;
  }

  return (
    <BootstrapModal title="Localisation" onClose={() => close(false)}>
      <div className="modal-body">
        <p className="mb-0">
          Autoriser la localisation pour afficher les opticiens près de vous. Vous pouvez refuser, l’application
          reste utilisable.
        </p>
      </div>
      <div className="modal-footer flex-column">
        <button type="button" className="btn btn-primary w-100" onClick={() => close(true)}>
          Autoriser
        </button>
        <button type="button" className="btn btn-link" onClick={() => close(false)}>
          Plus tard
        </button>
      </div>
    </BootstrapModal>
  );
}
