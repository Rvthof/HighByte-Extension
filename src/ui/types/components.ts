import { ComponentContext } from '@mendix/extensions-api';
import { ListItem, Pipeline } from './pipeline';

export interface ListProps {
    context: ComponentContext;
    apiData: unknown;
}

export interface CreateMicroflowProps {
    context: ComponentContext;
    pipeline: ListItem | null;
    onMicroflowCreated?: (microflowName: string) => void;
}

export interface HighByteLoaderProps {
    context: ComponentContext;
    label: string;
    onClick?: (value: string) => void;
    apiData: unknown;
    setApiData: (data: unknown) => void;
}
