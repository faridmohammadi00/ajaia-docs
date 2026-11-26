import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, name: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

test("create, format, persist, share and open as viewer", async ({ page }) => {
  const title = `Launch plan ${Date.now()}`;

  await signIn(page, "Alice Chen");
  await page.getByRole("button", { name: "New document" }).click();
  await expect(page).toHaveURL(/\/documents\/[a-f0-9]{24}$/);

  const titleInput = page.getByLabel("Document title");
  await titleInput.fill(title);
  await titleInput.press("Enter");

  const editor = page.getByTestId("editor");
  await editor.click();
  await page.getByLabel("Text style").selectOption("h1");
  await page.keyboard.type("Goals");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Bold (Ctrl+B)" }).click();
  await page.keyboard.type("Ship v1");
  await page.getByRole("button", { name: "Bold (Ctrl+B)" }).click();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Bulleted list" }).click();
  await page.keyboard.type("Editor");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Sharing");

  await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved");
  await page.reload();
  await expect(editor.locator("h1")).toHaveText("Goals");
  await expect(editor.locator("strong")).toHaveText("Ship v1");
  await expect(editor.locator("ul > li")).toHaveText(["Editor", "Sharing"]);
  await expect(page.getByLabel("Document title")).toHaveValue(title);

  await page.getByRole("button", { name: "Share" }).click();
  await page.getByLabel("Email to share with").fill("bob@ajaia.dev");
  await page.getByLabel("Access level").selectOption("viewer");
  await page.getByRole("dialog").getByRole("button", { name: "Share" }).click();
  await expect(page.getByTestId("share-list")).toContainText("Bob Martin");
  await page.getByRole("button", { name: "Done" }).click();

  await page.goto("/");
  await expect(page.getByTestId("owned-docs")).toContainText(title);
  await signOut(page);

  await signIn(page, "Bob Martin");
  const shared = page.getByTestId("shared-docs");
  await expect(shared).toContainText(title);
  await expect(page.getByTestId("owned-docs")).not.toContainText(title);
  await shared.getByRole("link", { name: title }).click();

  await expect(page.getByText("Shared with you by")).toBeVisible();
  await expect(page.getByRole("toolbar")).toHaveCount(0);
  await expect(editor).toHaveAttribute("contenteditable", "false");
  await expect(editor.locator("h1")).toHaveText("Goals");
});

test("import a markdown file as a new document", async ({ page }) => {
  await signIn(page, "Carol Diaz");
  await page.getByTestId("import-input").setInputFiles({
    name: "release-notes.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Release notes\n\n- **Faster** saves\n- Sharing"),
  });
  await expect(page).toHaveURL(/\/documents\/[a-f0-9]{24}$/);
  await expect(page.getByLabel("Document title")).toHaveValue("release notes");
  await expect(page.getByTestId("editor").locator("h1")).toHaveText("Release notes");
  await expect(page.getByTestId("editor").locator("li strong")).toHaveText("Faster");
});

test("restore an earlier version from history", async ({ page }) => {
  const title = `History ${Date.now()}`;
  await signIn(page, "Alice Chen");
  await page.getByRole("button", { name: "New document" }).click();
  await page.getByLabel("Document title").fill(title);
  await page.getByLabel("Document title").press("Enter");
  await page.getByTestId("editor").click();
  await page.keyboard.type("Original plan from Alice");
  await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved");
  const url = page.url();

  await page.getByRole("button", { name: "Share" }).click();
  await page.getByLabel("Email to share with").fill("bob@ajaia.dev");
  await page.getByRole("dialog").getByRole("button", { name: "Share" }).click();
  await expect(page.getByTestId("share-list")).toContainText("Bob Martin");
  await page.getByRole("button", { name: "Done" }).click();
  await signOutFrom(page);

  await signIn(page, "Bob Martin");
  await page.goto(url);
  const editor = page.getByTestId("editor");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("Bob replaced everything");
  await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved");

  await page.getByRole("button", { name: "Version history" }).click();
  const history = page.getByTestId("history-list");
  await expect(history.getByRole("button")).toHaveCount(2);
  await history.getByRole("button").filter({ hasText: "Alice Chen" }).click();
  await expect(page.getByTestId("preview")).toHaveText("Original plan from Alice");

  await page.getByRole("button", { name: "Restore this version" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Restore" }).click();
  await expect(editor).toHaveText("Original plan from Alice");
});

async function signOutFrom(page: Page) {
  await page.goto("/");
  await signOut(page);
}

test("shows who is here and brings in their changes", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const title = `Presence ${Date.now()}`;
  await signIn(page, "Alice Chen");
  await page.getByRole("button", { name: "New document" }).click();
  await page.getByLabel("Document title").fill(title);
  await page.getByLabel("Document title").press("Enter");
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByLabel("Email to share with").fill("bob@ajaia.dev");
  await page.getByRole("dialog").getByRole("button", { name: "Share" }).click();
  await expect(page.getByTestId("share-list")).toContainText("Bob Martin");
  await page.getByRole("button", { name: "Done" }).click();

  const bobContext = await browser.newContext();
  const bob = await bobContext.newPage();
  await signIn(bob, "Bob Martin");
  await bob.goto(page.url());
  await expect(bob.getByTestId("presence")).toContainText("Alice Chen is viewing", { timeout: 15_000 });
  await expect(page.getByTestId("presence")).toContainText("Bob Martin is viewing", { timeout: 15_000 });

  await bob.getByTestId("editor").click();
  await bob.keyboard.type("Hello from Bob");
  await expect(bob.getByTestId("save-status")).toHaveAttribute("data-status", "saved");

  await expect(page.getByTestId("editor")).toHaveText("Hello from Bob", { timeout: 25_000 });
  await expect(page.getByTestId("editing-now")).toContainText("Bob is editing", { timeout: 15_000 });
  await bobContext.close();
});
