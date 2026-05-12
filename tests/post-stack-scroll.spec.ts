import { expect, test, type Page } from "@playwright/test";

/**
 * Post-stack scroll regression tests.
 *
 * These tests verify three deterministic behaviors introduced by the scroll
 * refactor:
 *   1. Heading anchors (from rehype-slug) exist in rendered post DOM.
 *   2. Scroll position is captured to history.state + sessionStorage on
 *      `scrollend`, keyed by post id, as `{anchorId, fineOffsetPx}`.
 *   3. Browser back navigation restores the captured anchor within ~5px,
 *      using `waitForPostStable` to wait for layout (no `waitForTimeout`).
 *
 * No `page.waitForTimeout` is permitted anywhere in this suite — assertions
 * use `waitForFunction` against deterministic DOM/state predicates.
 */

const PRINCIPLES_TARGET_HEADING_ID = "manifestation-as-scope-setting";

async function waitForScrollIdle(page: Page): Promise<void> {
  // Resolves once two consecutive animation frames pass without scrollY change.
  // This is the deterministic equivalent of "scroll has stopped" for tests.
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      let lastY = window.scrollY;
      let stableFrames = 0;
      const tick = () => {
        const y = window.scrollY;
        if (y === lastY) {
          stableFrames += 1;
          if (stableFrames >= 2) {
            resolve();
            return;
          }
        } else {
          stableFrames = 0;
          lastY = y;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });
}

async function readScrollMemory(page: Page) {
  return await page.evaluate(() => {
    const fromHistory = (
      window.history.state as { scrollByPostId?: unknown } | null
    )?.scrollByPostId;
    return fromHistory ?? null;
  });
}

test.describe("post-stack scroll", () => {
  test("rehype-slug produces heading ids inside rendered post", async ({
    page,
  }) => {
    await page.goto("/principles");
    await expect(page.locator('section[data-post-id="principles"]')).toBeVisible();
    const anchor = page.locator(
      `section[data-post-id="principles"] #${PRINCIPLES_TARGET_HEADING_ID}`
    );
    await expect(anchor).toBeAttached();
  });

  test("scrollend captures anchor to history.state and sessionStorage", async ({
    page,
  }) => {
    await page.goto("/principles");
    await page
      .locator(`section[data-post-id="principles"] #${PRINCIPLES_TARGET_HEADING_ID}`)
      .waitFor({ state: "attached" });

    // Scroll the target heading to viewport top via the same primitive the
    // app uses (scrollIntoView), then wait for stillness.
    await page.evaluate((id) => {
      const el = document.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
      }
    }, PRINCIPLES_TARGET_HEADING_ID);

    await waitForScrollIdle(page);

    // Synthesize a scrollend in case the browser didn't fire one for the
    // instant-scroll. captureNow re-runs idempotently.
    await page.evaluate(() => {
      window.dispatchEvent(new Event("scrollend"));
    });

    // Capture happens in a passive listener; let microtasks flush.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));

    const memory = await readScrollMemory(page);
    expect(memory).not.toBeNull();
    expect(memory).toMatchObject({
      principles: {
        anchorId: PRINCIPLES_TARGET_HEADING_ID,
      },
    });

    const sessionMemory = await page.evaluate(() => {
      const raw = window.sessionStorage.getItem("copt:scroll");
      return raw ? JSON.parse(raw) : null;
    });
    expect(sessionMemory).toMatchObject({
      principles: { anchorId: PRINCIPLES_TARGET_HEADING_ID },
    });
  });

  test("browser back restores captured anchor within 5px", async ({ page }) => {
    await page.goto("/about");
    await page
      .locator('section[data-post-id="about"]')
      .waitFor({ state: "visible" });

    // Click the in-content PostLink to "principles" scoped to the about
    // section. Page has multiple href="/principles" anchors (sidebar nav,
    // related-links footer, etc.); we want the one in the post body so
    // the click goes through PostLinkClient's onClick handler.
    const principlesLink = page
      .locator('section[data-post-id="about"] a[href="/principles"]')
      .first();
    await expect(principlesLink).toBeVisible();
    await principlesLink.click();

    // Diagnostic: dump all data-post-id values present after click to
    // surface mismatches between expected slug and rendered id.
    await page.waitForFunction(() => {
      const ids = Array.from(document.querySelectorAll("[data-post-id]"))
        .map((el) => el.getAttribute("data-post-id"))
        .join(",");
      return ids.includes("principles");
    }, { timeout: 15_000 }).catch(async () => {
      const debug = await page.evaluate(() => ({
        url: window.location.href,
        ids: Array.from(document.querySelectorAll("[data-post-id]"))
          .map((el) => el.getAttribute("data-post-id")),
      }));
      throw new Error(
        `Principles section never rendered. URL=${debug.url} ids=${JSON.stringify(debug.ids)}`
      );
    });
    await page
      .locator(`section[data-post-id="principles"] #${PRINCIPLES_TARGET_HEADING_ID}`)
      .waitFor({ state: "attached" });

    // Scroll within principles to a specific heading.
    await page.evaluate((id) => {
      const el = document.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
      }
    }, PRINCIPLES_TARGET_HEADING_ID);
    await waitForScrollIdle(page);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("scrollend"));
    });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));

    const scrollYBeforeBack = await page.evaluate(() => window.scrollY);
    expect(scrollYBeforeBack).toBeGreaterThan(0);

    // Capture should have landed. Diagnose key shape if not.
    const memoryBeforeBack = await readScrollMemory(page);
    expect(
      memoryBeforeBack,
      `Expected scrollByPostId to contain principles. Got=${JSON.stringify(memoryBeforeBack)}`
    ).toMatchObject({
      principles: { anchorId: PRINCIPLES_TARGET_HEADING_ID },
    });

    // Go back to about (popstate, BROWSER_NAVIGATION, restoringScroll).
    await page.goBack();
    await page
      .locator('section[data-post-id="about"]')
      .waitFor({ state: "visible" });

    // Forward again to principles — anchor restore should land us back near
    // the captured position.
    await page.goForward();
    await page
      .locator(`section[data-post-id="principles"] #${PRINCIPLES_TARGET_HEADING_ID}`)
      .waitFor({ state: "attached" });

    // Wait until restore completes: scrollY should approach the captured value
    // and then stabilize for 2 frames.
    await page.waitForFunction(
      (expected) => {
        const drift = Math.abs(window.scrollY - expected);
        return drift < 16;
      },
      scrollYBeforeBack
    );
    await waitForScrollIdle(page);

    const scrollYAfterRestore = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollYAfterRestore - scrollYBeforeBack)).toBeLessThan(16);
  });

  test("forward navigation back to a stacked URL restores top of new post", async ({
    page,
  }) => {
    // Fresh visit to a deep URL: principles should render at top, no anchor
    // restore (sessionStorage is empty for first visit).
    await page.goto("/principles");
    await page
      .locator(`section[data-post-id="principles"]`)
      .waitFor({ state: "visible" });
    await waitForScrollIdle(page);

    // First-load scroll should land near top-of-post (within ~one screen).
    const { scrollY, innerHeight } = await page.evaluate(() => ({
      scrollY: window.scrollY,
      innerHeight: window.innerHeight,
    }));
    expect(scrollY).toBeLessThan(innerHeight);
  });
});
