"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setEphemerisLookup, type BodyId, type Vec3 } from "@/lib/bodies";
import {
  ensureEphemeris,
  ephemerisPositionAU,
  getEphemerisMeta,
} from "@/lib/ephemeris-client";

type Meta = ReturnType<typeof getEphemerisMeta>;

const Ctx = createContext<Meta>({
  ready: false,
  provider: null,
  generatedAt: null,
  bodyCount: 0,
  errors: [],
  lastError: null,
});

export function EphemerisProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<Meta>(getEphemerisMeta);

  useEffect(() => {
    let cancelled = false;
    setEphemerisLookup((id: BodyId, t: number): Vec3 | null =>
      ephemerisPositionAU(id, t)
    );
    void ensureEphemeris().then(() => {
      if (!cancelled) setMeta(getEphemerisMeta());
    });
    return () => {
      cancelled = true;
      setEphemerisLookup(null);
    };
  }, []);

  const value = useMemo(() => meta, [meta]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEphemerisMeta(): Meta {
  return useContext(Ctx);
}
