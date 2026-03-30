import { Injectable, NotFoundException, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSkills(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [skills, total] = await Promise.all([
      this.prisma.userSkill.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.userSkill.count({ where: { userId } }),
    ]);

    return {
      data: skills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSkill(userId: string, skillId: string) {
    const skill = await this.prisma.userSkill.findUnique({
      where: { id: skillId },
    });

    if (!skill) {
      throw new NotFoundException("Skill not found");
    }
    if (skill.userId !== userId) {
      throw new ForbiddenException("Not authorized to access this skill");
    }

    return skill;
  }

  async createSkill(data: {
    userId: string;
    name: string;
    description?: string;
    url?: string;
    content?: string;
  }) {
    let { content } = data;

    if (data.url && !content) {
      content = await this.fetchSkillFromUrl(data.url);
    }

    if (!content) {
      content = "";
    }

    const metadata = this.parseSkillMetadata(content);

    return this.prisma.userSkill.create({
      data: {
        userId: data.userId,
        name: data.name || metadata.name || "Untitled Skill",
        description: data.description || metadata.description,
        url: data.url,
        content,
      },
    });
  }

  async updateSkill(
    userId: string,
    skillId: string,
    data: Partial<{ name: string; description: string; url: string; content: string }>
  ) {
    await this.getSkill(userId, skillId);

    return this.prisma.userSkill.update({
      where: { id: skillId },
      data,
    });
  }

  async deleteSkill(userId: string, skillId: string) {
    await this.getSkill(userId, skillId);

    return this.prisma.userSkill.delete({
      where: { id: skillId },
    });
  }

  async fetchSkillFromUrl(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`Failed to fetch skill from URL: ${url} (${response.status})`);
        return "";
      }
      return response.text();
    } catch (error) {
      this.logger.error(`Error fetching skill from URL: ${url}`, error);
      return "";
    }
  }

  parseSkillMetadata(content: string): { name?: string; description?: string } {
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return {};

    const frontmatter = frontmatterMatch[1];
    const result: { name?: string; description?: string } = {};

    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    if (nameMatch) result.name = nameMatch[1].trim().replace(/^["']|["']$/g, "");

    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
    if (descMatch) result.description = descMatch[1].trim().replace(/^["']|["']$/g, "");

    return result;
  }
}
