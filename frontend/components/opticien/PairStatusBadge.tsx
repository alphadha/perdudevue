"use client";

import type { PairStatus } from "@/lib/types";

type Props = {
  status: PairStatus;
  label: string;
};

export default function PairStatusBadge({ status, label }: Props) {
  return <span className={`pdv-tag pdv-tag--${status}`}>{label}</span>;
}
