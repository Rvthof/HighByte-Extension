import React, { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { IComponent } from "@mendix/extensions-api";
import { List, HighByteLoader } from "./components/_components";
import styles from "./index.module.css";

export const component: IComponent = {
    async loaded(componentContext) {
        const AppContent = () => {
            const [apiData, setApiData] = useState<unknown>(null);

            return (
                <div className={styles.container}>
                    <h1 className={styles.title}>HighByte Extension</h1>
                    <p className={styles.description}>Hello from HighByte Extension!</p>
                    <HighByteLoader context={componentContext} label="Retrieve HighByte APIs" apiData={apiData} setApiData={setApiData} />
                    <List context={componentContext} apiData={apiData} />
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
