import React, { useState, useEffect } from 'react';
import { Microflows } from '@mendix/extensions-api';
import styles from '../index.module.css';
import { CreateMicroflowProps } from '../types';
import { getStudioPro } from '../services/studioProService';
import { fetchModules, getModuleById } from '../services/moduleService';
import {
    createSequenceFlow,
    createMessageActivity,
    setupMicroflowParameters,
    setupRestCallAction,
    setupExclusiveSplit,
} from '../services/microflowService';

const CreateMicroflow: React.FC<CreateMicroflowProps> = ({ context, pipeline, apiLocation, microflowPrefix }) => {
    const [modules, setModules] = useState<string[]>([]);
    const [selectedModuleName, setSelectedModuleName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const studioPro = getStudioPro();
    const messageApi = studioPro.ui.messageBoxes;
    const microflows = studioPro.app.model.microflows;

    useEffect(() => {
        const loadModules = async () => {
            setIsLoading(true);
            try {
                const modulesList = await fetchModules();
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

        loadModules();
    }, [messageApi]);

    const handleCreateMicroflow = async () => {
        if (microflowPrefix.length < 2) {
            await messageApi.show('error', 'Microflow prefix must be at least 2 characters long.');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(microflowPrefix)) {
            await messageApi.show('error', 'Microflow prefix can only contain alphanumeric characters and underscores.');
            return;
        }

        if (!pipeline) {
            await messageApi.show('warning', 'No pipeline selected');
            return;
        }

        if (!selectedModuleName) {
            await messageApi.show('error', 'Please select a module to create the microflow in.');
            return;
        }

        try {
            const microflowName = `${microflowPrefix}${pipeline.name.replace(/\s+/g, '_')}_Microflow`;
            const module = await getModuleById(selectedModuleName);

            if (!module) {
                await messageApi.show('error', 'No module found with the specified name.');
                return;
            }

            const containerId = module.$ID;
            const folderName = module.name ?? module.$ID;

            const microflow = await microflows.addMicroflow(containerId, { name: microflowName });
            const objectCollection = microflow.objectCollection;

            // Build request template inline
            let requestTemplateText = pipeline.requiredFields.length === 0 ? '{{}}' : '{{\n';
            if (pipeline.requiredFields.length > 0) {
                pipeline.requiredFields.forEach((field, index) => {
                    requestTemplateText += `"${field.name}":{${index + 1}},\n`;
                });
                requestTemplateText = requestTemplateText.slice(0, -2);
                requestTemplateText += '\n}}';
            }

            // Add microflow parameters
            const argList = await setupMicroflowParameters(objectCollection, pipeline.requiredFields);

            // Setup REST call action
            const { restCall, actionActivity } = await setupRestCallAction(requestTemplateText, argList, `'${apiLocation}v1/${pipeline.name}/value'`);
            actionActivity.size = { width: 120, height: 60 };
            actionActivity.relativeMiddlePoint = { x: 400, y: 200 };

            microflow.objectCollection.objects.push(actionActivity);

            // Add exclusive split
            const exclusiveSplit = await setupExclusiveSplit('$RESTResponse/StatusCode = 200');
            exclusiveSplit.size = { width: 60, height: 60 };
            exclusiveSplit.relativeMiddlePoint = { x: 600, y: 200 };
            microflow.objectCollection.objects.push(exclusiveSplit);

            microflow.flows.pop();

            // Add flows
            const startEvent = microflow.objectCollection.objects[0];
            microflow.flows.push(await createSequenceFlow(startEvent.$ID, actionActivity.$ID));
            microflow.flows.push(await createSequenceFlow(actionActivity.$ID, exclusiveSplit.$ID));

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

            microflow.flows.push(await createSequenceFlow(exclusiveSplit.$ID, successActivity.$ID, true));

            const endEvent = microflow.objectCollection.objects[1]; // Retrieve the default end event that was created with the microflow
            endEvent.relativeMiddlePoint = { x: 900, y: 200 };
            microflow.flows.push(await createSequenceFlow(successActivity.$ID, endEvent.$ID));

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

            microflow.flows.push(await createSequenceFlow(exclusiveSplit.$ID, errorActivity.$ID, false));

            const errorEndEvent = await microflows.createElement('Microflows$EndEvent') as Microflows.EndEvent;
            errorEndEvent.relativeMiddlePoint = { x: 900, y: 300 };
            microflow.objectCollection.objects.push(errorEndEvent);
            microflow.flows.push(await createSequenceFlow(errorActivity.$ID, errorEndEvent.$ID));

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


