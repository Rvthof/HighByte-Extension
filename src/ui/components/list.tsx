import React, { useState, useEffect } from "react";
import { getStudioProApi } from "@mendix/extensions-api";
import styles from "../index.module.css";
import CreateMicroflow from "./createmicroflow";
import { ListProps, ListItem, isPipelinesResponse } from "../types";

export const MyList: React.FC<ListProps> = ({ context, apiData, apiLocation }) => {
    const studioPro = getStudioProApi(context);
    const [items, setItems] = useState<ListItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedPipeline, setSelectedPipeline] = useState<ListItem | null>(null);

    const handlePipelineClick = (pipeline: ListItem) => {
        setSelectedId(pipeline.id);
        setSelectedPipeline(pipeline);
    };

    useEffect(() => {
        if (isPipelinesResponse(apiData)) {
            const transformedItems = apiData.pipelines.map((pipeline, index) => ({
                id: index.toString(),
                name: pipeline.name,
                description: pipeline.description,
                requiredFields: (pipeline.parameters.required || []).map(fieldName => ({
                    name: fieldName,
                    type: ((pipeline.parameters.properties as any)[fieldName] as any)?.type || 'unknown'
                }))
            }));
            setItems(transformedItems);
        }
    }, [apiData]);


    return (
        <div>
            <h1>Available pipelines with API triggers.</h1>
            <table className={styles.pipelineTable}>
                <thead>
                    <tr className={styles.tableHeader}>
                        <th className={styles.tableHeaderCell}>Name</th>
                        <th className={styles.tableHeaderCell}>Description</th>
                        <th className={styles.tableHeaderCell}>Required Fields</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr 
                            key={item.id} 
                            onClick={() => handlePipelineClick(item)}
                            className={`${styles.tableRow} ${selectedId === item.id ? styles.selected : ''}`}
                        >
                            <td className={styles.tableCell}>{item.name}</td>
                            <td className={styles.tableCell}>{item.description || '—'}</td>
                            <td className={styles.tableCell}>
                                {item.requiredFields.length > 0 
                                    ? item.requiredFields.map(field => `${field.name} [${field.type}]`).join(', ') 
                                    : '—'
                                }
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <CreateMicroflow context={context} pipeline={selectedPipeline} apiLocation={apiLocation} />
        </div>
    );
};

export default MyList;