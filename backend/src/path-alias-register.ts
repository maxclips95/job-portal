import Module from 'module';
import path from 'path';

const moduleAny = Module as unknown as {
  _resolveFilename: (
    request: string,
    parent: NodeModule | null | undefined,
    isMain: boolean,
    options: unknown
  ) => string;
};

const originalResolve = moduleAny._resolveFilename;

moduleAny._resolveFilename = function resolveWithAlias(
  request: string,
  parent: NodeModule | null | undefined,
  isMain: boolean,
  options: unknown
): string {
  if (request.startsWith('@/')) {
    const absoluteRequest = path.join(__dirname, request.slice(2));
    return originalResolve.call(this, absoluteRequest, parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};
