"use client";

import { useEffect, useState } from "react";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getApp } from "firebase/app";
import { Button } from "@/components/ui/button";

const db = getFirestore(getApp());

const SECCIONES = ["consultarjson", "verificadorDTE", "reportes", "bancos"] as const;

export default function PermisosUsuario({ uid }: { uid: string }) {
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "users", uid));
      const data = snap.exists() ? snap.data() : {};
      setPerms({ ...(data.permissions || {}) });
      setLoading(false);
    })();
  }, [uid]);

  const toggle = (k: string) => setPerms((p) => ({ ...p, [k]: !p[k] }));

  const save = async () => {
    await setDoc(doc(db, "users", uid), { permissions: perms }, { merge: true });
    alert("Permisos guardados");
  };

  if (loading) return <div>Cargando…</div>;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {SECCIONES.map((k) => (
          <label key={k} className="flex items-center gap-2 border rounded p-2">
            <input
              type="checkbox"
              checked={!!perms[k]}
              onChange={() => toggle(k)}
            />
            <span className="capitalize">{k}</span>
          </label>
        ))}
      </div>
      <Button onClick={save}>Guardar</Button>
    </div>
  );
}
