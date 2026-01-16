/**
 * Module service for fetching and filtering Mendix modules
 */

import { getStudioPro } from './studioProService';

export const fetchModules = async (): Promise<string[]> => {
    const studioPro = getStudioPro();
    const allModules = await studioPro.app.model.projects.getModules();
    const modulesList = Array.from(allModules)
        .filter((module: any) => !module.fromAppStore && module.name !== 'System')
        .map((module: any) => module.name);
    return modulesList;
};

export const getModuleById = async (moduleName: string) => {
    const studioPro = getStudioPro();
    return await studioPro.app.model.projects.getModule(moduleName);
};
