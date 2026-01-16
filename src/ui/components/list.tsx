import React, { useState, useEffect } from 'react';
import { getStudioProApi } from '@mendix/extensions-api';
import styles from '../index.module.css';
import CreateMicroflow from './createmicroflow';
import { ListProps, ListItem, isPipelinesResponse } from '../types';

export const MyList: React.FC<ListProps> = ({ context, apiData, apiLocation }) => {
    const studioPro = getStudioProApi(context);
    const [items, setItems] = useState<ListItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedPipeline, setSelectedPipeline] = useState<ListItem | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const itemsPerPage = 10;
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = items.slice(startIndex, endIndex);

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
                requiredFields: (pipeline.parameters.required || []).map((fieldName) => ({
                    name: fieldName,
                    type: ((pipeline.parameters.properties as any)[fieldName] as any)?.type || 'unknown',
                })),
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
                    {paginatedItems.map((item) => (
                        <tr
                            key={item.id}
                            onClick={() => handlePipelineClick(item)}
                            className={`${styles.tableRow} ${selectedId === item.id ? styles.selected : ''}`}
                        >
                            <td className={styles.tableCell}>{item.name}</td>
                            <td className={styles.tableCell}>{item.description || '—'}</td>
                            <td className={styles.tableCell}>
                                {item.requiredFields.length > 0 ? (
                                    <div className={styles.fieldsBadgeContainer}>
                                        {item.requiredFields.map((field, index) => (
                                            <span key={index} className={styles.fieldBadge}>
                                                <span className={styles.fieldName}>{field.name}</span>
                                                <span className={styles.fieldType}>{field.type}</span>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    '—'
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {items.length > itemsPerPage && (
                <div className={styles.pagination}>
                    <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={styles.pageButton}
                    >
                        Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`${styles.pageButton} ${currentPage === pageNum ? styles.pageButtonActive : ''}`}
                        >
                            {pageNum}
                        </button>
                    ))}
                    <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={styles.pageButton}
                    >
                        Next
                    </button>
                </div>
            )}
            <CreateMicroflow context={context} pipeline={selectedPipeline} apiLocation={apiLocation} />
        </div>
    );
};

export default MyList;