export interface RequiredField {
    name: string;
    type: string;
}

export interface ListItem {
    id: string;
    name: string;
    description: string;
    requiredFields: RequiredField[];
}

export interface PipelineParameter {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
    $defs?: Record<string, unknown>;
}

export interface Pipeline {
    name: string;
    description: string;
    parameters: PipelineParameter;
}

export interface PipelinesResponse {
    pipelines: Pipeline[];
}

export function isPipelinesResponse(value: unknown): value is PipelinesResponse {
    return (
        typeof value === 'object' &&
        value !== null &&
        'pipelines' in value &&
        Array.isArray((value as any).pipelines) &&
        (value as any).pipelines.every((item: unknown) => 
            typeof item === 'object' &&
            item !== null &&
            'name' in item &&
            'description' in item &&
            'parameters' in item &&
            typeof (item as any).name === 'string' &&
            typeof (item as any).description === 'string' &&
            typeof (item as any).parameters === 'object'
        )
    );
}
