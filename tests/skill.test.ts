import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillPath = new URL("../skills/typesafe/SKILL.md", import.meta.url);

test("skill has Pi-compatible frontmatter and live-doc routing", async () => {
  const skill = await readFile(skillPath, "utf8");
  assert.match(skill, /^---\nname: typesafe\ndescription:/);
  assert.match(skill, /https:\/\/docs\.typesafe\.ai\/llms\.txt/);
  assert.match(skill, /references\/patterns\.md/);
  assert.match(skill, /references\/question-design\.md/);
  assert.match(skill, /references\/integration-checks\.md/);
  assert.match(skill, /cheap representative queries/);
});
