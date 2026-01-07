import {
  m
} from "./chunk-FWOXYRNT.js";

// src/main/index.ts
var component = {
  async loaded(componentContext) {
    const studioPro = m(componentContext);
    const elementSelector = studioPro.ui.elementSelectors;
    const messageApi = studioPro.ui.messageBoxes;
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
        );
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
};
export {
  component
};
//# sourceMappingURL=main.js.map
