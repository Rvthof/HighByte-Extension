import { ComponentContext } from '@mendix/extensions-api';
import { ListItem, Pipeline } from './pipeline';

export interface ListProps {
    context: ComponentContext;
    apiData: unknown;
    apiLocation: string;
    microflowsWithRestActions?: Array<{ microflowID: string; id: string; name: string; moduleName: string; pipelineName: string }>;
}

export interface CreateMicroflowProps {
    context: ComponentContext;
    pipeline: ListItem | null;
    apiLocation: string;
}

export interface HighByteLoaderProps {
    context: ComponentContext;
    label: string;
    setApiData: (data: unknown) => void;
    setApiLocation: (value: string) => void;
    setMicroflowsWithRestActions?: (data: Array<{ microflowID: string; id: string; name: string; moduleName: string; pipelineName: string }>) => void;
}
