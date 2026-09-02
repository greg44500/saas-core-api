function getWorkspaceApiErrorMessage(error, fallbackMessage) {
  const serverMessage = error?.data?.message;

  if (typeof serverMessage === 'string' && serverMessage.trim()) {
    return serverMessage;
  }

  return fallbackMessage;
}

export { getWorkspaceApiErrorMessage };
