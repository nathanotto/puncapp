export interface ActionResult {
  success: boolean;
  message: string;           // What happened
  consequence: string;       // What it means
  nextStep?: {
    description: string;     // What to do next (or "Nothing more needed")
    href?: string;           // Link to next task (if applicable)
    label?: string;          // Button label for next task
  };
  downstream?: string[];     // What tasks were triggered for others
}

export function createTaskResult(result: Partial<ActionResult> & { success: boolean; message: string; consequence: string }): ActionResult {
  return {
    success: result.success,
    message: result.message,
    consequence: result.consequence,
    nextStep: result.nextStep,
    downstream: result.downstream,
  };
}
