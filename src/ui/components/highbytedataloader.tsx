import React, { useEffect, useState } from 'react';
import { ComponentContext, getStudioProApi } from "@mendix/extensions-api";

interface ButtonProps {
    context: ComponentContext;
    label: string;
    onClick?: (value: string) => void;
    apiData: unknown;
    setApiData: (data: unknown) => void;
}

const HighByteLoader: React.FC<ButtonProps> = ({ context, label, onClick, apiData, setApiData }) => {
    const [inputValue, setInputValue] = useState("");
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
        <div>
            <input
                type="text"
                value={inputValue}
                size={50}
                placeholder={"Enter your HighByte Swagger URL"}
                onChange={e => setInputValue(e.target.value)}
            />
            <button onClick={handleClick}>
                {label}
            </button>
        </div>
    );
};

export default HighByteLoader;