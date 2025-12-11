export class CreateProjectDto {
    name: string;
    description?: string;
    budget?: number | string; // Handle string input from JSON
    templateId?: string;
}

export class UpdateProjectDto {
    name?: string;
    status?: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
    budget?: number | string;
    actualCost?: number | string;
}

export class CreatePhaseDto {
    name: string;
    description?: string;
}

export class UpdatePhaseDto {
    name?: string;
    description?: string;
    status?: 'PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
}

export class CreateTemplateDto {
    name: string;
    description?: string;
    phases: { name: string; description?: string }[];
}

export class ReorderPhaseDto {
    direction: 'UP' | 'DOWN';
}
