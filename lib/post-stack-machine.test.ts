#!/usr/bin/env bun

import { describe, expect, it } from "bun:test";
import { createActor } from "xstate";
import type { RenderedPost } from "@/types/post";
import { type PostStackInput, postStackMachine } from "./post-stack-machine";

function makePost(originalId: string, id = originalId): RenderedPost {
  return {
    id,
    originalId,
    title: `Post ${originalId}`,
    renderedContent: null,
    isContentReady: true,
    isDismissed: false,
  };
}

const ABOUT = makePost("about");
const PRINCIPLES = makePost("principles");

/**
 * Base input keeping the machine in `idle` on start: activePostId is the first
 * post, so the initial-load auto-scroll guard does not fire.
 */
function baseInput(overrides: Partial<PostStackInput> = {}): PostStackInput {
  return {
    posts: [ABOUT, PRINCIPLES],
    currentStackIds: ["about", "principles"],
    activePostId: ABOUT.id,
    serverInitialStackIds: ["about", "principles"],
    allAvailablePostIds: ["about", "principles"],
    ...overrides,
  };
}

function startActor(input: PostStackInput = baseInput()) {
  const actor = createActor(postStackMachine, { input });
  actor.start();
  return actor;
}

describe("postStackMachine — structure (U5)", () => {
  it("has no goingHome state", () => {
    expect(Object.keys(postStackMachine.states)).not.toContain("goingHome");
  });

  it("starts idle when active post is first in the stack", () => {
    const actor = startActor();
    expect(actor.getSnapshot().matches("idle")).toBe(true);
  });
});

describe("postStackMachine — BROWSER_NAVIGATION dedup (U2)", () => {
  it("rebuilds a consistent stack for unique cached ids", () => {
    const actor = startActor();
    actor.send({
      type: "BROWSER_NAVIGATION",
      stackIds: ["about", "principles"],
    });

    const { context } = actor.getSnapshot();
    expect(context.currentStackIds).toEqual(["about", "principles"]);
    expect(context.visiblePostIds).toEqual(["about", "principles"]);
    expect(context.posts.length).toBe(context.currentStackIds.length);
    expect(context.activePostId).toBe(PRINCIPLES.id);
  });

  it("dedupes duplicate ids so stack arrays match posts", () => {
    const actor = startActor();
    actor.send({ type: "BROWSER_NAVIGATION", stackIds: ["about", "about"] });

    const { context } = actor.getSnapshot();
    expect(context.currentStackIds).toEqual(["about"]);
    expect(context.visiblePostIds).toEqual(["about"]);
    expect(context.posts.length).toBe(1);
  });

  it("dedupes when navigation is routed through cancellingScroll", () => {
    const actor = startActor();
    // Enter scrolling, then interrupt with a duplicate-id navigation.
    actor.send({ type: "SCROLL_TO_POST", postId: ABOUT.id });
    expect(actor.getSnapshot().matches("scrolling")).toBe(true);

    actor.send({ type: "BROWSER_NAVIGATION", stackIds: ["about", "about"] });

    const { context } = actor.getSnapshot();
    expect(context.currentStackIds).toEqual(["about"]);
    expect(context.visiblePostIds).toEqual(["about"]);
    expect(context.posts.length).toBe(1);
  });
});

describe("postStackMachine — error recovery (U3)", () => {
  function driveToError() {
    const actor = startActor();
    actor.send({ type: "ADD_POST", originalPostId: "ghost" });
    expect(actor.getSnapshot().matches("loadingPost")).toBe(true);
    actor.send({ type: "POST_LOAD_ERROR", error: "boom" });
    expect(actor.getSnapshot().matches("error")).toBe(true);
    expect(actor.getSnapshot().context.error).toBe("boom");
    return actor;
  }

  it("leaves error via BROWSER_NAVIGATION and clears the error", () => {
    const actor = driveToError();
    actor.send({ type: "BROWSER_NAVIGATION", stackIds: ["about"] });

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("error")).toBe(false);
    expect(snapshot.context.error).toBeNull();
    expect(snapshot.context.currentStackIds).toEqual(["about"]);
    expect(snapshot.context.posts.length).toBe(1);
    expect(snapshot.context.activePostId).toBe(ABOUT.id);
  });

  it("still handles ADD_POST from error", () => {
    const actor = driveToError();
    // isLoadingNewPost was reset to null on entering error.
    actor.send({ type: "ADD_POST", originalPostId: "ghost-2" });
    expect(actor.getSnapshot().matches("loadingPost")).toBe(true);
  });

  it("still handles CLEAR_ERROR from error", () => {
    const actor = driveToError();
    actor.send({ type: "CLEAR_ERROR" });
    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("idle")).toBe(true);
    expect(snapshot.context.error).toBeNull();
  });

  it("produces identical context from idle and error for the same nav", () => {
    const fromIdle = startActor();
    fromIdle.send({ type: "BROWSER_NAVIGATION", stackIds: ["principles"] });

    const fromError = driveToError();
    fromError.send({ type: "BROWSER_NAVIGATION", stackIds: ["principles"] });

    const a = fromIdle.getSnapshot().context;
    const b = fromError.getSnapshot().context;

    const subset = (c: typeof a) => ({
      currentStackIds: c.currentStackIds,
      visiblePostIds: c.visiblePostIds,
      postIds: c.posts.map((p) => p.id),
      activePostId: c.activePostId,
      programmaticScrollTarget: c.programmaticScrollTarget,
      error: c.error,
      isLoadingNewPost: c.isLoadingNewPost,
      dismissingInfo: c.dismissingInfo,
    });

    expect(subset(b)).toEqual(subset(a));
  });
});
