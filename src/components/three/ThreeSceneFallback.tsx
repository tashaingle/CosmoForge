"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

export class ThreeSceneFallback extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === "development") console.warn("CosmoForge 3D scene fell back to 2D.", error, info);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function ThreeLoading({ label = "Convincing the probe to cooperate…" }: { label?: string }) {
  return <div className="three-loading" role="status"><span>{label}</span></div>;
}

