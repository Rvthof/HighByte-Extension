import { ComponentContext } from '@mendix/extensions-api';
import { ListItem, Pipeline } from './pipeline';

export interface ListProps {
    context: ComponentContext;
    apiData: unknown;
    apiLocation: string;
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
}
