import { z } from "zod";

const taskFields = {
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
};

export const createTaskSchema = z.object({
  ...taskFields,
  status: taskFields.status.default("TODO"),
});

export const updateTaskSchema = z.object(taskFields).partial().refine(
  (input) => Object.keys(input).length > 0,
  { message: "변경할 값이 필요합니다." },
);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
