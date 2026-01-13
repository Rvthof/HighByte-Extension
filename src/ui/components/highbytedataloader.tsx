import React, { useState } from 'react';
import { getStudioProApi } from "@mendix/extensions-api";
import styles from '../index.module.css';
import { HighByteLoaderProps } from '../types';

const HighByteLoader: React.FC<HighByteLoaderProps> = ({ context, label, onClick, apiData, setApiData }) => {
    const [inputValue, setInputValue] = useState("http://127.0.0.1:8885/data/doc/index.html");
    const studioPro = getStudioProApi(context);
    const messageApi = studioPro.ui.messageBoxes;
    
    const isValidUrl = (urlString: string): boolean => {
        try {
            new URL(urlString);
            return true;
        } catch {
            return false;
        }
    };

    const handleClick = async () => {
        if (!isValidUrl(inputValue)) {
            await messageApi.show("error", `Invalid URL: "${inputValue}". Please enter a valid URL.`);
            return;
        }

        let apiurl = inputValue;
        if (apiurl.endsWith('doc/index.html')) {
            apiurl = apiurl.replace(/doc\/index\.html$/, '');
        }
        apiurl = apiurl.replace(/\/+$/, '') + '/v1/pipelines/params';

        try {
            const response = await fetch(apiurl);
            if (!response.ok) {
                await messageApi.show("error", `Failed to fetch from URL. Status: ${response.status} from URL: ${apiurl}`);
                return;
            }
            setApiData(await response.json());

            onClick?.(apiurl);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await messageApi.show("error", `Error fetching from URL: ${errorMessage} for URL: ${apiurl}`);
        }
    };

    return (
        <div className={styles.loaderContainer}>
            <input
                className={styles.loaderInput}
                type="text"
                value={inputValue}
                placeholder={"Enter your HighByte Swagger URL"}
                onChange={e => setInputValue(e.target.value)}
            />
            <button className={styles.loaderButton} onClick={handleClick}>
                {label}
            </button>
        </div>
    );
};

export default HighByteLoader;