/**
 * Microflow service - handles all microflow creation and configuration
 */

import { Microflows } from '@mendix/extensions-api';
import { getStudioPro } from './studioProService';

const getMicroflows = () => getStudioPro().app.model.microflows;

// Helper function to match template argument types
const matchTemplateArgType = (typeStr: string, fieldName: string): string => {
    const type = typeStr.toLowerCase();
    const templateMap: Record<string, string> = {
        string: `$${fieldName}`,
        integer: `toString($${fieldName})`,
        decimal: `$${fieldName}`,
        boolean: `if $${fieldName} = true then 'true' else 'false'`,
        datetime: `$${fieldName}`,
    };
    return templateMap[type] ?? `$${fieldName}`;
};

// Helper function to capitalize type
const capitalizeType = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
};

export const createSequenceFlow = async (startId: string, endId: string, exclSplitValue?: boolean,): Promise<Microflows.SequenceFlow> => {
    const microflows = getMicroflows();
    const seq = (await microflows.createElement('Microflows$SequenceFlow')) as Microflows.SequenceFlow;
    seq.origin = startId;
    seq.destination = endId;
    if (exclSplitValue !== undefined) {
        const caseValue = (await microflows.createElement('Microflows$EnumerationCase')) as Microflows.EnumerationCase;
        caseValue.value = exclSplitValue ? 'true' : 'false';
        seq.caseValues = [caseValue];
    }
    return seq;
};

export const createMessageActivity = async (errorType: Microflows.ShowMessageType, messageText: string, expArgs: string[], languageCode: string,): Promise<Microflows.ActionActivity> => {
    const microflows = getMicroflows();
    const errorActivity = (await microflows.createElement('Microflows$ActionActivity')) as Microflows.ActionActivity;
    const errorMessageActivity = (await microflows.createElement('Microflows$ShowMessageAction')) as Microflows.ShowMessageAction;
    const txtTemplate = (await microflows.createElement('Microflows$TextTemplate')) as Microflows.TextTemplate;
    const text = (await microflows.createElement('Texts$Text')) as any;
    const translation = (await microflows.createElement('Texts$Translation')) as any;

    for (const arg of expArgs) {
        const errorTemplateArg = (await microflows.createElement('Microflows$TemplateArgument')) as Microflows.TemplateArgument;
        errorTemplateArg.expression = arg;
        txtTemplate.arguments.push(errorTemplateArg);
    }

    translation.languageCode = languageCode;
    translation.text = messageText;
    text.translations.push(translation);
    txtTemplate.text = text;
    errorMessageActivity.type = errorType;
    errorMessageActivity.template = txtTemplate;
    errorActivity.action = errorMessageActivity;
    return errorActivity;
};

export const setupMicroflowParameters = async (objectCollection: any, requiredFields: Array<{ name: string; type: string }>,): Promise<Microflows.TemplateArgument[]> => {
    const microflows = getMicroflows();
    const argList: Microflows.TemplateArgument[] = [];
    for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        try {
            await objectCollection.addMicroflowParameterObject({
                name: field.name,
                type: capitalizeType(field.type) as
                    | 'Binary'
                    | 'Boolean'
                    | 'DateTime'
                    | 'Decimal'
                    | 'Float'
                    | 'Integer'
                    | 'String'
                    | 'Void',
            });
            const paramObj = objectCollection.getMicroflowParameterObject(field.name);
            paramObj.size = { width: 30, height: 30 };
            paramObj.relativeMiddlePoint = { x: 100 + i * 100, y: 0 };

            const requestArg = (await microflows.createElement('Microflows$TemplateArgument')) as Microflows.TemplateArgument;
            requestArg.expression = matchTemplateArgType(field.type, field.name);
            argList.push(requestArg);
        } catch (paramError) {
            console.warn(`Could not add parameter ${field.name}:`, paramError);
        }
    }
    return argList;
};

export const setupRestCallAction = async (requestTemplateText: string, argList: Microflows.TemplateArgument[], expression: string,): Promise<{ restCall: Microflows.RestCallAction; actionActivity: Microflows.ActionActivity; }> => {
    const microflows = getMicroflows();
    const restCall = (await microflows.createElement('Microflows$RestCallAction')) as Microflows.RestCallAction;

    // Request handling
    const requestHandler = (await microflows.createElement('Microflows$CustomRequestHandling')) as Microflows.CustomRequestHandling;
    const reqHandlingTemplate = (await microflows.createElement('Microflows$StringTemplate')) as Microflows.StringTemplate;
    reqHandlingTemplate.text = requestTemplateText;
    reqHandlingTemplate.arguments = argList;
    requestHandler.template = reqHandlingTemplate;
    restCall.requestHandling = requestHandler;

    // Response handling
    const respHandler = (await microflows.createElement('Microflows$ResultHandling')) as Microflows.ResultHandling;
    const datatype = (await microflows.createElement('DataTypes$ObjectType')) as any;
    datatype.entity = 'System.HttpResponse';
    respHandler.outputVariableName = 'RESTResponse';
    respHandler.storeInVariable = true;
    respHandler.variableType = datatype;
    restCall.resultHandling = respHandler;
    restCall.resultHandlingType = 'HttpResponse';

    // HTTP configuration
    const httpConfiguration = (await microflows.createElement('Microflows$HttpConfiguration')) as Microflows.HttpConfiguration;
    const stringTemplate = (await microflows.createElement('Microflows$StringTemplate')) as Microflows.StringTemplate;
    const templateArg = (await microflows.createElement('Microflows$TemplateArgument')) as Microflows.TemplateArgument;
    const actionActivity = (await microflows.createElement('Microflows$ActionActivity')) as Microflows.ActionActivity;
    const httpHeader = (await microflows.createElement('Microflows$HttpHeaderEntry')) as Microflows.HttpHeaderEntry;

    stringTemplate.text = '{1}';
    templateArg.expression = expression;
    stringTemplate.arguments = [templateArg];
    httpConfiguration.customLocationTemplate = stringTemplate;
    httpConfiguration.headerEntries.push(httpHeader);
    actionActivity.action = restCall;

    restCall.httpConfiguration = httpConfiguration;

    return { restCall, actionActivity };
};

export const setupExclusiveSplit = async (expression: string) => {
    const microflows = getMicroflows();
    const exclusiveSplit = (await microflows.createElement('Microflows$ExclusiveSplit')) as Microflows.ExclusiveSplit;
    const condition = (await microflows.createElement('Microflows$ExpressionSplitCondition')) as Microflows.ExpressionSplitCondition;
    condition.expression = expression;
    exclusiveSplit.splitCondition = condition;
    return exclusiveSplit;
};
