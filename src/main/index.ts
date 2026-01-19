import { IComponent, getStudioProApi } from "@mendix/extensions-api";

export const component: IComponent = {
    async loaded(componentContext) {
        const studioPro = getStudioProApi(componentContext);
        const elementSelector = studioPro.ui.elementSelectors;
        const messageApi = studioPro.ui.messageBoxes;

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
                        uiEntrypoint: "list"
                    }
                )
            }
        });
    }
}

