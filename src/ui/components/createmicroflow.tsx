import React from 'react';
import { getStudioProApi, Microflows, Primitives } from '@mendix/extensions-api';
import styles from '../index.module.css';
import { CreateMicroflowProps } from '../types';

const CreateMicroflow: React.FC<CreateMicroflowProps> = ({ context, pipeline, onMicroflowCreated }) => {
    const studioPro = getStudioProApi(context);
    const messageApi = studioPro.ui.messageBoxes;
    const microflows = studioPro.app.model.microflows;

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
            const microflow = await microflows.addMicroflow(containerId, {
                name: microflowName
            });

            // Use the objectCollection.addMicroflowParameterObject method
            const objectCollection = microflow.objectCollection;
            const params = [];

            // Try to add parameters after creation using a for loop
            for (let i = 0; i < pipeline.requiredFields.length; i++) {
                const field = pipeline.requiredFields[i];
                try {
                    // const param = await microflows.createElement("Microflows$MicroflowParameterObject") as Microflows.MicroflowParameterObject;
                    // param.name = field.name;
                    
                    // param.variableType = field.type.charAt(0).toUpperCase() + field.type.slice(1) as "Binary" | "Boolean" | "DateTime" | "Decimal" | "Float" | "Integer" | "String" | "Void";
                    // param.relativeMiddlePoint.x += 250 * i;
                    // objectCollection.objects.push(param);

                    await objectCollection.addMicroflowParameterObject({
                        name: field.name,
                        type: field.type.charAt(0).toUpperCase() + field.type.slice(1) as "Binary" | "Boolean" | "DateTime" | "Decimal" | "Float" | "Integer" | "String" | "Void"
                    });
                    const paramObj = await objectCollection.getMicroflowParameterObject(field.name) as Microflows.MicroflowParameterObject;
                    paramObj.relativeMiddlePoint.x += 250 * i;
                    paramObj.size = { width: 40, height: 40 };

                } catch (paramError) {
                    console.warn(`Could not add parameter ${field.name}:`, paramError);
                }
            }

            // Create and add the REST Call action activity
            const actionActivity = await microflows.createElement("Microflows$ActionActivity") as Microflows.ActionActivity;
            const restCall = await microflows.createElement("Microflows$RestCallAction") as Microflows.RestCallAction;
            const httpConfiguration = await microflows.createElement("Microflows$HttpConfiguration") as Microflows.HttpConfiguration;
            const stringTemplate = await microflows.createElement("Microflows$StringTemplate") as Microflows.StringTemplate;
            const templateArg = await microflows.createElement("Microflows$TemplateArgument") as Microflows.TemplateArgument;

            templateArg.expression = "http://127.0.0.1:8885/data/doc/index.html";
            stringTemplate.text = "{1}";
            stringTemplate.arguments = [templateArg];
            httpConfiguration.customLocationTemplate = stringTemplate;
            actionActivity.action = restCall;
            actionActivity.size = { width: 120, height: 60 };

            restCall.httpConfiguration = httpConfiguration;
            microflow.objectCollection.objects.push(actionActivity);

            microflow.flows.pop(); // Remove default flow

            // Add the activity into the sequence flow of the microflow
            const seq = await microflows.createElement("Microflows$SequenceFlow") as Microflows.SequenceFlow;
            const startEvent = microflow.objectCollection.objects[0] as Microflows.StartEvent;
            seq.origin = startEvent.$ID;
            seq.destination = actionActivity.$ID;
            microflow.flows.push(seq);

            const seq2 = await microflows.createElement("Microflows$SequenceFlow") as Microflows.SequenceFlow;
            const endEvent = microflow.objectCollection.objects[1] as Microflows.EndEvent;
            seq2.origin = actionActivity.$ID;
            seq2.destination = endEvent.$ID;
            microflow.flows.push(seq2);

            // Save the microflow
            await microflows.save(microflow);

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
