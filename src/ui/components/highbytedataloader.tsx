import React, { useState } from 'react';
import { getStudioProApi, Primitives } from '@mendix/extensions-api';
import styles from '../index.module.css';
import { HighByteLoaderProps } from '../types';

const HighByteLoader: React.FC<HighByteLoaderProps> = ({ context, label, setApiData, setApiLocation, setMicroflowsWithRestActions }) => {
    const studioPro = getStudioProApi(context);
    const messageApi = studioPro.ui.messageBoxes;
    const [apiLoc, setApiLoc] = useState('http://127.0.0.1:8885/data/doc/index.html');
    
    const isValidUrl = (urlString: string): boolean => {
        try {
            return !!new URL(urlString);
        } catch {
            return false;
        }
    };

    const extractRESTCallActionsMatchingUrl = (microflow: any, apibaseurl: string): any[] => {
        if (!microflow || !microflow.objectCollection || !microflow.objectCollection.objects) {
            return [];
        }
        
        const restActions: any[] = [];
        
        microflow.objectCollection.objects.forEach((obj: any) => {
            if (obj && obj.$Type === 'Microflows$ActionActivity' && obj.action && obj.action.$Type === 'Microflows$RestCallAction') {
                try {
                    const expression = obj.action?.httpConfiguration?.customLocationTemplate?.arguments?.[0]?.expression;
                    if (expression) {
                        const cleanedExpression = expression.replace(/^'|'$/g, '');
                        if (cleanedExpression.startsWith(apibaseurl)) {
                            restActions.push(obj.action);
                        }
                    }
                } catch {
                    // Skip if structure doesn't match expected format
                }
            }
        });
        
        return restActions;
    };

    const extractPipelineName = (restCallAction: any): string => {
        const expression = restCallAction?.httpConfiguration?.customLocationTemplate?.arguments?.[0]?.expression || '';
        // Extract pipeline name from expression like: 'https://...v1/PipelineName/value'
        const match = expression.match(/v1\/([^/]+)\/value/);
        return match ? match[1] : 'Unknown';
    };

    const hasRESTCallActionMatchingUrl = (microflow: any, apibaseurl: string): boolean => {
        return extractRESTCallActionsMatchingUrl(microflow, apibaseurl).length > 0;
    };

    const handleClick = async () => {
        if (!isValidUrl(apiLoc)) {
            await messageApi.show('error', `Invalid URL: "${apiLoc}". Please enter a valid URL.`);
            return;
        }

        let apibaseurl = apiLoc;
        if (apibaseurl.endsWith('doc/index.html')) {
            apibaseurl = apibaseurl.replace(/doc\/index\.html$/, '');
        }
        setApiLocation(apibaseurl);

        let apiparamurl = apibaseurl.replace(/\/+$/, '') + '/v1/pipelines/params';

        try {
            const proxy = await studioPro.network.httpProxy.getProxyUrl(apiparamurl);
            const response = await fetch(proxy);
            if (!response.ok) {
                await messageApi.show('error', `Failed to fetch from URL. Status: ${response.status} from URL: ${apiparamurl}`);
                return;
            }
            setApiData(await response.json());

            const existingMicroflows = await studioPro.app.model.microflows.loadAll((info: Primitives.UnitInfo) => info.name ? info.name.startsWith('HighByte_'):false);

            const filteredMicroflows = existingMicroflows.filter(mf => hasRESTCallActionMatchingUrl(mf, apibaseurl));
            
            // Build simplified list with only required data
            const microflowsData = filteredMicroflows.map(microflow => {
                const restCallActions = extractRESTCallActionsMatchingUrl(microflow, apibaseurl);
                const pipelineName = restCallActions.length > 0 ? extractPipelineName(restCallActions[0]) : 'Unknown';

                const mf = microflow as any; // It thinks there is no $ModuleName property, so we cast to any
                
                return {
                    microflowID: microflow.$ID,
                    id: microflow.$ID,
                    name: microflow.name,
                    moduleName: mf.$ModuleName,
                    pipelineName
                };
            });
            
            if (setMicroflowsWithRestActions) {
                setMicroflowsWithRestActions(microflowsData);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await messageApi.show('error', `Error fetching from URL: ${errorMessage} for URL: ${apiparamurl}`);
        }
    };

    return (
        <div className={styles.loaderContainer}>
            <input
                className={styles.loaderInput}
                type="text"
                value={apiLoc}
                placeholder="Enter your HighByte Swagger URL..."
                onChange={(e) => setApiLoc(e.target.value)}
            />
            <button className={styles.loaderButton} onClick={handleClick}>
                {label}
            </button>
        </div>
    );
};

export default HighByteLoader;