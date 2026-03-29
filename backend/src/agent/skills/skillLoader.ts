import * as fs from "fs/promises";
import * as path from "path";

export interface SkillMetadata {
  name: string;
  description: string;
  path: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string;
}

export interface Skill extends SkillMetadata {
  content: string;
}

const SKILLS_DIR = path.join(__dirname, ".");

function parseFrontmatter(content: string): {
  frontmatter: Record<string, any>;
  body: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error("SKILL.md must contain YAML frontmatter");
  }

  const frontmatterText = match[1];
  const body = match[2];

  const frontmatter: Record<string, any> = {};
  const lines = frontmatterText.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === "metadata" && value.startsWith("{")) {
      try {
        frontmatter[key] = JSON.parse(value);
      } catch {
        frontmatter[key] = value;
      }
    } else {
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

function validateSkillName(name: string, skillPath: string): void {
  if (!name || typeof name !== "string") {
    throw new Error(`Skill at ${skillPath}: 'name' field is required`);
  }
  if (name.length < 1 || name.length > 64) {
    throw new Error(`Skill at ${skillPath}: 'name' must be 1-64 characters`);
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error(
      `Skill at ${skillPath}: 'name' may only contain lowercase letters, numbers, and hyphens`,
    );
  }
  if (name.startsWith("-") || name.endsWith("-")) {
    throw new Error(`Skill at ${skillPath}: 'name' cannot start or end with hyphen`);
  }
  if (name.includes("--")) {
    throw new Error(`Skill at ${skillPath}: 'name' cannot contain consecutive hyphens`);
  }

  const dirName = path.basename(skillPath);
  if (name !== dirName) {
    throw new Error(
      `Skill at ${skillPath}: 'name' field ("${name}") must match directory name ("${dirName}")`,
    );
  }
}

function validateDescription(description: string, skillPath: string): void {
  if (!description || typeof description !== "string") {
    throw new Error(`Skill at ${skillPath}: 'description' field is required`);
  }
  if (description.length < 1 || description.length > 1024) {
    throw new Error(`Skill at ${skillPath}: 'description' must be 1-1024 characters`);
  }
}

export async function loadSkillMetadata(skillPath: string): Promise<SkillMetadata> {
  const skillMdPath = path.join(skillPath, "SKILL.md");

  try {
    const content = await fs.readFile(skillMdPath, "utf-8");
    const { frontmatter } = parseFrontmatter(content);

    const name = frontmatter.name;
    const description = frontmatter.description;

    validateSkillName(name, skillPath);
    validateDescription(description, skillPath);

    return {
      name,
      description,
      path: skillMdPath,
      license: frontmatter.license,
      compatibility: frontmatter.compatibility,
      metadata: frontmatter.metadata,
      allowedTools: frontmatter["allowed-tools"] || frontmatter.allowedTools,
    };
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error(`SKILL.md not found at ${skillMdPath}`);
    }
    throw error;
  }
}

export async function loadSkill(skillPath: string): Promise<Skill> {
  const skillMdPath = path.join(skillPath, "SKILL.md");

  try {
    const content = await fs.readFile(skillMdPath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);

    const name = frontmatter.name;
    const description = frontmatter.description;

    validateSkillName(name, skillPath);
    validateDescription(description, skillPath);

    return {
      name,
      description,
      path: skillMdPath,
      content: body.trim(),
      license: frontmatter.license,
      compatibility: frontmatter.compatibility,
      metadata: frontmatter.metadata,
      allowedTools: frontmatter["allowed-tools"] || frontmatter.allowedTools,
    };
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error(`SKILL.md not found at ${skillMdPath}`);
    }
    throw error;
  }
}

export async function discoverSkills(skillsDir: string = SKILLS_DIR): Promise<SkillMetadata[]> {
  const skills: SkillMetadata[] = [];

  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) {
        continue;
      }

      const skillPath = path.join(skillsDir, entry.name);
      const skillMdPath = path.join(skillPath, "SKILL.md");

      try {
        await fs.access(skillMdPath);
        const metadata = await loadSkillMetadata(skillPath);
        skills.push(metadata);
      } catch (error: any) {
        if (error.code === "ENOENT") continue;
        console.warn(`Failed to load skill at ${skillPath}:`, error.message);
      }
    }
  } catch (error: any) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export function generateSkillsXml(skills: SkillMetadata[]): string {
  if (skills.length === 0) return "";

  const skillsXml = skills
    .map(
      (skill) => `  <skill>
    <name>${skill.name}</name>
    <description>${skill.description}</description>
    <location>${skill.path}</location>
  </skill>`,
    )
    .join("\n");

  return `<available_skills>
${skillsXml}
</available_skills>`;
}
