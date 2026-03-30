export type BeadId = string;
export type BeadType = "wood" | "silicone" | "knit" | "plastic";

export interface BeadState {
  id: BeadId;
  type: BeadType;
  radius: number;
  color: string;
}

export interface ChainConfig {
  anchorPosition: [number, number, number];
  gravity: [number, number, number];
}

export interface ChainState {
  beads: BeadState[];
  config: ChainConfig;
}
