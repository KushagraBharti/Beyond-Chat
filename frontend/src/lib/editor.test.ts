import { describe, expect, test } from "vitest";
import { markdownToHtml } from "./editor";

describe("markdownToHtml", () => {
  test("converts headings, paragraphs, and lists", () => {
    const output = markdownToHtml("# Title\n\nA paragraph\n- one\n- two");

    expect(output).toContain("<h1>Title</h1>");
    expect(output).toContain("<p>A paragraph</p>");
    expect(output).toContain("<ul>");
    expect(output).toContain("<li>one</li>");
    expect(output).toContain("<li>two</li>");
  });

  test("escapes html input before rendering", () => {
    const output = markdownToHtml("<script>alert('x')</script>");

    expect(output).toContain("&lt;script&gt;alert('x')&lt;/script&gt;");
    expect(output).not.toContain("<script>");
  });
});
