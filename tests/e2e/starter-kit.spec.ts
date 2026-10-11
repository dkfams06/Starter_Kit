import { expect, test, type Page } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_TASK_PREFIX,
  E2E_USER_EMAIL,
  E2E_USER_PASSWORD,
} from "./fixtures";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin(?:\/tasks)?$/);
}

test("관리자와 일반 사용자의 주요 브라우저 흐름 및 권한을 검증한다", async ({ page }) => {
  await login(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
  await expect(page.getByText("전체 사용자")).toBeVisible();
  await expect(page.getByText("활성 사용자")).toBeVisible();
  await expect(page.getByRole("heading", { name: "최근 활동" })).toBeVisible();

  await page.getByRole("link", { name: "업무 예제" }).click();
  await page.getByRole("button", { name: "업무 등록" }).click();
  await page.getByLabel("제목").fill(`${E2E_TASK_PREFIX} 관리자 업무`);
  await page.getByLabel("설명").fill("브라우저 CRUD 검증");
  await page.getByRole("button", { name: "저장" }).click();
  const adminTask = page.getByRole("row").filter({ hasText: `${E2E_TASK_PREFIX} 관리자 업무` });
  await expect(adminTask).toBeVisible();
  await adminTask.getByRole("button", { name: "수정" }).click();
  await page.getByLabel("제목").fill(`${E2E_TASK_PREFIX} 관리자 업무 수정`);
  await page.getByLabel("상태").selectOption("DONE");
  await page.getByRole("button", { name: "저장" }).click();
  const updatedAdminTask = page.getByRole("row").filter({ hasText: `${E2E_TASK_PREFIX} 관리자 업무 수정` });
  await expect(updatedAdminTask).toContainText("완료");
  await updatedAdminTask.getByRole("button", { name: "삭제" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "삭제" }).click();
  await expect(updatedAdminTask).toHaveCount(0);

  await page.getByRole("link", { name: "사용자 관리" }).click();
  const createUser = page.getByRole("heading", { name: "사용자 생성" }).locator("..");
  await createUser.locator('input[name="name"]').fill("E2E User");
  await createUser.locator('input[name="email"]').fill(E2E_USER_EMAIL);
  await createUser.locator('input[name="password"]').fill(E2E_USER_PASSWORD);
  await createUser.locator('select[name="role"]').selectOption("USER");
  await createUser.getByRole("button", { name: "사용자 생성" }).click();
  const userCard = page.getByRole("article").filter({ hasText: E2E_USER_EMAIL });
  await expect(userCard).toBeVisible();
  await userCard.getByLabel("이름").fill("E2E User Updated");
  await userCard.getByRole("button", { name: "저장" }).click();
  await expect(userCard).toContainText("변경사항을 저장했습니다.");

  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/tasks")).status()).toBe(401);
  await login(page, E2E_USER_EMAIL, E2E_USER_PASSWORD);
  await expect(page).toHaveURL(/\/admin\/tasks$/);
  await expect(page.getByRole("link", { name: "사용자 관리" })).toHaveCount(0);
  await page.getByRole("button", { name: "업무 등록" }).click();
  await page.getByLabel("제목").fill(`${E2E_TASK_PREFIX} 일반 사용자 업무`);
  await page.getByRole("button", { name: "저장" }).click();
  const userTask = page.getByRole("row").filter({ hasText: `${E2E_TASK_PREFIX} 일반 사용자 업무` });
  await expect(userTask).toBeVisible();
  await expect(userTask.getByRole("button", { name: "삭제" })).toHaveCount(0);

  const tasksResponse = await page.request.get("/api/tasks");
  const tasksBody = (await tasksResponse.json()) as { tasks: Array<{ id: string; title: string }> };
  const userTaskId = tasksBody.tasks.find(({ title }) => title === `${E2E_TASK_PREFIX} 일반 사용자 업무`)?.id;
  expect(userTaskId).toBeTruthy();
  const forbiddenDelete = await page.request.delete(`/api/tasks/${userTaskId}`);
  expect(forbiddenDelete.status()).toBe(403);
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "접근 권한이 없습니다." })).toBeVisible();

  await page.goto("/admin/tasks");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/tasks")).status()).toBe(401);
  await login(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
  await page.getByRole("link", { name: "사용자 관리" }).click();
  const updatedUserCard = page.getByRole("article").filter({ hasText: E2E_USER_EMAIL });
  await updatedUserCard.getByRole("button", { name: "비활성화" }).click();
  await expect(updatedUserCard).toContainText("비활성");
  await updatedUserCard.getByRole("button", { name: "삭제" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "삭제" }).click();
  await expect(updatedUserCard).toHaveCount(0);

  await page.getByRole("link", { name: "업무 예제" }).click();
  const remainingTask = page.getByRole("row").filter({ hasText: `${E2E_TASK_PREFIX} 일반 사용자 업무` });
  await remainingTask.getByRole("button", { name: "삭제" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "삭제" }).click();
  await expect(remainingTask).toHaveCount(0);
  await page.getByRole("link", { name: "대시보드" }).click();
  await expect(page.getByText("TASK_DELETED").first()).toBeVisible();
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/tasks")).status()).toBe(401);
});
