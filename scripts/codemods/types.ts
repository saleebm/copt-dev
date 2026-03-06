export type CodemodContext = {
  filePath: string;
  content: string;
  extension: string;
};

export type CodemodResult = {
  content?: string;
  newFilePath?: string;
  shouldDelete?: boolean;
  modified: boolean;
  message?: string;
};

export type CodemodFunction = (
  context: CodemodContext
) => Promise<CodemodResult> | CodemodResult;

export type CodemodDefinition = {
  name: string;
  description: string;
  transform: CodemodFunction;
};
