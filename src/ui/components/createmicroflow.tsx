import React from 'react';
import { getStudioProApi, Microflows } from '@mendix/extensions-api';
import styles from '../index.module.css';
import { CreateMicroflowProps } from '../types';

const CreateMicroflow: React.FC<CreateMicroflowProps> = ({ context, pipeline, onMicroflowCreated }) => {
    const studioPro = getStudioProApi(context);
    const messageApi = studioPro.ui.messageBoxes;

    const handleCreateMicroflow = async () => {
        if (!pipeline) {
            await messageApi.show("warning", "No pipeline selected");
            return;
        }

        try {
            // Generate microflow name based on pipeline name
            const microflowName = `${pipeline.name.replace(/\s+/g, '_')}_Microflow`;

            const module = await studioPro.app.model.projects.getModule("Test");
            if (!module) {
                await messageApi.show("error", "No module found with the specified name.");
                return;
            }
            const containerId = module.$ID;
            const folderName = module.name || module?.$ID;

            // Create the microflow using the Studio Pro API
            const modules = await studioPro.app.model.projects.getModules();
            console.log("Available modules:", modules.map(m => m.name + ' ' + m.$ID));


            // Create the microflow first (without parameters)
            const microflow = await studioPro.app.model.microflows.addMicroflow(containerId, {
                name: microflowName
            });

            // Use the objectCollection.addMicroflowParameterObject method
            const objectCollection = microflow.objectCollection;

            // Try to add parameters after creation using a for loop
            for (let i = 0; i < pipeline.requiredFields.length; i++) {
                const field = pipeline.requiredFields[i];
                try {
                    const paramObj = await objectCollection.addMicroflowParameterObject({
                        name: field.name,
                        type: field.type.charAt(0).toUpperCase() + field.type.slice(1) as "Binary" | "Boolean" | "DateTime" | "Decimal" | "Float" | "Integer" | "String" | "Void"
                    });
                    paramObj.relativeMiddlePoint.x += 250 * i;
                } catch (paramError) {
                    console.warn(`Could not add parameter ${field.name}:`, paramError);
                }
            }

            // Save the microflow
            await studioPro.app.model.microflows.save(microflow);

            // Notify the parent component
            onMicroflowCreated?.(microflowName);

            await messageApi.show("info", `Microflow "${microflowName}" created successfully in folder '${folderName}'!`);
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
