import React, { useState } from 'react';
import { getStudioProApi } from '@mendix/extensions-api';
import styles from '../index.module.css';
import { HighByteLoaderProps } from '../types';

const HighByteLoader: React.FC<HighByteLoaderProps> = ({ context, label, setApiData, setApiLocation }) => {
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

        apibaseurl = apibaseurl.replace(/\/+$/, '') + '/v1/pipelines/params';

        try {
            const proxy = await studioPro.network.httpProxy.getProxyUrl(apibaseurl);
            const response = await fetch(proxy);
            if (!response.ok) {
                await messageApi.show('error', `Failed to fetch from URL. Status: ${response.status} from URL: ${apibaseurl}`);
                return;
            }
            setApiData(await response.json());
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await messageApi.show('error', `Error fetching from URL: ${errorMessage} for URL: ${apibaseurl}`);
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