import {
    closeWorkspaceByPlatform,
} from '../../../workspace/workspaceClosure.service.js';

const closePlatformWorkspace = async (input) =>
    closeWorkspaceByPlatform(input);

export { closePlatformWorkspace };
