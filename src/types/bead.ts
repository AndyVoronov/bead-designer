export type BeadId = string;
export type BeadType = "wood" | "silicone" | "knit" | "plastic";
export type BeadShape = "sphere" | "disc" | "star" | "heart" | "cylinder";

export interface CatalogBead {
  id: string;
  name: string;
  nameRu: string;
  shape: BeadShape;
  size: number;
  material: BeadType;
  color: string;
  secondaryColor?: string;
}

export interface BeadState {
  id: BeadId;
  type: BeadType;
  radius: number;
  color: string;
  catalogBeadId?: string;
}

export interface ChainConfig {
  anchorPosition: [number, number, number];
  gravity: [number, number, number];
}

export interface ChainState {
  beads: BeadState[];
  config: ChainConfig;
}

/** Wire format for design serialization (JSON → LZ-String → base64url). */
export interface SerializableDesign {
  v: 1;
  p: "pacifier-holder";
  b: string[]; // catalogBeadId strings
}
