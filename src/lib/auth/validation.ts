import { z } from "zod";

const email = z
  .string()
  .trim()
  .email("올바른 이메일 주소를 입력해 주세요.")
  .max(254)
  .transform((value) => value.toLowerCase());

const password = z
  .string()
  .min(12, "비밀번호는 12자 이상이어야 합니다.")
  .max(128, "비밀번호는 128자 이하여야 합니다.")
  .regex(/[a-z]/, "소문자를 포함해야 합니다.")
  .regex(/[A-Z]/, "대문자를 포함해야 합니다.")
  .regex(/[0-9]/, "숫자를 포함해야 합니다.")
  .regex(/[^A-Za-z0-9]/, "특수문자를 포함해야 합니다.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email,
  password,
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    email: email.optional(),
    password: password.optional(),
    role: z.enum(["ADMIN", "USER"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "변경할 필드가 필요합니다.",
  });

export const firstAdminSchema = createUserSchema.extend({
  role: z.literal("ADMIN").default("ADMIN"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
