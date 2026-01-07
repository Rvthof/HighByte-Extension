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
    });
  }
};
export {
  component
};
//# sourceMappingURL=main.js.map
