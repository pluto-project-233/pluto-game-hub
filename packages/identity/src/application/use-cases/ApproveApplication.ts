import type { PrismaClient } from '@prisma/client';

export interface ApproveApplicationInput {
    applicationId: string;
    adminUserId: string;
    reviewNotes?: string;
}

/**
 * Approve a developer application
 * Updates application status and grants developer access to user
 */
export class ApproveApplicationUseCase {
    constructor(private prisma: PrismaClient) { }

    async execute(input: ApproveApplicationInput) {
        // Use transaction to ensure atomicity
        return await this.prisma.$transaction(async (tx) => {
            // Get the application
            const application = await tx.developerApplication.findUnique({
                where: { id: input.applicationId },
            });

            if (!application) {
                throw new Error('NOT_FOUND: Application not found');
            }

            if (application.status === 'APPROVED') {
                throw new Error('CONFLICT: Application already approved');
            }

            // Update application status
            const updatedApplication = await tx.developerApplication.update({
                where: { id: input.applicationId },
                data: {
                    status: 'APPROVED',
                    reviewedAt: new Date(),
                    reviewedBy: input.adminUserId,
                    reviewNotes: input.reviewNotes,
                },
            });

            // Update user with developer access
            const updatedUser = await tx.user.update({
                where: { id: application.userId },
                data: {
                    developerId: application.id,
                    developerStatus: 'ACTIVE',
                },
            });

            return {
                application: updatedApplication,
                user: {
                    id: updatedUser.id,
                    developerId: updatedUser.developerId,
                    developerStatus: updatedUser.developerStatus,
                },
            };
        });
    }
}
