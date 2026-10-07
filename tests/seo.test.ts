import { describe, expect, it } from "vitest";
import { stripSeoVariables } from "../lib/seo";

describe("SEO metadata migration", () => {
  it("expands legacy Yoast double-percent variables", () => {
    expect(stripSeoVariables("%%title%% %%sep%% %%sitename%%", "Contact Us")).toBe("Contact Us – Business Online Mastery");
  });
});
