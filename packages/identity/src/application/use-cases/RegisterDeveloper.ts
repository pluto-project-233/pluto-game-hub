import type { PrismaClient } from '@prisma/client';

export interface RegisterDeveloperInput {
    userId: string;
    email: string;
    companyName: string;
    website?: string;
    description: string;
    gamesPlanned: string;
}

/**
 * Register a developer application
 * Creates a new developer application with SUBMITTED status
 */
export class RegisterDeveloperUseCase {
    constructor(private prisma: PrismaClient) { }

    async execute(input: RegisterDeveloperInput) {
        // Check for existing application
        const existingApplication = await this.prisma.developerApplication.findUnique({
            where: { userId: input.userId }
        });

        if (existingApplication) {
            throw new Error(`ALREADY_REGISTERED: User already has a developer application. Current status: ${existingApplication.status}`);
        }

        // Create developer application
        const application = await this.prisma.developerApplication.create({
            data: {
                userId: input.userId,
                email: input.email,
                companyName: input.companyName,
                website: input.website,
                description: input.description,
                gamesPlanned: input.gamesPlanned,
            },
        });

        return application;
    }
}
