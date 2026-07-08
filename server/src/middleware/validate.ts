import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

type Part = "body" | "query" | "params";

// Validates req[part] against a Zod schema and replaces it with the parsed
// (and therefore typed + coerced) value. Throws straight to the centralized
// error handler on failure, so controllers can assume valid input.
// Accepts ZodTypeAny (not just ZodObject) so schemas built with .refine()/
// .transform() - which return ZodEffects, not ZodObject - can be used too.
export function validate(schema: ZodTypeAny, part: Part = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[part]);
    (req as any)[part] = parsed;
    next();
  };
}
