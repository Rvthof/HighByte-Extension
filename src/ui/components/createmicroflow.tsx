import React from 'react';
import { ComponentContext, getStudioProApi } from '@mendix/extensions-api';
import styles from '../index.module.css';

interface RequiredField {
    name: string;
    type: string;
}

interface Pipeline {
    id: string;
    name: string;
    description: string;
    requiredFields: RequiredField[];
}

interface CreateMicroflowProps {
    context: ComponentContext;
    pipeline: Pipeline | null;
    onMicroflowCreated?: (microflowName: string) => void;
}

const CreateMicroflow: React.FC<CreateMicroflowProps> = ({ context, pipeline, onMicroflowCreated }) => {
    const studioPro = getStudioProApi(context);
    const messageApi = studioPro.ui.messageBoxes;

    const handleCreateMicroflow = async () => {
        if (!pipeline) {
            await messageApi.show("warning", "No pipeline selected");
            return;
        }

        try {
            // TODO: Implement microflow creation logic
            console.log("Creating microflow for pipeline:", pipeline);
            await messageApi.show("info", `Microflow creation for "${pipeline.name}" is not yet implemented.`);
            
            // Example of what will happen here:
            // const microflowName = `${pipeline.name}_Flow`;
            // await studioPro.model.microflows.create(...);
            // onMicroflowCreated?.(microflowName);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await messageApi.show("error", `Error creating microflow: ${errorMessage}`);
        }
    };

    return (
        <div>
            {pipeline && (
                <div className={styles.microflowSection}>
                    <h2 className={styles.microflowTitle}>Create Microflow for: {pipeline.name}</h2>
                    <p className={styles.microflowDescription}>{pipeline.description || 'No description available'}</p>
                    <h3>Required Parameters:</h3>
                    <ul>
                        {pipeline.requiredFields.map((field) => (
                            <li key={field.name}>
                                {field.name} <code>[{field.type}]</code>
                            </li>
                        ))}
                    </ul>
                    <button className={styles.microflowButton} onClick={handleCreateMicroflow}>
                        Create Microflow
                    </button>
                </div>
            )}
        </div>
    );
};

export default CreateMicroflow;
