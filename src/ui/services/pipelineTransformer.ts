/**
 * Pipeline data transformation utilities
 */

import { isPipelinesResponse } from '../types';

export interface TransformedPipeline {
    id: string;
    name: string;
    description: string;
    requiredFields: Array<{ name: string; type: string }>;
}

export const transformPipelineData = (apiData: any): TransformedPipeline[] => {
    if (!isPipelinesResponse(apiData)) {
        return [];
    }

    return apiData.pipelines.map((pipeline: any, index: number) => ({
        id: index.toString(),
        name: pipeline.name,
        description: pipeline.description,
        requiredFields: (pipeline.parameters.required || []).map((fieldName: string) => ({
            name: fieldName,
            type: ((pipeline.parameters.properties as any)[fieldName] as any)?.type || 'unknown',
        })),
    }));
};

export const calculatePaginationValues = (
    itemsLength: number,
    currentPage: number,
    itemsPerPage: number,
) => {
    const totalPages = Math.ceil(itemsLength / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = (items: any[]) => items.slice(startIndex, endIndex);

    return { totalPages, startIndex, endIndex, paginatedItems };
};
