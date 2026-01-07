import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { IComponent } from "@mendix/extensions-api";
import { List, HighByteLoader } from "./components/_components";
import styles from "./index.module.css";

export const component: IComponent = {
    async loaded(componentContext) {
        createRoot(document.getElementById("root")!).render(
            <StrictMode>
                <div className={styles.container}>
                    <h1 className={styles.title}>HighByte Extension</h1>
                    <p className={styles.description}>Hello from HighByte Extension!</p>
                    <HighByteLoader context={componentContext} label="Retrieve HighByte APIs" />
                    <List context={componentContext} />
                </div>
            </StrictMode>
        );
    }
}
