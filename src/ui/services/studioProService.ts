import type { StudioProApi } from '@mendix/extensions-api';

let studioPro: StudioProApi | null = null;

export const IMPLEMENTATION_MODULE = 'HighByte-Implementation';

export function initStudioPro(sp: StudioProApi): void {
    studioPro = sp;
}

export function getStudioPro(): StudioProApi {
    if (!studioPro) {
        throw new Error('StudioPro not initialized. Call initStudioPro() first.');
    }
    return studioPro;
}

export async function getRequiredProjectModule() {
    const sp = getStudioPro();
    return (await sp.app.model.modules.getModule(IMPLEMENTATION_MODULE))
        ?? sp.app.model.modules.addModule(IMPLEMENTATION_MODULE);
}
