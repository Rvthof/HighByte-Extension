import React, { useState, useEffect } from 'react';
import styles from '../index.module.css';
import CreateMicroflow from './createmicroflow';
import { ListProps, ListItem, isPipelinesResponse } from '../types';
import { transformPipelineData, calculatePaginationValues } from '../services/pipelineTransformer';
import { getStudioPro } from '../services/studioProService';

export const MyList: React.FC<ListProps> = ({ context, apiData, apiLocation, microflowsWithRestActions, microflowPrefix }) => {
    const studioPro = getStudioPro();
    const [activeTab, setActiveTab] = useState<'available' | 'existing'>('available');
    const [items, setItems] = useState<ListItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedPipeline, setSelectedPipeline] = useState<ListItem | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [existingCurrentPage, setExistingCurrentPage] = useState(1);

    const itemsPerPage = 10;
    const pagination = calculatePaginationValues(items.length, currentPage, itemsPerPage);
    const paginatedItems = items.slice(pagination.startIndex, pagination.endIndex);

    // Transform microflowsWithRestActions to display format
    const existingCalls = microflowsWithRestActions?.map((item, index) => ({
        id: `${index}`,
        moduleName: item.moduleName,
        microflowName: item.name,
        microflowID: item.microflowID,
        pipelineName: item.pipelineName
    })) || [];

    const existingPagination = calculatePaginationValues(existingCalls.length, existingCurrentPage, itemsPerPage);
    const paginatedExistingCalls = existingCalls.slice(existingPagination.startIndex, existingPagination.endIndex);

    const handleExistingCallAction = async (microflowID: string) => {
        await studioPro.ui.editors.editDocument(microflowID);
    };

    useEffect(() => {
        if (isPipelinesResponse(apiData)) {
            const transformedItems = transformPipelineData(apiData);
            setItems(transformedItems);
        }
    }, [apiData]);

    const handlePipelineClick = (pipeline: ListItem) => {
        setSelectedId(pipeline.id);
        setSelectedPipeline(pipeline);
    };

    const renderTableList = (
        tableItems: ListItem[],
        onRowClick: (item: ListItem) => void,
        selectedItemId: string | null
    ) => (
        <table className={styles.pipelineTable}>
            <thead>
                <tr className={styles.tableHeader}>
                    <th className={styles.tableHeaderCell}>Name</th>
                    <th className={styles.tableHeaderCell}>Description</th>
                    <th className={styles.tableHeaderCell}>Required Fields</th>
                </tr>
            </thead>
            <tbody>
                {tableItems.map((item) => (
                    <tr
                        key={item.id}
                        onClick={() => onRowClick(item)}
                        className={`${styles.tableRow} ${selectedItemId === item.id ? styles.selected : ''}`}
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
    );

    const renderPaginationControls = (
        currentPageNum: number,
        paginationData: ReturnType<typeof calculatePaginationValues>,
        onPageChange: (page: number) => void,
        totalItems: number
    ) => (
        totalItems > itemsPerPage && (
            <div className={styles.pagination}>
                <button
                    onClick={() => onPageChange(currentPageNum - 1)}
                    disabled={currentPageNum === 1}
                    className={styles.pageButton}
                >
                    Previous
                </button>
                {Array.from({ length: paginationData.totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`${styles.pageButton} ${currentPageNum === pageNum ? styles.pageButtonActive : ''}`}
                    >
                        {pageNum}
                    </button>
                ))}
                <button
                    onClick={() => onPageChange(currentPageNum + 1)}
                    disabled={currentPageNum === paginationData.totalPages}
                    className={styles.pageButton}
                >
                    Next
                </button>
            </div>
        )
    );

    return (
        <div>
            <h1>Pipeline Management</h1>
            
            {/* Tab Navigation */}
            <div className={styles.tabNavigation}>
                <button
                    className={`${styles.tabButton} ${activeTab === 'available' ? styles.tabButtonActive : ''}`}
                    onClick={() => setActiveTab('available')}
                >
                    Available Pipelines
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'existing' ? styles.tabButtonActive : ''}`}
                    onClick={() => setActiveTab('existing')}
                >
                    Existing Pipeline Calls
                </button>
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
                {/* Available Pipelines Tab */}
                {activeTab === 'available' && (
                    <div>
                        <h2>Available pipelines with API triggers.</h2>
                        {renderTableList(paginatedItems, handlePipelineClick, selectedId)}
                        {renderPaginationControls(currentPage, pagination, setCurrentPage, items.length)}
                        <CreateMicroflow context={context} pipeline={selectedPipeline} apiLocation={apiLocation} microflowPrefix={microflowPrefix} />
                    </div>
                )}

                {/* Existing Pipeline Calls Tab */}
                {activeTab === 'existing' && (
                    <div>
                        <h2>Existing Pipeline Calls</h2>
                        {existingCalls.length > 0 ? (
                            <>
                                <table className={styles.pipelineTable}>
                                    <thead>
                                        <tr className={styles.tableHeader}>
                                            <th className={styles.tableHeaderCell}>Module Name</th>
                                            <th className={styles.tableHeaderCell}>Microflow Name</th>
                                            <th className={styles.tableHeaderCell}>Pipeline Name</th>
                                            <th className={styles.tableHeaderCell}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedExistingCalls.map((call) => (
                                            <tr key={call.id} className={styles.tableRow}>
                                                <td className={styles.tableCell}>{call.moduleName}</td>
                                                <td className={styles.tableCell}>{call.microflowName}</td>
                                                <td className={styles.tableCell}>{call.pipelineName}</td>
                                                <td className={styles.tableCell}>
                                                    <button 
                                                        className={styles.microflowButton}
                                                        onClick={() => handleExistingCallAction(call.microflowID)}
                                                    >
                                                        Go to microflow
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {renderPaginationControls(existingCurrentPage, existingPagination, setExistingCurrentPage, existingCalls.length)}
                            </>
                        ) : (
                            <p className={styles.emptyMessage}>No existing pipeline calls found.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyList;