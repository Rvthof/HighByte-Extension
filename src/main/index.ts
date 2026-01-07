import { IComponent, getStudioProApi } from "@mendix/extensions-api";

export const component: IComponent = {
    async loaded(componentContext) {
        const studioPro = getStudioProApi(componentContext);
        const elementSelector = studioPro.ui.elementSelectors;
        const messageApi = studioPro.ui.messageBoxes;
        // Add a menu item to the Extensions menu
        // await studioPro.ui.extensionsMenu.add({
        //     menuId: "HighByte-Extension.MainMenu",
        //     caption: "MyExtension Menu",
        //     subMenus: [
        //         { menuId: "HighByte-Extension.ShowMenu", caption: "Show tab" },
        //     ],
        // });

        // Open a tab when the menu item is clicked
        await studioPro.ui.extensionsMenu.add({
            menuId: "myextension.MainMenu",
            caption: "HighByte Extension Menu",
            action: async () => {
                await studioPro.ui.tabs.open(
                    {
                        title: "HighByte Extension tab"
                    },
                    {
                        componentName: "extension/HighByte-Extension",
                        uiEntrypoint: "tab"
                    }
                )
            }
            // subMenus: [
            //     {
            //         menuId: "myextension.ShowMenu",
            //         caption: "Show tab",
            //         // Open a tab when the menu item is clicked
            //     }
                // ,
                // {
                //     menuId: "myextension.ReadModel",
                //     caption: "Read model",
                //     // Trigger a model read when clicked
                //     action: async () => {
                //         try {
                //             // const docs = studioPro.ui.elementSelectors.selectDocument({
                //             //     query: { sdkName: "Pages$Page" }
                //             // });
                //             const selector = await elementSelector.selectDocument({
                //                 query: { sdkName: "Constants$Constant" },
                //                 allowNone: false
                //             });

                //             if (selector.status === "ok") {
                //                 await messageApi.show("info", `document selected:\n ${JSON.stringify(selector.selected)}`);
                //             }
                //         } catch (err) {
                //             console.error("Error reading model:", err);
                //         }
                //     }
                // }
            // ],
        });
    }
}

