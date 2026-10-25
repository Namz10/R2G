import { z } from 'zod';

export const TestItemSchema = z.object({
  id: z.string(),
  role: z.enum(['repro', 'guard', 'holdout']),
  name: z.string(),
  code: z.string()
});

export const InvestigationOutputSchema = z.object({
  hypothesis: z.string(),
  suspectLocation: z.object({
    functionName: z.string(),
    lines: z.string()
  }),
  failureMode: z.enum(['wrong-output', 'crash', 'hang']),
  assumptions: z.array(z.string()),
  tests: z.array(TestItemSchema).min(1)
});

export type InvestigationOutput = z.infer<typeof InvestigationOutputSchema>;

export const PatchOutputSchema = z.object({
  retryReasoning: z.string().optional(),
  rootCause: z.string(),
  changeSummary: z.string(),
  fixedSource: z.string()
});

export type PatchOutput = z.infer<typeof PatchOutputSchema>;
