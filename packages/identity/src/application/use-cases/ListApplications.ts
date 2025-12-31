import type { PrismaClient } from '@prisma/client';
import type { ApplicationStatus } from '@prisma/client';

export interface ListApplicationsInput {
    status?: ApplicationStatus;
    limit?: number;
    offset?: number;
}

export interface ListApplicationsOutput {
    data: any[];
    total: number;
    limit: number;
    offset: number;
}

/**
 * List developer applications (admin only)
 * Supports filtering by status and pagination
 */
export class ListApplicationsUseCase {
    constructor(private prisma: PrismaClient) { }

    async execute(input: ListApplicationsInput): Promise<ListApplicationsOutput> {
        const limit = input.limit || 20;
        const offset = input.offset || 0;

        const where = input.status ? { status: input.status } : {};

        const [applications, total] = await Promise.all([
            this.prisma.developerApplication.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { submittedAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            uniqueDisplayName: true,
                        },
                    },
                },
            }),
            this.prisma.developerApplication.count({ where }),
        ]);

        return {
            data: applications,
            total,
            limit,
            offset,
        };
    }
}
