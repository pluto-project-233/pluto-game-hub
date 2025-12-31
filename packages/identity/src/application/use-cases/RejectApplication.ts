import type { PrismaClient } from '@prisma/client';

export interface RejectApplicationInput {
    applicationId: string;
    adminUserId: string;
    reviewNotes: string; // Required for rejection
}

/**
 * Reject a developer application
 * Updates application status to REJECTED
 */
export class RejectApplicationUseCase {
    constructor(private prisma: PrismaClient) { }

    async execute(input: RejectApplicationInput) {
        // Get the application
        const application = await this.prisma.developerApplication.findUnique({
            where: { id: input.applicationId },
        });

        if (!application) {
            throw new Error('NOT_FOUND: Application not found');
        }

        if (application.status === 'APPROVED') {
            throw new Error('CONFLICT: Cannot reject an approved application');
        }

        if (application.status === 'REJECTED') {
            throw new Error('CONFLICT: Application already rejected');
        }

        // Update application status
        const updatedApplication = await this.prisma.developerApplication.update({
            where: { id: input.applicationId },
            data: {
                status: 'REJECTED',
                reviewedAt: new Date(),
                reviewedBy: input.adminUserId,
                reviewNotes: input.reviewNotes,
            },
        });

        return {
            application: updatedApplication,
        };
    }
}
