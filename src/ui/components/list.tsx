import React, { useState, useEffect } from "react";
import { ComponentContext, getStudioProApi } from "@mendix/extensions-api";

interface ListProps {
    context: ComponentContext;
}

interface ListItem {
    id: string;
    label: string;
}

interface PipelinesResponse {
    pipelines: string[];
}

function isPipelinesResponse(value: unknown): value is PipelinesResponse {
    return (
        typeof value === 'object' &&
        value !== null &&
        'pipelines' in value &&
        Array.isArray((value as any).pipelines) &&
        (value as any).pipelines.every((item: unknown) => typeof item === 'string')
    );
}

export const MyList: React.FC<ListProps> = ({ context }) => {
    const studioPro = getStudioProApi(context);
    const [items, setItems] = useState<ListItem[]>([
        { id: "1", label: "Item 1" },
        { id: "2", label: "Item 2" },
    ]);

    useEffect(() => {
        studioPro.ui.messagePassing.addMessageHandler<{ type: string, apiData: unknown }>(async messageInfo => {
            const messageData = messageInfo.message;

            if (messageData.type === "listData") {
                if (isPipelinesResponse(messageData.apiData)) {
                    const transformedItems = messageData.apiData.pipelines.map((pipeline, index) => ({
                        id: index.toString(),
                        label: pipeline
                    }));
                    setItems(transformedItems);
                }
            }
        });
    }, [context, studioPro.ui.messagePassing]);

    return (
        <div>
            <h1>My Title</h1>
            <ul>
                {items.map((item) => (
                    <li key={item.id}>{item.label}</li>
                ))}
            </ul>
        </div>
    );
};

export default MyList;