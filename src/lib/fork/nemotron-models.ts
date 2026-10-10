// NVIDIA Nemotron 3 model IDs on Nebius Token Factory, from the public catalog
// (https://tokenfactory.nebius.com/model-catalog.md). At run time FORK prefers
// whatever GET /v1/models returns for the account; these are the fallbacks.

export type NemotronTier = "nano" | "super" | "ultra";

/** Each strategy runs on the tier that fits it: fast and cheap for the minimal patch, deepest reasoning for the redesign. */
export const STRATEGY_TIER: Record<"minimal" | "root-cause" | "architecture", NemotronTier> = {
  minimal: "nano",
  "root-cause": "super",
  architecture: "ultra",
};

export const TIER_LABEL: Record<NemotronTier, string> = {
  nano: "Nemotron 3 Nano",
  super: "Nemotron 3 Super",
  ultra: "Nemotron 3 Ultra",
};

export const TIER_FALLBACK: Record<NemotronTier, string> = {
  nano: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
  super: "nvidia/nemotron-3-super-120b-a12b",
  ultra: "nvidia/Nemotron-3-Ultra-550b-a55b",
};
