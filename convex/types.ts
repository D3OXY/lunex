import type { GenericEnt, GenericEntWriter } from "convex-ents";
import type { CustomCtx } from "convex-helpers/server/customFunctions";
import type { TableNames } from "./_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { mutation, query } from "./functions";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { entDefinitions } from "./schema";

export type QueryCtx = CustomCtx<typeof query>;
export type MutationCtx = CustomCtx<typeof mutation>;

export type Ent<TableName extends TableNames> = GenericEnt<typeof entDefinitions, TableName>;
export type EntWriter<TableName extends TableNames> = GenericEntWriter<typeof entDefinitions, TableName>;
