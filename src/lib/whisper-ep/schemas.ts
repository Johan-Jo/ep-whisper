/**
 * Whisper-EP Structured Output Schemas
 * Following the cursor guide specifications
 */

// Single-intent schema (atomiskt moment)
export const ADD_TASK_SCHEMA = {
  name: "add_task",
  description: "Mappar fras till MEPS-intent och slots",
  parameters: {
    type: "object",
    properties: {
      intent_id: { type: "string" },
      intent_label: { type: "string" },
      area: {
        type: "object",
        properties: {
          value: { type: "number" },
          unit: { type: "string", enum: ["kvm", "m2"] }
        }
      },
      length: {
        type: "object", 
        properties: {
          value: { type: "number" },
          unit: { type: "string", enum: ["lpm", "meter"] }
        }
      },
      coats: { type: "integer" },
      side: { type: "string", enum: ["en_sida", "båda_sidor"] }
    },
    required: ["intent_id", "intent_label"]
  }
} as const;

// Composite job schema (sammansatt jobb)
export const COMPOSE_JOB_SCHEMA = {
  name: "compose_job",
  description: "Komponerar sammansatt målningsjobb med flera steg",
  parameters: {
    type: "object",
    properties: {
      job_name: { type: "string" },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            step_order: { type: "integer" },
            intent_id: { type: "string" },
            intent_label: { type: "string" },
            area: {
              type: "object",
              properties: {
                value: { type: "number" },
                unit: { type: "string", enum: ["kvm", "m2"] }
              }
            },
            length: {
              type: "object",
              properties: {
                value: { type: "number" },
                unit: { type: "string", enum: ["lpm", "meter"] }
              }
            },
            coats: { type: "integer" },
            side: { type: "string", enum: ["en_sida", "båda_sidor"] },
            dependencies: { type: "array", items: { type: "integer" } }
          },
          required: ["step_order", "intent_id", "intent_label"]
        }
      },
      total_area: { type: "number" },
      total_length: { type: "number" }
    },
    required: ["job_name", "steps"]
  }
} as const;

export interface AddTaskResult {
  intent_id: string;
  intent_label: string;
  area?: { value: number; unit: "kvm" | "m2" };
  length?: { value: number; unit: "lpm" | "meter" };
  coats?: number;
  side?: "en_sida" | "båda_sidor";
}

export interface ComposeJobResult {
  job_name: string;
  steps: Array<{
    step_order: number;
    intent_id: string;
    intent_label: string;
    area?: { value: number; unit: "kvm" | "m2" };
    length?: { value: number; unit: "lpm" | "meter" };
    coats?: number;
    side?: "en_sida" | "båda_sidor";
    dependencies: number[];
  }>;
  total_area?: number;
  total_length?: number;
}
