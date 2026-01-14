import React from 'react';
import { getStudioProApi, Microflows, DomainModels } from '@mendix/extensions-api';
import styles from '../index.module.css';
import { CreateMicroflowProps } from '../types';

const CreateMicroflow: React.FC<CreateMicroflowProps> = ({ context, pipeline, onMicroflowCreated }) => {
    const studioPro = getStudioProApi(context);
    const messageApi = studioPro.ui.messageBoxes;
    const microflows = studioPro.app.model.microflows;
    const domainmodels = studioPro.app.model.domainModels;

    const matchTemplateArgType = (typeStr: string, fieldName: string): string => {
        switch (typeStr.toLowerCase()) {
            case "string":  
                return `$${fieldName}`;
            case "integer":
                return `toString($${fieldName})`;
            case "decimal":
                return `$${fieldName}`;
            case "boolean":
                return `if $${fieldName} = true then 'true' else 'false'`;
            case "datetime":
                return `$${fieldName}`;
            default:
                return `$${fieldName}`;
        }
    }

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

            // Prep for requesthandling template
            let requestTemplateText = "{{\n";
            let argList: Microflows.TemplateArgument[] = [];

            // Try to add parameters after creation using a for loop
            for (let i = 0; i < pipeline.requiredFields.length; i++) {
                const field = pipeline.requiredFields[i];
                try {
                    await objectCollection.addMicroflowParameterObject({
                        name: field.name,
                        type: field.type.charAt(0).toUpperCase() + field.type.slice(1) as "Binary" | "Boolean" | "DateTime" | "Decimal" | "Float" | "Integer" | "String" | "Void"
                    });
                    const paramObj = objectCollection.getMicroflowParameterObject(field.name) as Microflows.MicroflowParameterObject;
                    paramObj.size = { width: 30, height: 30 };
                    paramObj.relativeMiddlePoint = { x: 100 + (i * 100), y: 0 };

                    requestTemplateText += `"${field.name}":{${i+1}},\n`;

                    const requestArg = await microflows.createElement("Microflows$TemplateArgument") as Microflows.TemplateArgument;
                    requestArg.expression = matchTemplateArgType(field.type, field.name);
                    argList.push(requestArg);
                } catch (paramError) {
                    console.warn(`Could not add parameter ${field.name}:`, paramError);
                }
            }

            requestTemplateText = requestTemplateText.slice(0, requestTemplateText.length-2); // Remove trailing comma
            requestTemplateText += "\n}}";

            // Create and add the REST Call action activity
            const restCall = await microflows.createElement("Microflows$RestCallAction") as Microflows.RestCallAction;
            
            // Set up the request handling template
            const requestHandler = await microflows.createElement("Microflows$CustomRequestHandling") as Microflows.CustomRequestHandling;
            const reqHandlingTemplate = await microflows.createElement("Microflows$StringTemplate") as Microflows.StringTemplate;

            reqHandlingTemplate.text = requestTemplateText;
            reqHandlingTemplate.arguments = argList;
            requestHandler.template = reqHandlingTemplate;
            restCall.requestHandling = requestHandler;
            
            // Set up the response handling
            const respHandler = await microflows.createElement("Microflows$ResultHandling") as Microflows.ResultHandling;
            const datatype = await microflows.createElement("DataTypes$ObjectType") as any;
            datatype.entity = "System.HttpResponse";

            respHandler.outputVariableName = "RESTResponse";
            respHandler.storeInVariable = true;
            respHandler.variableType = datatype;
            restCall.resultHandling = respHandler;
            restCall.resultHandlingType = "HttpResponse";
            
            // Set up the HTTP configuration
            const httpConfiguration = await microflows.createElement("Microflows$HttpConfiguration") as Microflows.HttpConfiguration;
            const stringTemplate = await microflows.createElement("Microflows$StringTemplate") as Microflows.StringTemplate;
            const templateArg = await microflows.createElement("Microflows$TemplateArgument") as Microflows.TemplateArgument;
            const actionActivity = await microflows.createElement("Microflows$ActionActivity") as Microflows.ActionActivity;

            templateArg.expression = "http://127.0.0.1:8885/data/doc/index.html";
            stringTemplate.text = "{1}";
            stringTemplate.arguments = [templateArg];
            httpConfiguration.customLocationTemplate = stringTemplate;
            actionActivity.action = restCall;
            actionActivity.size = { width: 120, height: 60 };
            actionActivity.relativeMiddlePoint = { x: 400, y: 200 };

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
