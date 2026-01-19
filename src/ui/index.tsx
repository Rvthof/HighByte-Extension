import React, { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { IComponent, getStudioProApi } from "@mendix/extensions-api";
import { List, HighByteLoader } from "./components/_components";
import { initStudioPro } from "./services/studioProService";
import styles from "./index.module.css";
import "./index.module.css";

export const component: IComponent = {
    async loaded(componentContext) {
        const studioPro = getStudioProApi(componentContext);
        // Initialize the StudioPro service before rendering any components
        initStudioPro(studioPro);
        
        const preferencesApi = studioPro.ui.preferences;
        const preferences = await preferencesApi.getPreferences();
        const isDarkMode = preferences.theme === "Dark";

        const AppContent = () => {
            const [apiData, setApiData] = useState<unknown>(null);
            const [apiLocation, setApiLocation] = useState("");
            const [microflowPrefix, setMicroflowPrefix] = useState("HB_");
            const [microflowsWithRestActions, setMicroflowsWithRestActions] = useState<Array<{ microflowID: string; id: string; name: string; moduleName: string; pipelineName: string }>>([]);

            // Inject CSS into head
            useEffect(() => {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = "./list.css";
                document.head.appendChild(link);

                return () => {
                    document.head.removeChild(link);
                };
            }, []);

            return (
                <div className={`${styles.container} ${isDarkMode ? styles.darkMode : ''}`}>
                    <h1 className={styles.title}>HighByte Extension</h1>
                    <p className={styles.description}>Seamlessly integrate HighByte pipelines with your Mendix application. This extension automatically discovers your available pipelines from the HighByte Swagger API and enables you to quickly generate microflows that interact with your data pipelines.</p>
                    <div className={styles.prefixInputWithIcon}>
                        <label htmlFor="prefix-input" className={styles.prefixInputLabel}>
                            Microflow Prefix:
                        </label>
                        <div className={styles.prefixInputWrapper}>
                            <input
                                id="prefix-input"
                                className={styles.prefixInput}
                                type="text"
                                value={microflowPrefix}
                                onChange={(e) => setMicroflowPrefix(e.target.value)}
                                placeholder="HB_"
                            />
                            <div className={styles.infoIcon}>
                                i
                                <div className={styles.tooltip}>
                                    This prefix is used to automatically name newly created microflows and identify existing microflows in your project. Only microflows starting with this prefix will be discovered.
                                </div>
                            </div>
                        </div>
                    </div>
                    <HighByteLoader context={componentContext} label="Retrieve pipelines" setApiData={setApiData} setApiLocation={setApiLocation} setMicroflowsWithRestActions={setMicroflowsWithRestActions} microflowPrefix={microflowPrefix} setMicroflowPrefix={setMicroflowPrefix} />
                    <List context={componentContext} apiData={apiData} apiLocation={apiLocation} microflowsWithRestActions={microflowsWithRestActions} microflowPrefix={microflowPrefix} />
                </div>
            );
        };

        createRoot(document.getElementById("root")!).render(
            <StrictMode>
                <AppContent />
            </StrictMode>
        );
    }
}
