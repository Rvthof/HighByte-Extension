import React from 'react';
import { getStudioProApi, Microflows, DomainModels } from '@mendix/extensions-api';
import styles from '../index.module.css';
import { CreateMicroflowProps } from '../types';
import { error } from 'console';

const CreateMicroflow: React.FC<CreateMicroflowProps> = ({ context, pipeline, apiLocation }) => {
    const studioPro = getStudioProApi(context);
    const messageApi = studioPro.ui.messageBoxes;
    const microflows = studioPro.app.model.microflows;

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

    const linkSequence = async (startId: string, endId: string, exclSplitValue?: boolean) => {
        const seq = await microflows.createElement("Microflows$SequenceFlow") as Microflows.SequenceFlow;
        seq.origin = startId;
        seq.destination = endId;
        if (exclSplitValue !== undefined) {
            const caseValue = await microflows.createElement("Microflows$EnumerationCase") as Microflows.EnumerationCase;
            caseValue.value = exclSplitValue ? "true" : "false";
            seq.caseValues = [caseValue];
        }
        return seq;
    }

    async function createMessageActivity(errorType: Microflows.ShowMessageType, messageText: string, expArgs : string[], languageCode: string) {
        const errorActivity = await microflows.createElement("Microflows$ActionActivity") as Microflows.ActionActivity;
        const errorMessageActivity = await microflows.createElement("Microflows$ShowMessageAction") as Microflows.ShowMessageAction;
        const txtTemplate = await microflows.createElement("Microflows$TextTemplate") as Microflows.TextTemplate;
        const text = await microflows.createElement("Texts$Text") as any;
        const translation = await microflows.createElement("Texts$Translation") as any;
        
        for (let arg in expArgs) {
            const errorTemplateArg = await microflows.createElement("Microflows$TemplateArgument") as Microflows.TemplateArgument;
            errorTemplateArg.expression = expArgs[arg];
            txtTemplate.arguments.push(errorTemplateArg);
        }

        translation.languageCode = languageCode;
        translation.text = messageText;
        text.translations.push(translation);
        txtTemplate.text = text;
        errorMessageActivity.type = errorType;
        errorMessageActivity.template = txtTemplate;
        errorActivity.action = errorMessageActivity;
        return errorActivity;
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

                    requestTemplateText += `"${field.name}":{${i + 1}},\n`;

                    const requestArg = await microflows.createElement("Microflows$TemplateArgument") as Microflows.TemplateArgument;
                    requestArg.expression = matchTemplateArgType(field.type, field.name);
                    argList.push(requestArg);
                } catch (paramError) {
                    console.warn(`Could not add parameter ${field.name}:`, paramError);
                }
            }

            requestTemplateText = requestTemplateText.slice(0, requestTemplateText.length - 2); // Remove trailing comma
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

            templateArg.expression = apiLocation+"v1/"+pipeline.name+"/value";
            stringTemplate.text = "{1}";
            stringTemplate.arguments = [templateArg];
            httpConfiguration.customLocationTemplate = stringTemplate;
            actionActivity.action = restCall;
            actionActivity.size = { width: 120, height: 60 };
            actionActivity.relativeMiddlePoint = { x: 400, y: 200 };

            restCall.httpConfiguration = httpConfiguration;
            microflow.objectCollection.objects.push(actionActivity);

            // Add exclusive split
            const exclusiveSplit = await microflows.createElement("Microflows$ExclusiveSplit") as Microflows.ExclusiveSplit;
            const condition = await microflows.createElement("Microflows$ExpressionSplitCondition") as Microflows.ExpressionSplitCondition;
            condition.expression = "$RESTResponse/StatusCode = 200";
            exclusiveSplit.splitCondition = condition;
            exclusiveSplit.size = { width: 60, height: 60 };
            exclusiveSplit.relativeMiddlePoint = { x: 600, y: 200 };
            microflow.objectCollection.objects.push(exclusiveSplit);

            microflow.flows.pop(); // Remove default flow

            // Add the activity into the sequence flow of the microflow
            const startEvent = microflow.objectCollection.objects[0] as Microflows.StartEvent;
            microflow.flows.push(await linkSequence(startEvent.$ID, actionActivity.$ID));

            microflow.flows.push(await linkSequence(actionActivity.$ID, exclusiveSplit.$ID));

            const endEvent = microflow.objectCollection.objects[1] as Microflows.EndEvent;
            endEvent.relativeMiddlePoint = { x: 900, y: 200 };
            microflow.flows.push(await linkSequence(exclusiveSplit.$ID, endEvent.$ID, true));

            // Add the error flow coming out of the exclusive split
            const errorActivity = await createMessageActivity("Error", "Error: Received status code {1} from HighByte API.", ["toString($RESTResponse/StatusCode)"], "en_US");

            errorActivity.size = { width: 120, height: 60 };
            errorActivity.relativeMiddlePoint = { x: 800, y: 300 };
            microflow.objectCollection.objects.push(errorActivity);

            microflow.flows.push(await linkSequence(exclusiveSplit.$ID, errorActivity.$ID, false));

            const errorEndEvent = await microflows.createElement("Microflows$EndEvent") as Microflows.EndEvent;
            errorEndEvent.relativeMiddlePoint = { x: 900, y: 300 };
            microflow.objectCollection.objects.push(errorEndEvent);
            microflow.flows.push(await linkSequence(errorActivity.$ID, errorEndEvent.$ID));

            // Save the microflow
            await microflows.save(microflow);

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


