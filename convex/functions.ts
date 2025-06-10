import { entsTableFactory } from "convex-ents";
import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import {
  internalMutation as baseInternalMutation,
  internalQuery as baseInternalQuery,
  // eslint-disable-next-line no-restricted-imports
  mutation as baseMutation,
  // eslint-disable-next-line no-restricted-imports
  query as baseQuery,
} from "./_generated/server";
import { entDefinitions } from "./schema";

export const query = customQuery(
  baseQuery,
  customCtx(async (ctx) => {
    return {
      table: entsTableFactory(ctx, entDefinitions),
      db: undefined,
    };
  }),
);

export const internalQuery = customQuery(
  baseInternalQuery,
  customCtx(async (ctx) => {
    return {
      table: entsTableFactory(ctx, entDefinitions),
      db: undefined,
    };
  }),
);

export const mutation = customMutation(
  baseMutation,
  customCtx(async (ctx) => {
    return {
      table: entsTableFactory(ctx, entDefinitions),
      db: undefined,
    };
  }),
);

export const internalMutation = customMutation(
  baseInternalMutation,
  customCtx(async (ctx) => {
    return {
      table: entsTableFactory(ctx, entDefinitions),
      db: undefined,
    };
  }),
);
