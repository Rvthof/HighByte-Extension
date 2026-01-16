import React, { useState, useEffect } from 'react';
import { getStudioProApi, Microflows } from '@mendix/extensions-api';
import styles from '../index.module.css';
import { CreateMicroflowProps } from '../types';

const CreateMicroflow: React.FC<CreateMicroflowProps> = ({ context, pipeline, apiLocation }) => {
    const [modules, setModules] = useState<string[]>([]);
    const [selectedModuleName, setSelectedModuleName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const studioPro = getStudioProApi(context);
    const messageApi = studioPro.ui.messageBoxes;
    const microflows = studioPro.app.model.microflows;

    useEffect(() => {
        const fetchModules = async () => {
            setIsLoading(true);
            try {
                const allModules = await studioPro.app.model.projects.getModules();
                const modulesList = Array.from(allModules)
                    .filter(module => !module.fromAppStore && module.name !== 'System')
                    .map(module => module.name);
                setModules(modulesList);
                if (modulesList.length > 0) {
                    setSelectedModuleName(modulesList[0]);
                }
            } catch (error) {
                console.error('Error fetching modules:', error);
                await messageApi.show('error', 'Failed to load modules');
            } finally {
                setIsLoading(false);
            }
        };

        fetchModules();
    }, []);

    const matchTemplateArgType = (typeStr: string, fieldName: string): string => {
        const type = typeStr.toLowerCase();
        const templateMap: Record<string, string> = {
            string: `$${fieldName}`,
            integer: `toString($${fieldName})`,
            decimal: `$${fieldName}`,
            boolean: `if $${fieldName} = true then 'true' else 'false'`,
            datetime: `$${fieldName}`,
        };
        return templateMap[type] ?? `$${fieldName}`;
    };

    const linkSequence = async (startId: string, endId: string, exclSplitValue?: boolean) => {
        const seq = await microflows.createElement('Microflows$SequenceFlow') as Microflows.SequenceFlow;
        seq.origin = startId;
        seq.destination = endId;
        if (exclSplitValue !== undefined) {
            const caseValue = await microflows.createElement('Microflows$EnumerationCase') as Microflows.EnumerationCase;
            caseValue.value = exclSplitValue ? 'true' : 'false';
            seq.caseValues = [caseValue];
        }
        return seq;
    };

    const createMessageActivity = async (errorType: Microflows.ShowMessageType, messageText: string, expArgs: string[], languageCode: string) => {
        const errorActivity = await microflows.createElement('Microflows$ActionActivity') as Microflows.ActionActivity;
        const errorMessageActivity = await microflows.createElement('Microflows$ShowMessageAction') as Microflows.ShowMessageAction;
        const txtTemplate = await microflows.createElement('Microflows$TextTemplate') as Microflows.TextTemplate;
        const text = await microflows.createElement('Texts$Text') as any;
        const translation = await microflows.createElement('Texts$Translation') as any;

        expArgs.forEach(async (arg) => {
            const errorTemplateArg = await microflows.createElement('Microflows$TemplateArgument') as Microflows.TemplateArgument;
            errorTemplateArg.expression = arg;
            txtTemplate.arguments.push(errorTemplateArg);
        });

        translation.languageCode = languageCode;
        translation.text = messageText;
        text.translations.push(translation);
        txtTemplate.text = text;
        errorMessageActivity.type = errorType;
        errorMessageActivity.template = txtTemplate;
        errorActivity.action = errorMessageActivity;
        return errorActivity;
    };

    const capitalizeType = (type: string): string => {
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    const buildRequestTemplate = (fields: Array<{ name: string; type: string }>): { templateText: string; argList: Microflows.TemplateArgument[] } => {
        let requestTemplateText = '{{\n';
        const argList: Microflows.TemplateArgument[] = [];

        fields.forEach((field, index) => {
            requestTemplateText += `"${field.name}":{${index + 1}},\n`;
        });

        requestTemplateText = requestTemplateText.slice(0, -2);
        requestTemplateText += '\n}}';

        return { templateText: requestTemplateText, argList };
    };

    const handleCreateMicroflow = async () => {
        if (!pipeline) {
            await messageApi.show('warning', 'No pipeline selected');
            return;
        }

        if (!selectedModuleName) {
            await messageApi.show('error', 'Please select a module to create the microflow in.');
            return;
        }

        try {
            const microflowName = `${pipeline.name.replace(/\s+/g, '_')}_Microflow`;
            const module = await studioPro.app.model.projects.getModule(selectedModuleName);

            if (!module) {
                await messageApi.show('error', 'No module found with the specified name.');
                return;
            }

            const containerId = module.$ID;
            const folderName = module.name ?? module.$ID;

            const microflow = await microflows.addMicroflow(containerId, { name: microflowName });
            const objectCollection = microflow.objectCollection;

            const { templateText: requestTemplateText, argList } = buildRequestTemplate(pipeline.requiredFields);

            // Add microflow parameters
            for (let i = 0; i < pipeline.requiredFields.length; i++) {
                const field = pipeline.requiredFields[i];
                try {
                    await objectCollection.addMicroflowParameterObject({
                        name: field.name,
                        type: capitalizeType(field.type) as
                            | 'Binary'
                            | 'Boolean'
                            | 'DateTime'
                            | 'Decimal'
                            | 'Float'
                            | 'Integer'
                            | 'String'
                            | 'Void',
                    });
                    const paramObj = objectCollection.getMicroflowParameterObject(field.name) as Microflows.MicroflowParameterObject;
                    paramObj.size = { width: 30, height: 30 };
                    paramObj.relativeMiddlePoint = { x: 100 + i * 100, y: 0 };

                    const requestArg = await microflows.createElement('Microflows$TemplateArgument') as Microflows.TemplateArgument;
                    requestArg.expression = matchTemplateArgType(field.type, field.name);
                    argList.push(requestArg);
                } catch (paramError) {
                    console.warn(`Could not add parameter ${field.name}:`, paramError);
                }
            }

            // Create REST call action
            const restCall = await microflows.createElement('Microflows$RestCallAction') as Microflows.RestCallAction;

            // Set up request handling
            const requestHandler = await microflows.createElement('Microflows$CustomRequestHandling') as Microflows.CustomRequestHandling;
            const reqHandlingTemplate = await microflows.createElement('Microflows$StringTemplate') as Microflows.StringTemplate;

            reqHandlingTemplate.text = requestTemplateText;
            reqHandlingTemplate.arguments = argList;
            requestHandler.template = reqHandlingTemplate;
            restCall.requestHandling = requestHandler;

            // Set up response handling
            const respHandler = await microflows.createElement('Microflows$ResultHandling') as Microflows.ResultHandling;
            const datatype = await microflows.createElement('DataTypes$ObjectType') as any;
            datatype.entity = 'System.HttpResponse';

            respHandler.outputVariableName = 'RESTResponse';
            respHandler.storeInVariable = true;
            respHandler.variableType = datatype;
            restCall.resultHandling = respHandler;
            restCall.resultHandlingType = 'HttpResponse';

            // Set up HTTP configuration
            const httpConfiguration = await microflows.createElement('Microflows$HttpConfiguration') as Microflows.HttpConfiguration;
            const stringTemplate = await microflows.createElement('Microflows$StringTemplate') as Microflows.StringTemplate;
            const templateArg = await microflows.createElement('Microflows$TemplateArgument') as Microflows.TemplateArgument;
            const actionActivity = await microflows.createElement('Microflows$ActionActivity') as Microflows.ActionActivity;

            templateArg.expression = `${apiLocation}v1/${pipeline.name}/value`;
            stringTemplate.text = '{1}';
            stringTemplate.arguments = [templateArg];
            httpConfiguration.customLocationTemplate = stringTemplate;
            actionActivity.action = restCall;
            actionActivity.size = { width: 120, height: 60 };
            actionActivity.relativeMiddlePoint = { x: 400, y: 200 };

            restCall.httpConfiguration = httpConfiguration;
            microflow.objectCollection.objects.push(actionActivity);

            // Add exclusive split
            const exclusiveSplit = await microflows.createElement('Microflows$ExclusiveSplit') as Microflows.ExclusiveSplit;
            const condition = await microflows.createElement('Microflows$ExpressionSplitCondition') as Microflows.ExpressionSplitCondition;
            condition.expression = '$RESTResponse/StatusCode = 200';
            exclusiveSplit.splitCondition = condition;
            exclusiveSplit.size = { width: 60, height: 60 };
            exclusiveSplit.relativeMiddlePoint = { x: 600, y: 200 };
            microflow.objectCollection.objects.push(exclusiveSplit);

            microflow.flows.pop();

            // Add flows
            const startEvent = microflow.objectCollection.objects[0] as Microflows.StartEvent;
            microflow.flows.push(await linkSequence(startEvent.$ID, actionActivity.$ID));
            microflow.flows.push(await linkSequence(actionActivity.$ID, exclusiveSplit.$ID));

            // Add success flow
            const successActivity = await createMessageActivity(
                'Information',
                'Successfully received response from HighByte API. Response: {1}',
                ['$RESTResponse/Content'],
                'en_US',
            );
            successActivity.size = { width: 120, height: 60 };
            successActivity.relativeMiddlePoint = { x: 800, y: 200 };
            microflow.objectCollection.objects.push(successActivity);

            microflow.flows.push(await linkSequence(exclusiveSplit.$ID, successActivity.$ID, true));

            const endEvent = microflow.objectCollection.objects[1] as Microflows.EndEvent;
            endEvent.relativeMiddlePoint = { x: 900, y: 200 };
            microflow.flows.push(await linkSequence(successActivity.$ID, endEvent.$ID));

            // Add error flow
            const errorActivity = await createMessageActivity(
                'Error',
                'Error: Received status code {1} from HighByte API.',
                ['toString($RESTResponse/StatusCode)'],
                'en_US',
            );
            errorActivity.size = { width: 120, height: 60 };
            errorActivity.relativeMiddlePoint = { x: 800, y: 300 };
            microflow.objectCollection.objects.push(errorActivity);

            microflow.flows.push(await linkSequence(exclusiveSplit.$ID, errorActivity.$ID, false));

            const errorEndEvent = await microflows.createElement('Microflows$EndEvent') as Microflows.EndEvent;
            errorEndEvent.relativeMiddlePoint = { x: 900, y: 300 };
            microflow.objectCollection.objects.push(errorEndEvent);
            microflow.flows.push(await linkSequence(errorActivity.$ID, errorEndEvent.$ID));

            // Save the microflow
            await microflows.save(microflow);

            await messageApi.show('info', `Microflow "${microflowName}" created successfully in folder '${folderName}'!`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await messageApi.show('error', `Error creating microflow: ${errorMessage}`);
        }
    };

    if (!pipeline) {
        return null;
    }

    return (
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
            <div className={styles.microflowSelectContainer}>
                <label htmlFor="module-select" className={styles.microflowSelectLabel}>
                    Select Module:
                </label>
                <select
                    id="module-select"
                    value={selectedModuleName}
                    onChange={(e) => setSelectedModuleName(e.target.value)}
                    className={styles.microflowSelect}
                    disabled={isLoading}
                >
                    {modules.map((moduleName) => (
                        <option key={moduleName} value={moduleName}>
                            {moduleName}
                        </option>
                    ))}
                </select>
            </div>
            <button className={styles.microflowButton} onClick={handleCreateMicroflow} disabled={isLoading}>
                Create Microflow
            </button>
        </div>
    );
};

export default CreateMicroflow;


